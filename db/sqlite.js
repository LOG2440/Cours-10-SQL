const { DatabaseSync } = require("node:sqlite");

// Base SQLite en mémoire, pour comparer la syntaxe avec PostgreSQL
const db = new DatabaseSync(":memory:");

// Les clés étrangères (et donc ON DELETE CASCADE) sont désactivées par défaut en SQLite
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE comments (
    id INTEGER PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Ne pas supprimer le commentaire
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const insertUser = db.prepare("INSERT INTO users (username, email) VALUES (?, ?)");
insertUser.run("alice", "alice@example.com");
insertUser.run("bob", "bob@example.com");
insertUser.run("chloe", "chloe@example.com");

const insertPost = db.prepare("INSERT INTO posts (user_id, title, body) VALUES (?, ?, ?)");
insertPost.run(1, "Bienvenue sur le forum", "Premier post du forum...");
insertPost.run(1, "SQL vs NoSQL", "Quelles differences entre les deux modeles...");
insertPost.run(2, "Question sur les jointures", "Comment fonctionne LEFT JOIN...");

const insertComment = db.prepare("INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)");
insertComment.run(1, 2, "Merci pour le post !");
insertComment.run(1, 3, "Hate de commencer.");
insertComment.run(2, 3, "Bonne explication.");

module.exports = db;
