require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const franc = import('franc').then(mod => mod.default);
const langs = require('langs');
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const users = new Map();

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
        console.log("que: ")
        console.log("Queue:", Array.from(users.values()));
    } catch (error) {  
        console.error("Error fetching queue:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

async function callGeminiAPI(promptText, langInstruction = '') {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const lang = promptText.split()[0];
  
  const body = {
    contents: [
      {
        parts: [{ text: langInstruction ? `${langInstruction}\n${promptText}` : "Using the following knowledge base: \"David Lee\",\"Adelaide Health Clinic\",\"chiropractic\",\"English\",\"First Canadian Place, 1, Toronto, ON M5K 1C8\",\"UHIP\" \
\"Sylvain A. Rene\",\"Davisville Medical Clinic\",\"general\",\"English, French\",\"1901 Yonge Street, Unit 4, Toronto, ON, M4S 1Y6\",\"Annual Fee\" \
\"Jessica Chen\",\"Mandarin Clinic\",\"general, dentistry\",\"English, Mandarin, Cantonese\",\"1 Main Street, Unit 11, Toronto, M1M 1M1\",\"Canadian Dental Care\" \
\"Alisa Naiman\",\"Forest Hill Family Health Clinic\",\"family medicine\",\"English, Russian\",\"491 Eglinton Ave West, Second Floor, Toronto, Ontario M5N 1A8\",\"Annual Fee\" \
\"Raj Dayanathan\",\"Urban Health Clinic\",\"optometry\",\"English, Tamil\",\"5 Stair Street, Unit 55, Markham, Ontario, L5M 2J9\",\"Vision Care\" \
\"Mandy Zhou\",\"Dundas General Clinic\",\"general\",\"English, Cantonese\",\"88 New Street, North York, Ontario, M2N L8L\",\"UHIP\" \
\"Avery Shen\",\"Brimley Family Clinic\",\"general\",\"English, French\",\"3333 Brimley Rd #2, Scarborough, ON M1V 2J7\",\"Senior Health Care\" \
\"Raymond Fung\",\"Michael Garron Hospital\",\"general, endocrinology\",\"English, Mandarin\",\"825 Coxwell Ave, East York, ON M4C 3E7\",\"IFHP\" \
\"Gustave Fring\",\"Scarborough General Hospital\",\"general, mental health\",\"English, French, Spanish\",\"3050 Lawrence Ave E, Scarborough, ON M1P 2V5\",\"Immigrants Health\" \
\"Aria Cappuri\",\"Toronto General Hospital\",\"general, family medicine, endocrinology\",\"English, Italian\",\"200 Elizabeth St, Toronto, ON M5G 2C4\",\"UHIP\", provide me a list \
of medical clinics, professionals, and advice about benefits and plans. Use it to answer the following question: " + promptText + '. Ensure the answer prioritizes medical professionals that know the same language of the prompt and is in the original language of input. Do not repeat the user prompt if it\'s not necessary! NO YAPPING!'}],
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
