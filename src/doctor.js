import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const Doctor = () => {
    const [verified, setVerified] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [patients, setPatients] = useState([]);
    const [currentPatientIndex, setCurrentPatientIndex] = useState(0);
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState([]);

    const login = () => {
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        axios.post('http://localhost:5000/api/doctorLogin', { username, password })
            .then(() => {
                setVerified(true);
                socket.emit('register', username);
            })
            .catch((error) => {
                if (error.response && error.response.status === 401) {
                    alert('Invalid credentials');
                } else {
                    console.error('Login error:', error);
                    alert('An error occurred during login');
                }
            });
    };

    const assignMessage = (msg, idx) =>
        msg.from === "You" ? (
            <li key={idx} className="chat-message user">
                <strong>{msg.from}: </strong><span> </span> {' ' + msg.content}
            </li>
        ) : (
            <li key={idx} className="chat-message assistant">
                <strong>{msg.from}: </strong><span> </span> {' ' + msg.content}
            </li>
        );
    
    useEffect(() => {
        if (verified) {
            axios.get('http://localhost:5000/api/getQueue')
                .then(response => {
                    setPatients(response.data);
                    setCurrentPatientIndex(0); // reset to first patient
                    socket.emit('setDoctor', { doctor: username, patient: response.data[0] });
                })
                .catch(error => {
                    console.error('Error fetching queue:', error);
                });
        }
    }, [verified]);

    const nextPatient = () => {
        setChat([]); // clear chat for the next patient
        if (currentPatientIndex < patients.length - 1 && patients[currentPatientIndex + 1] !== username) {
            socket.emit('setDoctor', { doctor: username, patient: patients[currentPatientIndex + 1] });
            setCurrentPatientIndex(currentPatientIndex + 1);
        } else {
            setPatients([]); // clear patients if no more left
            setCurrentPatientIndex(0);

            // alert("No more patients in queue.");
        }
    };

    useEffect(() => {
        const handleMessage = (msg) => {
            setChat((prevChat) => [...prevChat, msg]);
        };

        socket.on('direct message', handleMessage);

        return () => {
            socket.off('direct message', handleMessage);
        };
    }, []);

    const sendMessage = () => {
        if (!message || !patients[currentPatientIndex]) return;
        socket.emit('direct message', { content: message, to: patients[currentPatientIndex] });
        setChat((prevChat) => [
            ...prevChat,
            { content: message, from: 'You', timestamp: new Date().toISOString() }
        ]);
        setMessage('');
    };




    if (verified) {
        const currentPatient = patients[currentPatientIndex];
        return (
            <div className="virtual-doctor" style={{ padding: 20 }}>
                <h2>Doctor Dashboard</h2>
                <div className='input-section'>
                <h3>Current Patient</h3>
                {currentPatient ? (
                    <>
                        <div>
                            <p><strong>{currentPatient}</strong></p>
                            <button onClick={nextPatient}>Next Patient</button>
                        </div>
                        <div>
                            

                            <ul id="chat-log" style={{ marginTop: 20 }}>
                                {chat.map((msg, idx) => assignMessage(msg, idx))}
                            </ul>
                            <input
                                id="chat-input-doctor"
                                placeholder="Message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={{ marginRight: 10 }}
                            />
                            <button id="submit-btn-doctor" onClick={sendMessage}>Send</button>
                        </div>
                    </>
                ) : (
                    <p>No Patients Left.</p>
                )}
                </div>
            </div>
        );
    }

    return (
        <div className="virtual-doctor" style={{ padding: 20 }}>
            <h2>Doctor Login</h2>
            <p>Welcome to the Doctor's portal. Please log in to access your dashboard.</p>
            <input
                type="text"
                placeholder="Username"
                onChange={e => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                onChange={e => setPassword(e.target.value)}
            />
            <button onClick={login}>Login</button>
        </div>
    );
};

export default Doctor;
