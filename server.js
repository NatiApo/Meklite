const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'Database connected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database connection error', error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, full_name, role, status, created_at, updated_at FROM users');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, full_name, role, status } = req.body;
  try {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role, status, created_at`,
      [username, password_hash, full_name, role || 'user', status || 'Active']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, full_name, role, status, password } = req.body;
  try {
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE users SET username=$1, password_hash=$2, full_name=$3, role=$4, status=$5, updated_at=CURRENT_TIMESTAMP 
         WHERE id=$6 RETURNING id, username, full_name, role, status`,
        [username, password_hash, full_name, role, status, id]
      );
      return res.json({ success: true, data: result.rows[0] });
    } else {
      const result = await pool.query(
        `UPDATE users SET username=$1, full_name=$2, role=$3, status=$4, updated_at=CURRENT_TIMESTAMP 
         WHERE id=$5 RETURNING id, username, full_name, role, status`,
        [username, full_name, role, status, id]
      );
      return res.json({ success: true, data: result.rows[0] });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE groups SET name=$1, description=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *',
      [name, description, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM groups WHERE id = $1', [id]);
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/candidates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidates ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/candidates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM candidates WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/candidates', async (req, res) => {
  const { group_id, full_name, phone, gender, photo, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO candidates (group_id, full_name, phone, gender, photo, status) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [group_id, full_name, phone, gender, photo, status || 'Active']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/candidates/:id', async (req, res) => {
  const { id } = req.params;
  const { group_id, full_name, phone, gender, photo, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE candidates SET group_id=$1, full_name=$2, phone=$3, gender=$4, photo=$5, status=$6, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$7 RETURNING *`,
      [group_id, full_name, phone, gender, photo, status, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/contributions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidate_contributions ORDER BY payment_date DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/contributions', async (req, res) => {
  const { candidate_id, amount, payment_date, month, year, payment_method, note, recorded_by } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO candidate_contributions (candidate_id, amount, payment_date, month, year, payment_method, note, recorded_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [candidate_id, amount, payment_date, month, year, payment_method || 'Cash', note, recorded_by]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/contributions/:id', async (req, res) => {
  const { id } = req.params;
  const { candidate_id, amount, payment_date, month, year, payment_method, note, recorded_by } = req.body;
  try {
    const result = await pool.query(
      `UPDATE candidate_contributions SET candidate_id=$1, amount=$2, payment_date=$3, month=$4, year=$5, payment_method=$6, note=$7, recorded_by=$8, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$9 RETURNING *`,
      [candidate_id, amount, payment_date, month, year, payment_method, note, recorded_by, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/contributions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM candidate_contributions WHERE id = $1', [id]);
    res.json({ success: true, message: 'Candidate contribution deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/group-funds', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM group_funds ORDER BY transaction_date DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/group-funds', async (req, res) => {
  const { group_id, amount, source, reason, description, transaction_date, recorded_by } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO group_funds (group_id, amount, source, reason, description, transaction_date, recorded_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [group_id, amount, source, reason, description, transaction_date, recorded_by]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/group-funds/:id', async (req, res) => {
  const { id } = req.params;
  const { group_id, amount, source, reason, description, transaction_date, recorded_by } = req.body;
  try {
    const result = await pool.query(
      `UPDATE group_funds SET group_id=$1, amount=$2, source=$3, reason=$4, description=$5, transaction_date=$6, recorded_by=$7, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$8 RETURNING *`,
      [group_id, amount, source, reason, description, transaction_date, recorded_by, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/group-funds/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM group_funds WHERE id = $1', [id]);
    res.json({ success: true, message: 'Group fund deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/group-funds/summary', async (req, res) => {
  try {
    const query = `
      SELECT g.id AS group_id, g.name AS group_name, COALESCE(SUM(gf.amount), 0) AS total_group_money
      FROM groups g
      LEFT JOIN group_funds gf ON g.id = gf.group_id
      GROUP BY g.id, g.name
      ORDER BY g.id ASC;
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/group-funds/by-source', async (req, res) => {
  try {
    const query = `
      SELECT source, COALESCE(SUM(amount), 0) AS total_amount
      FROM group_funds
      GROUP BY source
      ORDER BY total_amount DESC;
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
