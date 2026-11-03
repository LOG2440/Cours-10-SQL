const db = require("../db/sqlite");

// Erreur avec un statut HTTP : le routeur n'a pas à connaître les codes de SQLite.
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Même interface que PostgresForumService, implementee avec node:sqlite.
// À comparer : espace réservé "?" au lieu de "$1", API synchrone (pas de "await").
class SqliteForumService {
  getUsers() {
    return db.prepare("SELECT id, username, email FROM users").all();
  }

  getComments() {
    return db.prepare("SELECT * FROM comments").all();
  }

  getPostsByUser(userId) {
    return db.prepare("SELECT * FROM posts WHERE user_id = ?").all(userId);
  }

  getPostsWithAuthors() {
    return db.prepare(`
      SELECT users.username, posts.title, posts.created_at
      FROM posts
      INNER JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `).all();
  }

  getPostsWithoutComments() {
    return db.prepare(`
      SELECT posts.id, posts.title
      FROM posts
      LEFT JOIN comments ON comments.post_id = posts.id
      WHERE comments.id IS NULL
    `).all();
  }

  getMostActiveUsers() {
    return db.prepare(`
      SELECT users.username, COUNT(posts.id) AS nombre_posts
      FROM users
      INNER JOIN posts ON posts.user_id = users.id
      GROUP BY users.username
      ORDER BY nombre_posts DESC
    `).all();
  }

  // VERSION VULNERABLE : même concaténation dangereuse qu'en PostgreSQL
  // Contrairement à 42601, 42703 et 42P01 en PostgreSQL, toutes les erreurs SQL ont ici e.errcode = 1 (SQLITE_ERROR).
  // Pour les distinguer, il faut lire le texte de e.message :
  // ex. e.message.startsWith("no such table") ou e.message.startsWith("no such column").
  searchPostsVulnerable(term) {
    return db.prepare(`SELECT id, title FROM posts WHERE title LIKE '%${term}%'`).all();
  }

  // VERSION CORRIGÉE : requête paramétrée avec "?"
  searchPosts(term) {
    return db.prepare("SELECT id, title FROM posts WHERE title LIKE ?").all(`%${term}%`);
  }

  // RETURNING est supporté par SQLite également
  addComment(postId, userId, body) {
    try {
      // node:sqlite refuse undefined : null permet au SGBD de vérifier lui-même NOT NULL, comme pg.
      return db.prepare(
        "INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?) RETURNING *"
      ).get(postId, userId, body ?? null);
    } catch (e) {
      // À comparer avec PostgreSQL : e.code vaut toujours "ERR_SQLITE_ERROR", le code utile est e.errcode,
      // et il n'y a ni e.constraint ni e.column.
      switch (e.errcode) {
        case 787: // SQLITE_CONSTRAINT_FOREIGNKEY : impossible de savoir quelle clé étrangère
          throw httpError(400, "Post ou utilisateur introuvable");
        case 1299: // SQLITE_CONSTRAINT_NOTNULL : la colonne se trouve seulement dans e.message
          throw httpError(400, `Valeur obligatoire manquante (${e.message})`);
        default:
          throw e;
      }
    }
  }

  updatePostTitle(id, title) {
    try {
      return db.prepare("UPDATE posts SET title = ? WHERE id = ? RETURNING *").get(title, id);
    } catch (e) {
      if (e.errcode === 275) throw httpError(400, "Le titre ne peut pas être vide"); // SQLITE_CONSTRAINT_CHECK
      throw e;
    }
  }

  // La cascade fonctionne seulement grâce a PRAGMA foreign_keys = ON (voir db/sqlite.js)
  deletePost(id) {
    return db.prepare("DELETE FROM posts WHERE id = ?").run(id).changes > 0;
  }

  // TRANSACTION : même logique qu'en PostgreSQL. node:sqlite est synchrone et n'a
  // qu'une seule connexion, donc BEGIN / COMMIT / ROLLBACK s'executent sur "db".
  deleteUserWithContent(userId) {
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM posts WHERE user_id = ?").run(userId); // + leurs commentaires (ON DELETE CASCADE)
      // DEMO ROLLBACK : décommenter pour faire échouer la transaction (violation de UNIQUE sur username).
      // db.prepare("INSERT INTO users (username, email) VALUES ('bob', 'doublon@example.com')").run();
      const result = db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      db.exec("COMMIT");
      return result.changes > 0;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}

module.exports = SqliteForumService;
