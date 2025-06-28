require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const franc = require('franc');
const langs = require('langs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const users = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('register', (username) => {
    users.set(socket.id, username);
    socket.username = username;
    console.log(`User registered: ${username} with ID ${socket.id}`);
  });

  socket.on('direct message', async ({ content, to }) => {
    console.log(`Direct message from ${socket.username} to ${to}: ${content}`);

    // Language autodetection
    let langInstruction = '';
    const langCode = franc(content);
    if (langCode && langCode !== 'und') {
      const lang = langs.where('3', langCode);
      if (lang && lang.name) {
        langInstruction = `Reply in this language: ${lang.name}.`;
      }
    }

    if (to.toLowerCase() === 'gemini') {
      try {
        const geminiReply = await callGeminiAPI(content, langInstruction);
        socket.emit('direct message', {
          content: geminiReply,
          from: 'Gemini',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        socket.emit('direct message', {
          content: 'Error talking to Gemini.',
          from: 'Gemini',
        });
      }
      return;
    }

    const recipientSocketId = Array.from(users.keys()).find(id => users.get(id) === to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('direct message', {
        content,
        from: socket.username,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    users.delete(socket.id);
  });
});


async function callGeminiAPI(promptText, langInstruction = '') {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [{ text: langInstruction ? `${langInstruction}\n${promptText}` : promptText }],
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}


app.post('/api/ask', async (req, res) => {
  const { question } = req.body;
  try {
    const reply = await callGeminiAPI(question);
    res.json({ reply });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'Failed to call Gemini API' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
