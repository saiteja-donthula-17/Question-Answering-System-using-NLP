from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, BertForQuestionAnswering, BertTokenizer
from torch import tensor, argmax

app = Flask(__name__)

# Enable CORS only for the frontend origin (localhost:5173)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173"]}})

# Load models and tokenizers with handling for SentencePiece tokenizer if needed
def load_models():
    try:
        # Using a proper question generation model from HuggingFace
        tokenizer_q = AutoTokenizer.from_pretrained("valhalla/t5-small-qg-hl", use_fast=False)
        model_q = AutoModelForSeq2SeqLM.from_pretrained("valhalla/t5-small-qg-hl")
        tokenizer_a = BertTokenizer.from_pretrained('bert-large-uncased-whole-word-masking-finetuned-squad')
        model_a = BertForQuestionAnswering.from_pretrained('bert-large-uncased-whole-word-masking-finetuned-squad')
    except Exception as e:
        print(f"Error loading models: {e}")
        return None, None, None, None
    return tokenizer_q, model_q, tokenizer_a, model_a

# Load models
tokenizer_q, model_q, tokenizer_a, model_a = load_models()
if not tokenizer_q or not model_q or not tokenizer_a or not model_a:
    raise Exception("Failed to load models and tokenizers")

# Function to generate questions
def get_questions(context, max_length=64):
    qns = []
    sentences = context.split('.')
    for sentence in sentences[:-1]:
        input_text = f"answer: context: {sentence} </s>"
        features = tokenizer_q([input_text], return_tensors='pt')
        output = model_q.generate(input_ids=features['input_ids'],
                                  attention_mask=features['attention_mask'],
                                  max_length=max_length)
        qns.append(tokenizer_q.decode(output[0], skip_special_tokens=True).replace('question:', '').strip())
    return qns

# Function to answer a question
def answer_question(question, context):
    # Encoding the question and context
    inputs = tokenizer_a.encode(question, context)
    sep_index = inputs.index(tokenizer_a.sep_token_id)
    num_seg_a = sep_index + 1
    num_seg_b = len(inputs) - num_seg_a
    segment_ids = [0] * num_seg_a + [1] * num_seg_b

    # Running the BERT model
    outputs = model_a(tensor([inputs]), token_type_ids=tensor([segment_ids]), return_dict=True)
    start_scores = outputs.start_logits
    end_scores = outputs.end_logits

    # Get the start and end positions of the answer
    answer_start = argmax(start_scores)
    answer_end = argmax(end_scores)

    # Convert input tokens to words for answer extraction
    tokens = tokenizer_a.convert_ids_to_tokens(inputs)
    answer = tokens[answer_start]
    for i in range(answer_start + 1, answer_end + 1):
        if tokens[i][:2] == '##':
            answer += tokens[i][2:]
        else:
            answer += ' ' + tokens[i]
    return answer

# API to generate questions and answers
@app.route('/qnas', methods=['POST'])
def generate_qa():
    data = request.get_json()

    context = data.get('text')
    if not context:
        return jsonify({"error": "No context provided"}), 400

    try:
        questions = list(set(get_questions(context)))
        qa_pairs = [{"question": q, "answer": answer_question(q, context)} for q in questions]
    except Exception as e:
        return jsonify({"error": f"Error generating Q&A: {str(e)}"}), 500

    return jsonify(qa_pairs), 200

# API to generate questions
@app.route('/qs', methods=['POST'])
def generate_qs():
    data = request.get_json()

    context = data.get('text')
    if not context:
        return jsonify({"error": "No context provided"}), 400

    try:
        questions = list(set(get_questions(context)))
        qs = [{"question": q} for q in questions]
    except Exception as e:
        return jsonify({"error": f"Error generating questions: {str(e)}"}), 500

    return jsonify(qs), 200

# API to generate answers for a specific question
@app.route('/as', methods=['POST'])
def generate_a():
    data = request.get_json()

    context = data.get('text')
    getQuestion = data.get('question')
    if not context or not getQuestion:
        return jsonify({"error": "No context or question provided"}), 400

    try:
        answer = answer_question(getQuestion, context)
        a = [{"answer": answer}]
    except Exception as e:
        return jsonify({"error": f"Error generating answer: {str(e)}"}), 500

    return jsonify(a), 200

if __name__ == '__main__':
    app.run(debug=True)