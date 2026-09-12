const express = require("express");
const cors = require("cors");
const { createClient } = require("@libsql/client");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Turso Cloud SQLite Database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Auto-initialize tables when server starts
async function initDatabase() {
  try {
    // Example: Create users table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Turso database schema initialized successfully.");
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

initDatabase();

// API Health Check Endpoint
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Meklit API is running with Turso Database" });
});

// GET Endpoint: Fetch all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM users ORDER BY id DESC");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Endpoint: Insert new user
app.post("/api/users", async (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ success: false, error: "Name and email are required" });
  }

  try {
    await db.execute({
      sql: "INSERT INTO users (name, email) VALUES (?, ?)",
      args: [name, email],
    });
    res.status(201).json({ success: true, message: "User added successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
