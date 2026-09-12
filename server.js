const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize SQLite database connection
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Setup database tables automatically
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'MeklitApp Backend Server is running successfully!',
    endpoints: {
      health: 'GET /health',
      getUsers: 'GET /api/users',
      createUser: 'POST /api/users',
      getRecords: 'GET /api/records',
      createRecord: 'POST /api/records'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', database: 'connected' });
});

// GET /api/users
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/users
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Name field is required' });

  db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, email });
  });
});

// GET /api/records
app.get('/api/records', (req, res) => {
  db.all('SELECT * FROM records', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/records
app.post('/api/records', (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Title field is required' });

  db.run('INSERT INTO records (title, description) VALUES (?, ?)', [title, description || ''], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, title, description });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
