const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(__dirname));

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS app_data (
        id INTEGER PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Connected to Turso Cloud Database.');
    console.log('Meklite shared database table verified.');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initDb();

/* =========================
   MAIN MEKLITE DATABASE
   ========================= */

app.get('/api/data', async (req, res) => {
  try {
    const result = await db.execute(
      'SELECT data FROM app_data WHERE id = 1'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No Meklite database has been saved yet.'
      });
    }

    const savedData = JSON.parse(result.rows[0].data);

    res.json(savedData);
  } catch (error) {
    console.error('GET /api/data error:', error);

    res.status(500).json({
      error: 'Could not load Meklite database.',
      details: error.message
    });
  }
});


app.post('/api/data', async (req, res) => {
  try {
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        error: 'Invalid Meklite database data.'
      });
    }

    const jsonData = JSON.stringify(data);

    await db.execute({
      sql: `
        INSERT INTO app_data (id, data, updated_at)
        VALUES (1, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id)
        DO UPDATE SET
          data = excluded.data,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [jsonData]
    });

    console.log('Meklite database synchronized successfully.');

    res.json({
      success: true,
      message: 'Meklite database saved to cloud.',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('POST /api/data error:', error);

    res.status(500).json({
      error: 'Could not save Meklite database.',
      details: error.message
    });
  }
});


/* =========================
   HEALTH CHECK
   ========================= */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Meklite shared cloud database is running.'
  });
});


/* =========================
   ROOT
   ========================= */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


/* =========================
   START SERVER
   ========================= */

app.listen(PORT, () => {
  console.log(`Meklite server running on port ${PORT}`);
});
