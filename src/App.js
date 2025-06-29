import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Switch, Routes, Link } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import Offers from './offers';

  const Home = ({msgs, question, handleChange, handleSubmit}) => {
    return(
      <main id="chat-container">
              <img src="https://openclipart.org/download/301829/1526352314.svg" className="App-logo" alt="logo" />

        <div className="input-section">
          <h3 id="subheadings">Doc Benjamin Chat</h3>
            {/* <p className="placeholder-response">Your response will appear here.</p> */}
            <ul id="chat-log">
            {msgs.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <p className="sender">{msg.role === 'user' ? 'You' : 'Dr. Benjamin'}:</p>
                <p className="message-text"> {msg.content}</p>
              </div>
          ))}
           </ul>
        </div>
        <div>

          <input type="text"  id="chat-input" placeholder="Ask a question..." value={question} onChange={handleChange} />
          <button id="submit-btn" onClick={handleSubmit}>Submit</button>
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
            <li><Link to="/offers">Offers</Link></li>
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
          <Route path="/offers" element={<Offers/>} />
          <Route path="*" element={<h2>404 Not Found</h2>} />
        </Routes>
      </Router>
    
    </div>
  );
}

export default App;
