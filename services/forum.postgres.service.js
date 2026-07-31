const pool = require("../db/postgres");

// Même interface que SqliteForumService : les deux sont interchangeables.
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
    const result = await pool.query(sql);
    return result.rows;
  }

  // VERSION CORRIGÉE : requête parametrée avec $1
  async searchPosts(term) {
    const result = await pool.query("SELECT id, title FROM posts WHERE title LIKE $1", [`%${term}%`]);
    return result.rows;
  }

  // INSERT avec RETURNING
  async addComment(postId, userId, body) {
    const result = await pool.query(
      "INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *",
      [postId, userId, body]
    );
    return result.rows[0];
  }

  // UPDATE avec WHERE : retourne la rangee modifiée, ou undefined
  async updatePostTitle(id, title) {
    const result = await pool.query(
      "UPDATE posts SET title = $1 WHERE id = $2 RETURNING *",
      [title, id]
    );
    return result.rows[0];
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
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
      await client.query("COMMIT");
      return true;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresForumService;
