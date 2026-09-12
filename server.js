const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (CSS, JS, images)
app.use(express.static(__dirname));

// Initialize Turso Cloud Database client using environment variables
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create tables automatically on startup if they don't exist
async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Connected to Turso Cloud Database & tables verified.');
  } catch (error) {
    console.error('Error initializing Turso database:', error);
  }
}
initDb();

// Serve frontend UI (index.html) at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Meklit API is running with Turso Database' });
});

// API Endpoint: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM users');
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint: Create a user
app.post('/api/users', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = await db.execute({
      sql: 'INSERT INTO users (name) VALUES (?)',
      args: [name]
    });
    res.json({ id: Number(result.lastInsertRowid), name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint: Get all records
app.get('/api/records', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM records');
    res.json({ records: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint: Create a record
app.post('/api/records', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await db.execute({
      sql: 'INSERT INTO records (title) VALUES (?)',
      args: [title]
    });
    res.json({ id: Number(result.lastInsertRowid), title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
