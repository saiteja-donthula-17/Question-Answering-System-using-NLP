import React, { useState } from 'react';
import axios from 'axios';

const QuestionGeneration = () => {
  const [inputText, setInputText] = useState('');
  const [qaList, setQaList] = useState([]);
  const [qList, setQList] = useState([]);
  const [aList, setAList] = useState([]);
  const [error, setError] = useState('');
  const [isQs, setIsQs] = useState(false);
  const [isAs, setIsAs] = useState(false);  // Controls visibility of the question input
  const [question, setQuestion] = useState('');

  const handleQAgenerations = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:5000/qnas', { text: inputText });
      setQaList(response.data);
      setError('');
      setIsAs(false);  // Reset the answer input when QnA generation happens
    } catch (error) {
      setError(
        error.response && error.response.data
          ? `Error: ${error.response.data.error}`
          : 'Error generating questions. Please try again.'
      );
      console.error('Error generating questions:', error);
    }
  };

  const handleQuestionGeneration = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:5000/qs', { text: inputText });
      setQList(response.data);
      setError('');
      setIsAs(false);  // Reset the answer input when question generation happens
    } catch (error) {
      setError(
        error.response && error.response.data
          ? `Error: ${error.response.data.error}`
          : 'Error generating questions. Please try again.'
      );
      console.error('Error generating questions:', error);
    }
  };

  const handleAnswerGeneration = async (question) => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/as', {
        text: inputText,
        question: question,
      });
      setAList(response.data);
      setError('');
    } catch (error) {
      setError(
        error.response && error.response.data
          ? `Error: ${error.response.data.error}`
          : 'Error generating answers. Please try again.'
      );
      console.error('Error generating answers:', error);
    }
  };

  const handleGenerateAnswers = () => {
    setIsAs(true);  // Show the input field for the question when this button is clicked
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>Automatic Question Generation</h2>
      <form>
        <textarea
          rows="6"
          style={{ width: '100%', padding: '10px' }}
          placeholder="Enter your text here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        ></textarea>
        <div className="buttons">
          <button
            type="submit"
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
            onClick={handleQAgenerations}
          >
            Generate QnA
          </button>

          <button
            type="submit"
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
            onClick={handleQuestionGeneration}
          >
            Generate Questions
          </button>

          <button
            type="button"
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
            onClick={handleGenerateAnswers}  // Show question input for answers
          >
            Generate Answers
          </button>
        </div>
      </form>

      {isAs && (
        <div>
          <input
            type="text"
            placeholder="Enter question..."
            className="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}  // Update the question state
          />
          <button
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
            }}
            onClick={() => handleAnswerGeneration(question)}  // Call function to generate answer
          >
            Submit Question
          </button>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: '20px' }}>
        {qaList.length > 0 && (
          <>
            <h3>Generated Questions and Answers</h3>
            {qaList.map((qa, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <strong>Q{index + 1}:</strong> {qa.question}
                <br />
                <strong>Answer:</strong> {qa.answer}
              </div>
            ))}
          </>
        )}

        {qList.length > 0 && (
          <>
            <h3>Generated Questions</h3>
            {qList.map((q, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <strong>Q{index + 1}:</strong> {q.question}
                <br />
              </div>
            ))}
          </>
        )}

        {aList.length > 0 && (
          <>
            <h3>Generated Answers</h3>
            {aList.map((a, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <strong>Answer:</strong> {a.answer}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default QuestionGeneration;
