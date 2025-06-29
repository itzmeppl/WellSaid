// VirtualDoctorWithChat.js
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:5000'); // assumes same origin server

const VirtualDoctor = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState([]);

    useEffect(() => {
    const handleMessage = (msg) => {
        setChat((prevChat) => [...prevChat, msg]);
    };

    const handleSetDoctor = ({ doctor }) => {
        console.log(`Doctor set: ${doctor}`);
        setRecipient(doctor); // set who to send messages to
    };

    socket.on('direct message', handleMessage);
    socket.on('setDoctor', handleSetDoctor);

    return () => {
        socket.off('direct message', handleMessage);
        socket.off('setDoctor', handleSetDoctor);
    };
}, []);

    const sendMessage = () => {
        if (!message || !recipient) return;
        socket.emit('direct message', { content: message, to: recipient });
        setChat((prevChat) => [
            ...prevChat,
            { content: message, from: 'You', timestamp: new Date().toISOString() }
        ]);
        setMessage('');
    };

    const registerUsername = () => {
        if (!username) return;
        socket.emit('register', username);
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Virtual Doctor</h2>
            <button onClick={() => navigate('/doctor')}>Doctor Login</button>
            <p>Connect to a virtual doctor for health-related queries.</p>
            <p>Ask your health-related questions and get answers from a virtual doctor.</p>
            <div>username: {username}</div>
            <div style={{ marginTop: 30 }}>
                <h3>Real-Time Chat</h3>
                <input
                    id="username"
                    placeholder="Your username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    style={{ marginRight: 10 }}
                />

                <button onClick={() => socket.emit('register', username)} style={{ marginRight: 10 }}>
                    Register
                </button>
                {/* <input
                    placeholder="Recipient (e.g., Gemini)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    style={{ marginRight: 10 }}
                /> */}
                <input
                    placeholder="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ marginRight: 10 }}
                />
                <button onClick={sendMessage}>Send</button>

                <ul style={{ marginTop: 20 }}>
                    {chat.map((msg, idx) => (
                        <li key={idx}>
                            <strong>{msg.from}:</strong> {msg.content}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        
    );
};

export default VirtualDoctor;
