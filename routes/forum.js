const express = require("express");

function createForumRouter(service) {
  const router = express.Router();

  router.get("/users", async (req, res) => {
    try {
      res.json(await service.getUsers());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/comments", async (req, res) => {
    try {
      res.json(await service.getComments());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/posts/:userId", async (req, res) => {
    try {
      res.json(await service.getPostsByUser(req.params.userId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/posts-with-authors", async (req, res) => {
    try {
      res.json(await service.getPostsWithAuthors());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/posts-without-comments", async (req, res) => {
    try {
      res.json(await service.getPostsWithoutComments());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get("/most-active-users", async (req, res) => {
    try {
      res.json(await service.getMostActiveUsers());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Injection : GET /search/vulnerable?q=%' OR '1'='1
  router.get("/search/vulnerable", async (req, res) => {
    try {
      res.json(await service.searchPostsVulnerable(req.query.q || ""));
    } catch (e) {
      res.status(500).json({ error: "Erreur SQL : " + e.message });
    }
  });

  router.get("/search/secure", async (req, res) => {
    try {
      res.json(await service.searchPosts(req.query.q || ""));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Body JSON attendu : { "userId": 2, "body": "..." }
  router.post("/posts/:postId/comments", async (req, res) => {
    const { userId, body } = req.body;
    try {
      const comment = await service.addComment(req.params.postId, userId, body);
      res.status(201).json(comment);
    } catch (e) {
      // Violation de clé étrangère : post ou utilisateur inexistant.
      res.status(400).json({ error: "Insertion refusée par le SGBD : " + e.message });
    }
  });

  // Body JSON attendu : { "title": "Titre corrige" }
  router.patch("/posts/:id", async (req, res) => {
    try {
      const post = await service.updatePostTitle(req.params.id, req.body.title);
      if (!post) return res.status(404).json({ error: "Post introuvable" });
      res.json(post);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete("/posts/:id", async (req, res) => {
    try {
      const deleted = await service.deletePost(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Post introuvable" });
      res.json({ message: `Post ${req.params.id} supprimé (ses commentaires aussi, via ON DELETE CASCADE)` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // TRANSACTION : supprime un utilisateur et tout son contenu (BEGIN / COMMIT / ROLLBACK)
  router.delete("/users/:id", async (req, res) => {
    try {
      await service.deleteUserWithContent(req.params.id);
      res.json({ message: `Utilisateur ${req.params.id} et tout son contenu supprimés (transaction validée)` });
    } catch (e) {
      // Une etape a echoué : la transaction est annulée, rien n'a changé dans la base.
      res.status(500).json({ error: "Transaction annulée (ROLLBACK) : " + e.message });
    }
  });

  return router;
}

module.exports = createForumRouter;
