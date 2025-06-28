const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {GoogleGenAI} = require('@google/genai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // match frontend
    methods: ['GET', 'POST'],
    credentials: true
  }
});
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

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
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


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`);
});