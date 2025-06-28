require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const franc = import('franc').then(mod => mod.default);
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

app.get('/api/getOffers', async (req, res) => {
  try {
    const db = await require('./db').connectDB();
    const offers = await db.collection('offers').find({}).toArray();  
    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

async function callGeminiAPI(promptText, langInstruction = '') {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const lang = promptText.split()[0];
  
  const body = {
    contents: [
      {
        parts: [{ text: langInstruction ? `${langInstruction}\n${promptText}` : "Using the knowledge base: \"David Lee\",\"Adelaide Health Clinic\",\"chiropractic\",\"English\",\"First Canadian Place, 1, Toronto, ON M5K 1C8\",\"UHIP\" \
\"Sylvain A. Rene\",\"Davisville Medical Clinic\",\"general\",\"English, French\",\"1901 Yonge Street, Unit 4, Toronto, ON, M4S 1Y6\",\"Annual Fee\" \
\"Jessica Chen\",\"Mandarin Clinic\",\"general, dentistry\",\"English, Mandarin, Cantonese\",\"1 Main Street, Unit 11, Toronto, M1M 1M1\",\"Canadian Dental Care\" \
\"Alisa Naiman\",\"Forest Hill Family Health Clinic\",\"family medicine\",\"English, Russian\",\"491 Eglinton Ave West, Second Floor, Toronto, Ontario M5N 1A8\",\"Annual Fee\" \
\"Raj Dayanathan\",\"Urban Health Clinic\",\"optometry\",\"English, Tamil\",\"5 Stair Street, Unit 55, Markham, Ontario, L5M 2J9\",\"Vision Care\" \
\"Mandy Zhou\",\"Dundas General Clinic\",\"general\",\"English, Cantonese\",\"88 New Street, North York, Ontario, M2N L8L\",\"UHIP\" \
\"Avery Shen\",\"Brimley Family Clinic\",\"general\",\"English, French\",\"3333 Brimley Rd #2, Scarborough, ON M1V 2J7\",\"Senior Health Care\" \
\"Raymond Fung\",\"Michael Garron Hospital\",\"general, endocrinology\",\"English, Mandarin\",\"825 Coxwell Ave, East York, ON M4C 3E7\",\"IFHP\" \
\"Gustave Fring\",\"Scarborough General Hospital\",\"general, mental health\",\"English, French, Spanish\",\"3050 Lawrence Ave E, Scarborough, ON M1P 2V5\",\"Immigrants Health\" \
\"Aria Cappuri\",\"Toronto General Hospital\",\"general, family medicine, endocrinology\",\"English, Italian\",\"200 Elizabeth St, Toronto, ON M5G 2C4\",\"UHIP\", provide me a list \
of medical clinics and professionals of the same language category as the word: " + lang + " and advice about benefits and plans. Use it to answer the question: " + promptText + ' and translate to the original language of input. No Yapping!'}],
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