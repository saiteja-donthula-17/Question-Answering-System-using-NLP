import React, { useState, useRef } from 'react';
import axios from 'axios';
import './QuestionGeneration.css';

const API = 'http://127.0.0.1:5001';

const Spinner = () => (
  <div className="spinner-wrap">
    <div className="spinner" />
    <p className="spinner-text">AI models are processing your text…</p>
  </div>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const QuestionGeneration = () => {
  const [inputText, setInputText]   = useState('');
  const [qaList,    setQaList]      = useState([]);
  const [qList,     setQList]       = useState([]);
  const [aList,     setAList]       = useState([]);
  const [error,     setError]       = useState('');
  const [loading,   setLoading]     = useState(false);
  const [mode,      setMode]        = useState(null);   // 'qna' | 'questions' | 'answers'
  const [question,  setQuestion]    = useState('');
  const [copied,    setCopied]      = useState(null);
  const [toast,     setToast]       = useState('');

  const questionRef = useRef(null);
  const MAX_CHARS   = 3000;
  const wordCount   = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const hasResults  = qaList.length > 0 || qList.length > 0 || aList.length > 0;
  const resultCount = qaList.length || qList.length || aList.length;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const copyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      showToast('Copied!');
    } catch {
      showToast('Copy failed');
    }
  };

  const reset = () => {
    setQaList([]); setQList([]); setAList([]);
    setError(''); setMode(null); setQuestion(''); setInputText('');
  };

  const clearResults = () => {
    setQaList([]); setQList([]); setAList([]);
    setError(''); setMode(null);
  };

  const request = async (endpoint, body, newMode) => {
    if (!inputText.trim()) return setError('Please enter some text first.');
    setLoading(true); setError('');
    setQaList([]); setQList([]); setAList([]);
    setMode(newMode);
    try {
      const res = await axios.post(`${API}/${endpoint}`, body);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || `Error generating ${newMode}. Please try again.`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleQnA       = async () => { const d = await request('qnas', { text: inputText }, 'qna');       if (d) setQaList(d); };
  const handleQuestions = async () => { const d = await request('qs',   { text: inputText }, 'questions'); if (d) setQList(d);  };
  const handleAnswer    = async () => {
    if (!question.trim()) return setError('Please type a question.');
    const d = await request('as', { text: inputText, question }, 'answers');
    if (d) setAList(d);
  };

  const openAnswerMode = () => {
    clearResults();
    setMode('answers');
    setTimeout(() => questionRef.current?.focus(), 80);
  };

  const exportTxt = () => {
    let lines = '';
    if (qaList.length)   lines = qaList.map((qa,i) => `Q${i+1}: ${qa.question}\nAnswer: ${qa.answer}`).join('\n\n');
    else if (qList.length)  lines = qList.map((q,i)  => `Q${i+1}: ${q.question}`).join('\n');
    else if (aList.length)  lines = `Question: ${question}\nAnswer: ${aList[0]?.answer}`;
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([lines], { type: 'text/plain' })),
      download: 'qa-results.txt',
    });
    a.click();
    showToast('Exported!');
  };

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}

      {/* ── Header ── */}
      <header className="header">
        <span className="header-icon">🧠</span>
        <h1>AI Question Generator</h1>
        <p>Transform any text into questions &amp; answers using NLP</p>
      </header>

      {/* ── Input card ── */}
      <section className="card input-card">
        <div className="row-between mb-10">
          <span className="label">Input Text</span>
          <span className={`char-counter ${inputText.length > MAX_CHARS * 0.9 ? 'warn' : ''}`}>
            {wordCount} words · {inputText.length}/{MAX_CHARS}
          </span>
        </div>

        <textarea
          className="textarea"
          rows={8}
          maxLength={MAX_CHARS}
          placeholder="Paste an article, paragraph, or study notes here…"
          value={inputText}
          onChange={(e) => { setInputText(e.target.value); setError(''); }}
        />

        <div className="btn-row">
          <button className="btn btn-primary" onClick={handleQnA} disabled={loading}>
            <span>⚡</span> Generate Q&amp;A
          </button>
          <button className="btn btn-secondary" onClick={handleQuestions} disabled={loading}>
            <span>❓</span> Questions Only
          </button>
          <button className={`btn btn-outline ${mode === 'answers' ? 'active' : ''}`} onClick={openAnswerMode} disabled={loading}>
            <span>💬</span> Answer a Question
          </button>
          {(inputText || hasResults) && (
            <button className="btn btn-ghost" onClick={reset} disabled={loading}>✕ Clear</button>
          )}
        </div>

        {/* Answer mode input */}
        {mode === 'answers' && (
          <div className="answer-row">
            <input
              ref={questionRef}
              className="question-input"
              type="text"
              placeholder="Type your question and press Enter…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
            />
            <button className="btn btn-primary" onClick={handleAnswer} disabled={loading || !question.trim()}>
              Get Answer
            </button>
          </div>
        )}
      </section>

      {/* ── Error ── */}
      {error && (
        <div className="error-bar">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Spinner ── */}
      {loading && <Spinner />}

      {/* ── Results ── */}
      {!loading && hasResults && (
        <section className="results">
          <div className="results-header">
            <div className="results-title">
              <span className="badge">{resultCount}</span>
              {mode === 'qna'       && 'Questions & Answers'}
              {mode === 'questions' && 'Generated Questions'}
              {mode === 'answers'   && 'Answer'}
            </div>
            <button className="btn-export" onClick={exportTxt}>↓ Export</button>
          </div>

          <div className="cards-grid">
            {/* QnA cards */}
            {qaList.map((qa, i) => (
              <div className="result-card" key={i} style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="card-top">
                  <span className="card-tag">Q{i + 1}</span>
                  <button className="copy-btn" onClick={() => copyText(`${qa.question}\nAnswer: ${qa.answer}`, `qa-${i}`)}>
                    {copied === `qa-${i}` ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
                <p className="card-q">{qa.question}</p>
                <div className="card-a">
                  <span className="a-label">Answer</span>
                  <span className="a-text">{qa.answer}</span>
                </div>
              </div>
            ))}

            {/* Question-only cards */}
            {qList.map((q, i) => (
              <div className="result-card result-card--q" key={i} style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="card-top">
                  <span className="card-tag">Q{i + 1}</span>
                  <button className="copy-btn" onClick={() => copyText(q.question, `q-${i}`)}>
                    {copied === `q-${i}` ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
                <p className="card-q">{q.question}</p>
              </div>
            ))}

            {/* Answer card */}
            {aList.map((a, i) => (
              <div className="result-card result-card--a" key={i}>
                <div className="card-top">
                  <span className="card-tag card-tag--a">Answer</span>
                  <button className="copy-btn" onClick={() => copyText(a.answer, `a-${i}`)}>
                    {copied === `a-${i}` ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
                <p className="q-ref"><span>Question:</span> {question}</p>
                <p className="a-big">{a.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {!loading && !hasResults && !error && (
        <div className="empty">
          <span className="empty-icon">📄</span>
          <p>Paste any text above and click a button to get started</p>
          <div className="tags">
            {['📚 Study Material', '📰 Articles', '📖 Textbooks', '📝 Notes'].map(t => (
              <span className="tag" key={t}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionGeneration;

