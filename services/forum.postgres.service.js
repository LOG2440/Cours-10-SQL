const pool = require("../db/postgres");

// Erreur avec un statut HTTP : le routeur n'a pas à connaître les codes de PostgreSQL.
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Même interface que SqliteForumService : les deux sont interchangeables sauf pour la gestion des erreurs.
class PostgresForumService {
  // SELECT de base
  async getUsers() {
    const result = await pool.query("SELECT id, username, email FROM users");
    return result.rows;
  }

  //SELECT de toutes les rangées au complet
  async getComments() {
    const result = await pool.query("SELECT * FROM comments");
    return result.rows;
  }

  // WHERE
  async getPostsByUser(userId) {
    const result = await pool.query("SELECT * FROM posts WHERE user_id = $1", [userId]);
    return result.rows;
  }

  // INNER JOIN
  async getPostsWithAuthors() {
    const result = await pool.query(`
      SELECT users.username, posts.title, posts.created_at
      FROM posts
      INNER JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);
    return result.rows;
  }

  // LEFT JOIN
  async getPostsWithoutComments() {
    const result = await pool.query(`
      SELECT posts.id, posts.title
      FROM posts
      LEFT JOIN comments ON comments.post_id = posts.id
      WHERE comments.id IS NULL
    `);
    return result.rows;
  }

  // JOIN + GROUP BY + COUNT
  async getMostActiveUsers() {
    const result = await pool.query(`
      SELECT users.username, COUNT(posts.id) AS nb_posts
      FROM users
      INNER JOIN posts ON posts.user_id = users.id
      GROUP BY users.username
      ORDER BY nb_posts DESC
    `);
    return result.rows;
  }

  // VERSION VULNERABLE : requête construite par concatenation de chaines
  async searchPostsVulnerable(term) {
    const sql = `SELECT id, title FROM posts WHERE title LIKE '%${term}%'`;
    try {
      const result = await pool.query(sql);
      return result.rows;
    } catch (e) {
      // Ces messages révèlent la structure de la base : à ne pas exposer dans une vraie application.
      switch (e.code) {
        case "23505": // unique_violation : e.constraint indique quelle contrainte UNIQUE
          throw httpError(409, `Valeur déjà utilisée (contrainte ${e.constraint})`);
        case "42601": // syntax_error
          throw httpError(500, `Requête mal formée : ${e.message}`);
        case "42703": // undefined_column
          throw httpError(500, `Colonne inexistante : ${e.message}`);
        case "42P01": // undefined_table
          throw httpError(500, `Table inexistante : ${e.message}`);
        default:
          throw e;
      }
    }
  }

  // VERSION CORRIGÉE : requête parametrée avec $1
  async searchPosts(term) {
    const result = await pool.query("SELECT id, title FROM posts WHERE title LIKE $1", [`%${term}%`]);
    return result.rows;
  }

  // INSERT avec RETURNING
  async addComment(postId, userId, body) {
    try {
      const result = await pool.query(
        "INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *",
        [postId, userId, body]
      );
      return result.rows[0];
    } catch (e) {
      // e.code contient le code d'erreur standard SQLSTATE retourné par PostgreSQL
      switch (e.code) {
        case "23503": // foreign_key_violation : e.constraint indique quelle clé étrangère
          if (e.constraint === "comments_post_id_fkey") throw httpError(404, "Post introuvable");
          throw httpError(400, "Utilisateur introuvable");
        case "23502": // not_null_violation : e.column indique quelle colonne
          throw httpError(400, `La colonne ${e.column} est obligatoire`);
        case "22P02": // invalid_text_representation : ex. "abc" pour une colonne INTEGER
        case "22003": // numeric_value_out_of_range : valeur trop grande pour une colonne INTEGER
          throw httpError(400, "Les identifiants doivent être des entiers valides");
        default:
          throw e;
      }
    }
  }

  // UPDATE avec WHERE : retourne la rangee modifiée, ou undefined
  async updatePostTitle(id, title) {
    try {
      const result = await pool.query(
        "UPDATE posts SET title = $1 WHERE id = $2 RETURNING *",
        [title, id]
      );
      return result.rows[0];
    } catch (e) {
      if (e.code === "23514") throw httpError(400, "Le titre ne peut pas être vide"); // check_violation
      throw e;
    }
  }

  // DELETE : demontre ON DELETE CASCADE sur comments
  async deletePost(id) {
    const result = await pool.query("DELETE FROM posts WHERE id = $1", [id]);
    return result.rowCount > 0;
  }

  // TRANSACTION : supprime un utilisateur ET tout son contenu, de façon atomique.
  // posts.user_id n'a PAS de ON DELETE CASCADE (contrairement a comments.post_id) :
  async deleteUserWithContent(userId) {
    const client = await pool.connect(); // une connexion dédiée, PAS pool.query()
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM posts WHERE user_id = $1", [userId]); // + leurs commentaires (ON DELETE CASCADE)
      // DEMO ROLLBACK : décommenter la ligne suivante pour faire échouer la transaction.
      // await client.query("INSERT INTO users (username, email) VALUES ('bob', 'doublon@example.com')");
      const result = await client.query("DELETE FROM users WHERE id = $1", [userId]);
      await client.query("COMMIT");
      return result.rowCount > 0;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresForumService;
