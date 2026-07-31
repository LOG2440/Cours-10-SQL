const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("./postgres");

// Initialise la BD à partir du schéma SQL.
const schemaPath = path.join(__dirname, "..", "schema", "postgres.sql");

async function seed() {
  const sql = await fs.readFile(schemaPath, "utf8");
  // Le fichier est envoyé en une seule requête : PostgreSQL l'exécute donc
  // dans une transaction implicite (tout passe ou rien ne passe).
  await pool.query(sql);
}

seed()
  .then(() => console.log("Base de données initialisée."))
  .catch((err) => {
    console.error(`Échec de l'initialisation : ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
