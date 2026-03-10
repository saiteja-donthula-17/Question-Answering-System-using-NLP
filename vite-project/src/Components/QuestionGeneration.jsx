import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './QuestionGeneration.css';

const API = 'http://127.0.0.1:5001';

const QuestionGeneration = () => {
  const [inputText, setInputText] = useState('');
  const [qaList, setQaList]       = useState([]);
  const [qList, setQList]         = useState([]);
  const [aList, setAList]         = useState([]);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [mode, setMode]           = useState(null);
  const [question, setQuestion]   = useState('');
  const [copied, setCopied]       = useState(null);
  const [dark, setDark]           = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const questionRef = useRef(null);
  const MAX_CHARS = 3000;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const hasResults = qaList.length > 0 || qList.length > 0 || aList.length > 0;
  const resultCount = qaList.length || qList.length || aList.length;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const copyText = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* ignore */ }
  };

  const reset = () => {
    setQaList([]); setQList([]); setAList([]);
    setError(''); setMode(null); setQuestion(''); setInputText('');
  };

  const clearResults = () => {
    setQaList([]); setQList([]); setAList([]);
    setError(''); setMode(null);
  };

  const apiRequest = async (endpoint, body, newMode) => {
    if (!inputText.trim()) return setError('Please enter some text first.');
    setLoading(true); setError('');
    setQaList([]); setQList([]); setAList([]);
    setMode(newMode);
    try {
      const res = await axios.post(`${API}/${endpoint}`, body);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleQnA = async () => {
    const d = await apiRequest('qnas', { text: inputText }, 'qna');
    if (d) setQaList(d);
  };
  const handleQuestions = async () => {
    const d = await apiRequest('qs', { text: inputText }, 'questions');
    if (d) setQList(d);
  };
  const handleAnswer = async () => {
    if (!question.trim()) return setError('Please type a question.');
    const d = await apiRequest('as', { text: inputText, question }, 'answers');
    if (d) setAList(d);
  };

  const openAnswerMode = () => {
    clearResults();
    setMode('answers');
    setTimeout(() => questionRef.current?.focus(), 80);
  };

  const exportTxt = () => {
    let lines = '';
    if (qaList.length) lines = qaList.map((qa, i) => `Q${i + 1}: ${qa.question}\nAnswer: ${qa.answer}`).join('\n\n');
    else if (qList.length) lines = qList.map((q, i) => `Q${i + 1}: ${q.question}`).join('\n');
    else if (aList.length) lines = `Question: ${question}\nAnswer: ${aList[0]?.answer}`;
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([lines], { type: 'text/plain' })),
      download: 'qa-results.txt',
    });
    a.click();
  };

  return (
    <div className="qg">
      {/* Top bar */}
      <nav className="topbar">
        <div className="topbar-title">Question Answering System</div>
        <button className="theme-toggle" onClick={() => setDark(!dark)} title="Toggle theme">
          {dark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      </nav>

      {/* Input section */}
      <section className="input-section">
        <div className="section-header">
          <label className="section-label">Enter your text</label>
          <span className="counter">{wordCount} words &middot; {inputText.length}/{MAX_CHARS}</span>
        </div>
        <textarea
          className="input-area"
          rows={7}
          maxLength={MAX_CHARS}
          placeholder="Paste an article, paragraph, or study notes here..."
          value={inputText}
          onChange={(e) => { setInputText(e.target.value); setError(''); }}
        />
        <div className="actions">
          <button className="btn btn-fill" onClick={handleQnA} disabled={loading}>Generate Q&amp;A</button>
          <button className="btn btn-soft" onClick={handleQuestions} disabled={loading}>Questions Only</button>
          <button className={`btn btn-outline ${mode === 'answers' ? 'active' : ''}`} onClick={openAnswerMode} disabled={loading}>Ask a Question</button>
          {(inputText || hasResults) && (
            <button className="btn btn-text" onClick={reset} disabled={loading}>Clear</button>
          )}
        </div>

        {mode === 'answers' && (
          <div className="ask-row">
            <input
              ref={questionRef}
              className="ask-input"
              type="text"
              placeholder="Type your question here..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
            />
            <button className="btn btn-fill" onClick={handleAnswer} disabled={loading || !question.trim()}>
              Get Answer
            </button>
          </div>
        )}
      </section>

      {/* Error */}
      {error && <div className="error-msg">{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="loading">
          <div className="loading-spinner" />
          <span>Processing...</span>
        </div>
      )}

      {/* Results */}
      {!loading && hasResults && (
        <section className="results-section">
          <div className="results-bar">
            <h2 className="results-heading">
              {mode === 'qna' && 'Questions & Answers'}
              {mode === 'questions' && 'Generated Questions'}
              {mode === 'answers' && 'Answer'}
              <span className="count-badge">{resultCount}</span>
            </h2>
            <button className="btn btn-text" onClick={exportTxt}>Export .txt</button>
          </div>

          <div className="results-list">
            {qaList.map((qa, i) => (
              <div className="result-item" key={i}>
                <div className="result-top">
                  <span className="result-num">Q{i + 1}</span>
                  <button className="copy-btn" onClick={() => copyText(`${qa.question}\n${qa.answer}`, `qa-${i}`)}>
                    {copied === `qa-${i}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="result-question">{qa.question}</p>
                <div className="result-answer">
                  <span className="answer-label">Answer:</span> {qa.answer}
                </div>
              </div>
            ))}

            {qList.map((q, i) => (
              <div className="result-item" key={i}>
                <div className="result-top">
                  <span className="result-num">Q{i + 1}</span>
                  <button className="copy-btn" onClick={() => copyText(q.question, `q-${i}`)}>
                    {copied === `q-${i}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="result-question">{q.question}</p>
              </div>
            ))}

            {aList.map((a, i) => (
              <div className="result-item result-item--answer" key={i}>
                <div className="result-top">
                  <span className="result-num answer-num">A</span>
                  <button className="copy-btn" onClick={() => copyText(a.answer, `a-${i}`)}>
                    {copied === `a-${i}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="result-ref">Q: {question}</p>
                <p className="result-answer-text">{a.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && !hasResults && !error && (
        <div className="empty-state">
          <p>Enter text above and choose an action to generate questions or answers.</p>
        </div>
      )}
    </div>
  );
};

export default QuestionGeneration;


