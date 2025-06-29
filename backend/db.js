
// This file is responsible for connecting to the MongoDB database.
// It exports a function to connect to the database and the client instance.
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');
dotenv.config();
const uri = process.env.MONGODB_URI;
let db;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectDB() {
  try {
    if (!db) {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      db = client.db("db");
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
  return db;
}

module.exports = { connectDB, client };