const { Pool } = require("pg");

// Paramètres de connexion lus de variables d'environnement.
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "log2440_sql",
  password: process.env.DB_PASSWORD || "postgres",
  port: parseInt(process.env.DB_PORT || "5432"),

  max: 10,                       // nombre maximal de connexions ouvertes simultanement
  idleTimeoutMillis: 30000,      // ferme une connexion inactive après 30 secondes
  connectionTimeoutMillis: 2000, // échoue rapidement si la base ne répond pas en 2 secondes
});

module.exports = pool;