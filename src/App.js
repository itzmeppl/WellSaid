import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Switch, Routes, Link } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';

  const Home = ({msgs, question, handleChange, handleSubmit}) => {
    return(
      <main>
        <div>
          <input type="text" placeholder="Ask a question..." value={question} onChange={handleChange} />
          <button onClick={handleSubmit}>Submit</button>
          <div className="response">
            <p>Your response will appear here.</p>
          </div>
        </div>
        <div>
          <h3>Messages</h3>
          <ul>
            {msgs.map((msg, index) => (
              <li key={index}>
                <strong>{msg.role}:</strong> {msg.content}
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

function App() {
  const [msgs, setMsgs] = useState([]);
  const [question, setQuestion] = useState('');

  function handleChange(event) {
    setQuestion(event.target.value);
  }

  const handleSubmit = (event) => {
    const newMsg = { role: 'user', content: question };
    setMsgs([...msgs, newMsg]);

    axios.post('http://localhost:5000/api/ask', { question })
      .then(response => {
        const aiResponse = response.data.reply;
        const aiMsg = { role: 'assistant', content: aiResponse };
        setMsgs(prevMsgs => [...prevMsgs, newMsg, aiMsg]);
        console.log('AI Response:', aiResponse);
      })
      .catch(error => {
        console.error('Error fetching AI response:', error);
      });
    setQuestion('');
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>WellSAID</h1>
      </header>
      <Router>
        <nav>
          <ul>
            {/* <li><a href="/">Home (reloads)</a></li> */}
            <li><Link to="/">Ask Me</Link></li>
            <li><Link to="/virtual-doctor">Virtual Doctor</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<Home
          msgs={msgs}
          question={question}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          />} />
          <Route path="/virtual-doctor" element={<h2>Connect to virtual doctor</h2>} />
          <Route path="*" element={<h2>404 Not Found</h2>} />
        </Routes>
      </Router>
    
    </div>
  );
}

export default App;
