const swaggerJSDoc = require("swagger-jsdoc");

// Specification OpenAPI génerée à partir des annotations @swagger ci-dessous,
// Servie par swagger-ui-express sur /api (voir index.js).
// Les mêmes routes existent sous /forum-sqlite (implementation SQLite) :
// remplacer le prefixe dans l'URL pour les tester.
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API du forum (SQL)",
      version: "1.0.0",
      description:
        "API REST du forum de demonstration (voir DB.md). Les routes documentees ici utilisent PostgreSQL ; " +
        "les mêmes routes existent sous le prefixe /forum-sqlite avec une implementation SQLite.",
    },
    tags: [
      { name: "GET", description: "Récupérer des données (SELECT, jointures, agregation)" },
      { name: "POST", description: "Ajouter des données (INSERT)" },
      { name: "PATCH", description: "Modifier des données (UPDATE)" },
      { name: "DELETE", description: "Supprimer des données (DELETE + ON DELETE CASCADE)" },
    ],
    components: {
      schemas: {
        Utilisateur: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            username: { type: "string", example: "alice" },
            email: { type: "string", example: "alice@example.com" },
          },
        },
        Post: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            user_id: { type: "integer", example: 1 },
            title: { type: "string", example: "Bienvenue sur le forum" },
            body: { type: "string", example: "Premier post du forum..." },
            created_at: { type: "string", example: "2026-07-06T12:00:00.000Z" },
          },
        },
        Commentaire: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            post_id: { type: "integer", example: 1 },
            user_id: { type: "integer", example: 2 },
            body: { type: "string", example: "Merci pour le post !" },
            created_at: { type: "string", example: "2026-07-06T12:00:00.000Z" },
          },
        },
      },
    },
  },
  apis: [__filename],
};

module.exports = swaggerJSDoc(swaggerOptions);

/**
 * @swagger
 * /forum/users:
 *   get:
 *     summary: Récupérer tous les utilisateurs (SELECT de base)
 *     tags:
 *       - GET
 *     responses:
 *       200:
 *         description: "Liste des utilisateurs"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Utilisateur'
 *       500:
 *         description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/comments:
 *  get:
 *    summary: Récupérer tous les commentaires et toutes les colonnes (SELECT de base)
 *    tags:
 *      - GET
 *    responses:
 *      200:
 *        description: "Liste des commentaires"
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Commentaire'
 *      500:
 *        description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/posts/{userId}:
 *   get:
 *     summary: Récupérer les posts d'un utilisateur (WHERE)
 *     tags:
 *       - GET
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: "Identifiant de l'utilisateur"
 *         example: 1
 *     responses:
 *       200:
 *         description: "Posts de cet utilisateur (liste vide si aucun)"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/posts-with-authors:
 *   get:
 *     summary: Récupérer les posts avec le nom de leur auteur (INNER JOIN)
 *     tags:
 *       - GET
 *     responses:
 *       200:
 *         description: "Posts avec auteur, du plus recent au plus ancien"
 *         content:
 *           application/json:
 *             example:
 *               - username: "bob"
 *                 title: "Question sur les jointures"
 *                 created_at: "2026-07-06T12:00:00.000Z"
 *               - username: "alice"
 *                 title: "Bienvenue sur le forum"
 *                 created_at: "2026-07-06T11:00:00.000Z"
 *       500:
 *         description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/posts-without-comments:
 *   get:
 *     summary: Récupérer les posts sans aucun commentaire (LEFT JOIN)
 *     tags:
 *       - GET
 *     responses:
 *       200:
 *         description: "Posts sans commentaire"
 *         content:
 *           application/json:
 *             example:
 *               - id: 3
 *                 title: "Question sur les jointures"
 *       500:
 *         description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/most-active-users:
 *   get:
 *     summary: Récupérer les utilisateurs les plus actifs (JOIN + GROUP BY + COUNT)
 *     tags:
 *       - GET
 *     responses:
 *       200:
 *         description: "Utilisateurs tries par nombre de posts decroissant"
 *         content:
 *           application/json:
 *             example:
 *               - username: "alice"
 *                 nombre_posts: 2
 *               - username: "bob"
 *                 nombre_posts: 1
 *       500:
 *         description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/search/vulnerable:
 *   get:
 *     summary: "Rechercher des posts par titre - VERSION VULNERABLE a l'injection SQL"
 *     description: "Requete construite par concatenation de chaînes. Essayer q = %' OR '1'='1 pour retourner tous les posts."
 *     tags:
 *       - GET
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: "Terme de recherche"
 *         example: "SQL"
 *     responses:
 *       200:
 *         description: "Posts dont le titre contient le terme (ou plus, en cas d'injection...)"
 *       500:
 *         description: "Erreur SQL (une injection mal formee casse la requete)"
 */

/**
 * @swagger
 * /forum/search/secure:
 *   get:
 *     summary: "Rechercher des posts par titre - version corrigee (requete parametree)"
 *     description: "La même entrée malicieuse est traitée comme une simple chaîne de recherche, sans effet."
 *     tags:
 *       - GET
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: "Terme de recherche"
 *         example: "SQL"
 *     responses:
 *       200:
 *         description: "Posts dont le titre contient le terme"
 *       500:
 *         description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/posts/{postId}/comments:
 *   post:
 *     summary: Ajouter un commentaire à un post (INSERT + RETURNING)
 *     tags:
 *       - POST
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: "Identifiant du post à commenter"
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               body:
 *                 type: string
 *             required:
 *               - userId
 *               - body
 *           example:
 *             userId: 2
 *             body: "Nouveau commentaire !"
 *     responses:
 *       201:
 *         description: "Commentaire créé, avec les valeurs générées par le SGBD (id, created_at)"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Commentaire'
 *       400:
 *         description: "Insertion refusée par le SGBD (post ou utilisateur inexistant : violation de clé étrangère)"
 */

/**
 * @swagger
 * /forum/posts/{id}:
 *   patch:
 *     summary: Modifier le titre d'un post (UPDATE avec WHERE)
 *     tags:
 *       - PATCH
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "Identifiant du post à modifier"
 *         example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *             required:
 *               - title
 *           example:
 *             title: "Titre corrigé"
 *     responses:
 *       200:
 *         description: "Post modifié"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: "Aucun post avec cet identifiant"
 *       500:
 *         description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/posts/{id}:
 *   delete:
 *     summary: Supprimer un post et ses commentaires (ON DELETE CASCADE)
 *     tags:
 *       - DELETE
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "Identifiant du post à supprimer"
 *         example: 1
 *     responses:
 *       200:
 *         description: "Post supprimé (ses commentaires aussi, via ON DELETE CASCADE)"
 *       404:
 *         description: "Aucun post avec cet identifiant"
 *       500:
 *         description: "Erreur interne du serveur"
 */

/**
 * @swagger
 * /forum/users/{id}:
 *   delete:
 *     summary: "Supprimer un utilisateur et tout son contenu (TRANSACTION)"
 *     description: "Deux DELETE (posts puis utilisateur) dans une transaction BEGIN / COMMIT / ROLLBACK : soit tout reussit, soit rien n'est appliqué. Voir la ligne DEMO ROLLBACK commentee dans le service pour forcer une annulation."
 *     tags:
 *       - DELETE
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "Identifiant de l'utilisateur a supprimer"
 *         example: 1
 *     responses:
 *       200:
 *         description: "Utilisateur et tout son contenu supprimés (transaction validée)"
 *       500:
 *         description: "Une etape a echoué : transaction annulée (ROLLBACK), rien n'a changé dans la base"
 */
