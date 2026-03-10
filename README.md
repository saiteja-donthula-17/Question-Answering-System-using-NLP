# Question Answering System using NLP

An AI-powered web application that automatically generates questions and answers from any given text using Natural Language Processing (NLP) models.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)
![Transformers](https://img.shields.io/badge/HuggingFace-Transformers-yellow?logo=huggingface)

---

## Features

- **Generate Q&A** — Automatically generates questions and their answers from input text
- **Generate Questions Only** — Extracts meaningful questions from any paragraph
- **Answer a Question** — Ask a custom question about the provided context and get an AI-extracted answer
- **Export Results** — Download generated Q&A as a `.txt` file
- **Copy to Clipboard** — One-click copy for any question or answer
- **Real-time Validation** — Word count, character limit, and input validation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Axios |
| **Backend** | Flask, Flask-CORS |
| **Question Generation** | T5 (valhalla/t5-small-qg-hl) |
| **Answer Extraction** | BERT (bert-large-uncased-whole-word-masking-finetuned-squad) |
| **ML Framework** | PyTorch, HuggingFace Transformers |

## Project Structure

```
Question-Answering-System-using-NLP/
├── backend/
│   ├── app.py                 # Flask API server with NLP models
│   └── requirements.txt       # Python dependencies
├── vite-project/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── Components/
│   │       ├── QuestionGeneration.jsx   # Main UI component
│   │       └── QuestionGeneration.css   # Component styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## How It Works

1. **User inputs text** (article, study notes, paragraph, etc.)
2. **Question Generation (T5 model):**
   - Splits text into sentences
   - Highlights key answer candidates in each sentence
   - Generates questions using beam search (`num_beams=4`)
   - Filters out low-quality/duplicate questions
3. **Answer Extraction (BERT model):**
   - Encodes question + context with proper segment IDs
   - Predicts start/end positions of the answer span
   - Masks non-context tokens to avoid `[CLS]`/`[SEP]` in answers
4. **Results displayed** in a clean card-based UI with copy/export options

## API Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `GET` | `/health` | Health check | — |
| `POST` | `/qnas` | Generate questions & answers | `{ "text": "..." }` |
| `POST` | `/qs` | Generate questions only | `{ "text": "..." }` |
| `POST` | `/as` | Answer a specific question | `{ "text": "...", "question": "..." }` |

## Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

> Backend runs on **http://localhost:5001**
> First run downloads models (~1.5 GB) from HuggingFace — this only happens once.

### Frontend Setup

```bash
cd vite-project
npm install
npm run dev
```

> Frontend runs on **http://localhost:5173**

### Open the App

Navigate to **http://localhost:5173** in your browser.

## Screenshots

| Feature | Description |
|---------|-------------|
| Input text and select a mode | Paste any text and click Generate Q&A, Questions Only, or Answer a Question |
| Generated Q&A cards | Questions and answers displayed in styled cards with copy buttons |
| Export | Download all results as a text file |

## Models Used

- **[valhalla/t5-small-qg-hl](https://huggingface.co/valhalla/t5-small-qg-hl)** — T5 model fine-tuned for question generation with answer-highlight input format
- **[bert-large-uncased-whole-word-masking-finetuned-squad](https://huggingface.co/bert-large-uncased-whole-word-masking-finetuned-squad)** — BERT model fine-tuned on SQuAD for extractive question answering

## Contributors

- **Sai Teja Donthula** — [saiteja-donthula-17](https://github.com/saiteja-donthula-17)
- **Srinivas** — [srinivas813](https://github.com/srinivas813)

## License

This project is for educational purposes.

