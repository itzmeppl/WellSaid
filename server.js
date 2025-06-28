const { Server } = require('socket.io');
require('dotenv').config();
const express = require('express');
const http = require('http');

const {GoogleGenerativeAI} = require('@google/generative-ai');


const app = express();
const server = http.createServer(app);
const io = new Server(server);
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
        const model = ai.getGenerativeModel({
            model: 'gemini-1.5-flash',
        });

        const result = await model.generateContent(content);      
        const response = result.response;
        console.log('Gemini API response:', response.text());
        return response.text();
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`);
});
