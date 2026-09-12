const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware for parsing JSON body data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (index.html, CSS, client JS)
app.use(express.static(__dirname));

// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Create tables automatically if they do not exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Serve frontend at root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'MeklitApp Backend Server is running successfully!' });
});

// API Routes: Users
app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ users: rows });
    });
});

app.post('/api/users', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    db.run('INSERT INTO users (name) VALUES (?)', [name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

// API Routes: Records
app.get('/api/records', (req, res) => {
    db.all('SELECT * FROM records', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ records: rows });
    });
});

app.post('/api/records', (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    db.run('INSERT INTO records (title) VALUES (?)', [title], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
