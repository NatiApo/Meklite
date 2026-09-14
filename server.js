const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// PostgreSQL Pool connection with family: 4 to force IPv4 connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});

// Root check route
app.get('/', (req, res) => {
  res.json({ status: 'online', app: 'Meklite API' });
});

// 1. Users Table Endpoints
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Groups Table Endpoints
app.get('/api/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Candidates Table Endpoints
app.get('/api/candidates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidates');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. Candidate Contributions Table Endpoints
app.get('/api/contributions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidate_contributions');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Group Funds Table Endpoints
app.get('/api/funds', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM group_funds');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Meklite server running on port ${port}`);
});
