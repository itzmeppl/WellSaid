const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {GoogleGenAI} = require('@google/genai');
require('dotenv').config();
const { Db } = require('mongodb');
const { client, connectDB } = require('./db');
const {usestate, useEffect} = require('react');


const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // match frontend
    methods: ['GET', 'POST'],
    credentials: true
  }
});
let db = connectDB();

const ai = new GoogleGenAI({});

const users = new Map();

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('register', (username) => {
        users.set(socket.id, username);
        socket.username = username;
        console.log(`User registered: ${username} with ID ${socket.id}`);
    });

    socket.on('direct message', async ({content, to}) => {
        console.log(`Direct message from ${socket.username} to ${to}: ${content}`);
        
        if (to.toLowerCase() === 'gemini'){
            const reply = await callGeminiAPI(content);
            socket.emit('direct message', 
                { content: reply, from: 'Gemini', 
                    timestamp: new Date().toISOString()});
        
            return;
        }         

        const recipientSocketId = Array.from(users.keys()).find(id => users.get(id) === to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('direct message', {
                content,
                from: socket.username,
                timestamp: new Date().toISOString()
            });
            console.log(`Message sent to ${to}: ${content}`);
        }
    });

    socket.on('setDoctor', ({doctor, patient}) => {
        const recipientSocketId = Array.from(users.keys()).find(id => users.get(id) === patient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('setDoctor', {
                doctor,
                from: socket.username,
                timestamp: new Date().toISOString()
            });
            console.log(`Doctor set for patient ${patient}: ${doctor}`);
        }
    })

    socket.on('disconnect', () => {
        console.log(`Uoffeser disconnected: ${socket.id}`);
        users.delete(socket.id);
    });
});

async function callGeminiAPI(content) {
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' }); // or 2.0 if supported
    const result = await model.generateContent([
      { role: 'user', parts: [{ text: content }] }
    ]);

    const response = await result.response;
    const text = await response.text();

    return text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return "Sorry, there was a problem getting a response from Gemini.";
  }
}

app.get('/getOffers', async (req, res) => {
    try {
        const offers = await db.collection('offers');
        res.status(200).json(offers);
    } catch (error) {
        console.error("Error fetching offers:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/doctorLogin', async (req, res) => {
    console.log("here");
    const { username, password } = req.body;
    console.log('->', username, password);
    console.log(process.env.DOCTORUSERNAME, process.env.DOCTORPASSWORD);
    try {
        if (username === process.env.DOCTORUSERNAME && password === process.env.DOCTORPASSWORD) {
            res.status(200).json({ message: 'Login successful' });
            console.log("Doctor login successful");
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
            console.log("Doctor login failed: Invalid credentials");
        }
    } catch (error) {
        console.error("Error during doctor login:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/getQueue', async (req, res) => {
    try {
        res.json(Array.from(users.values()));
        console.log(Array.from(users.values()));
    } catch (error) {  
        console.error("Error fetching queue:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`);
});