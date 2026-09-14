const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// PostgreSQL Connection Pool using Supabase Transaction Pooler URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4 // Forces IPv4 compatibility for cloud environments like Railway
});

app.use(cors());
app.use(express.json());

// Heartbeat / Status Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'online', app: 'Meklite API' });
});

// --- USERS ENDPOINTS ---
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- GROUPS ENDPOINTS ---
app.get('/api/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/groups', async (req, res) => {
  const { group_name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO groups (group_name, description) VALUES ($1, $2) RETURNING *',
      [group_name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// --- CANDIDATES ENDPOINTS ---
app.get('/api/candidates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidates ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/candidates', async (req, res) => {
  const { full_name, group_name, address, phone, kebele } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO candidates (full_name, group_name, address, phone, kebele) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [full_name, group_name, address, phone, kebele]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save candidate' });
  }
});

// --- CONTRIBUTIONS ENDPOINTS ---
app.get('/api/contributions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contributions ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/contributions', async (req, res) => {
  const { candidate_id, amount, contribution_date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO contributions (candidate_id, amount, contribution_date) VALUES ($1, $2, $3) RETURNING *',
      [candidate_id, amount, contribution_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save contribution' });
  }
});

// --- FUNDS ENDPOINTS ---
app.get('/api/funds', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM funds ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Meklite server running on port ${PORT}`);
});
