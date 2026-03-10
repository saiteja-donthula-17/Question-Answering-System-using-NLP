from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, BertForQuestionAnswering, BertTokenizer
import torch
import re

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

MAX_BERT_TOKENS = 512


def load_models():
    try:
        tokenizer_q = AutoTokenizer.from_pretrained("valhalla/t5-small-qg-hl", use_fast=False)
        model_q = AutoModelForSeq2SeqLM.from_pretrained("valhalla/t5-small-qg-hl")
        tokenizer_a = BertTokenizer.from_pretrained('bert-large-uncased-whole-word-masking-finetuned-squad')
        model_a = BertForQuestionAnswering.from_pretrained('bert-large-uncased-whole-word-masking-finetuned-squad')
        return tokenizer_q, model_q, tokenizer_a, model_a
    except Exception as e:
        print(f"Error loading models: {e}")
        return None, None, None, None


tokenizer_q, model_q, tokenizer_a, model_a = load_models()
if not all([tokenizer_q, model_q, tokenizer_a, model_a]):
    raise Exception("Failed to load models and tokenizers")


def extract_answer_candidate(sentence):
    """Pick the most informative phrase in a sentence to act as the highlighted answer."""
    words = sentence.strip().split()
    if not words:
        return sentence
    # Prefer a 4-digit year
    for w in words:
        if re.match(r'^\d{4}$', w):
            return w
    # Prefer an interior capitalised word (likely a proper noun)
    for w in words[1:]:
        clean = re.sub(r'[^a-zA-Z]', '', w)
        if clean and clean[0].isupper() and len(clean) > 2:
            return clean
    # Fall back to the middle two-word phrase
    mid = len(words) // 2
    return ' '.join(words[max(0, mid - 1):mid + 2])


def is_valid_question(q):
    q = q.strip()
    if len(q) < 10:
        return False
    bad = [
        r'^what is the answer',
        r'^\?',
        r'^[^a-zA-WYZa-wyz]',   # starts with non-alpha except X/x (for "X is…" sentences)
    ]
    for p in bad:
        if re.match(p, q, re.IGNORECASE):
            return False
    return True


def get_questions(context, max_length=64):
    # Split on sentence-ending punctuation followed by whitespace
    sentences = re.split(r'(?<=[.!?])\s+', context.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

    results = []
    seen = set()

    for sentence in sentences:
        answer_cand = extract_answer_candidate(sentence)
        # Highlight the answer span for the model
        highlighted = sentence.replace(answer_cand, f"<hl> {answer_cand} <hl>", 1)
        input_text = f"generate question: {highlighted} </s>"

        features = tokenizer_q([input_text], return_tensors='pt')
        with torch.no_grad():
            output = model_q.generate(
                input_ids=features['input_ids'],
                attention_mask=features['attention_mask'],
                max_length=max_length,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=2,
            )

        q = tokenizer_q.decode(output[0], skip_special_tokens=True)
        q = re.sub(r'^question:\s*', '', q, flags=re.IGNORECASE).strip()
        if not q.endswith('?'):
            q += '?'
        q = q[0].upper() + q[1:]

        if is_valid_question(q) and q.lower() not in seen:
            seen.add(q.lower())
            results.append(q)

    return results


def answer_question(question, context):
    """Extract an answer span from context using BERT QA."""
    encoding = tokenizer_a.encode_plus(
        question,
        context,
        max_length=MAX_BERT_TOKENS,
        truncation=True,
        return_tensors='pt',
        return_token_type_ids=True,
    )

    input_ids = encoding['input_ids']
    token_type_ids = encoding['token_type_ids']

    with torch.no_grad():
        outputs = model_a(
            input_ids=input_ids,
            token_type_ids=token_type_ids,
            return_dict=True,
        )

    start_logits = outputs.start_logits[0]
    end_logits = outputs.end_logits[0]

    # Find the [SEP] positions to isolate the context segment
    ids = input_ids[0].tolist()
    sep_positions = [i for i, t in enumerate(ids) if t == tokenizer_a.sep_token_id]
    context_start = sep_positions[0] + 1 if sep_positions else 0
    context_end = sep_positions[1] if len(sep_positions) >= 2 else len(ids) - 1

    # Mask logits outside the context
    mask = torch.full((len(ids),), -1e9)
    mask[context_start:context_end] = 0
    start_logits = start_logits + mask
    end_logits = end_logits + mask

    answer_start = int(torch.argmax(start_logits))
    # End must be >= start
    end_logits[:answer_start] = -1e9
    answer_end = int(torch.argmax(end_logits))

    # Decode using the tokenizer for clean WordPiece output
    answer = tokenizer_a.decode(
        input_ids[0][answer_start: answer_end + 1].tolist(),
        skip_special_tokens=True,
    ).strip()

    return answer if answer else "Could not find a clear answer in the provided context."


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "models_loaded": True}), 200


@app.route('/qnas', methods=['POST'])
def generate_qa():
    data = request.get_json()
    context = (data.get('text') or '').strip()
    if not context:
        return jsonify({"error": "No context provided"}), 400
    try:
        questions = get_questions(context)
        qa_pairs = [{"question": q, "answer": answer_question(q, context)} for q in questions]
        return jsonify(qa_pairs), 200
    except Exception as e:
        return jsonify({"error": f"Error generating Q&A: {str(e)}"}), 500


@app.route('/qs', methods=['POST'])
def generate_qs():
    data = request.get_json()
    context = (data.get('text') or '').strip()
    if not context:
        return jsonify({"error": "No context provided"}), 400
    try:
        questions = get_questions(context)
        return jsonify([{"question": q} for q in questions]), 200
    except Exception as e:
        return jsonify({"error": f"Error generating questions: {str(e)}"}), 500


@app.route('/as', methods=['POST'])
def generate_a():
    data = request.get_json()
    context = (data.get('text') or '').strip()
    question = (data.get('question') or '').strip()
    if not context or not question:
        return jsonify({"error": "Both context and question are required"}), 400
    try:
        answer = answer_question(question, context)
        return jsonify([{"answer": answer}]), 200
    except Exception as e:
        return jsonify({"error": f"Error generating answer: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5001)