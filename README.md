# Persistance des données : Serveur de démonstration SQL

Serveur de démonstration pour le cours sur les bases relationnelles. Les mêmes routes existent en deux versions pour comparer la syntaxe :

- `/forum` : PostgreSQL, via le pilote `pg`
- `/forum-sqlite` : SQLite, via le module natif `node:sqlite` (aucune dépendance à installer)

## Architecture : séparation routeur / service

Le routeur ne connaît que l'interface du service (`getUsers()`, `addComment()`, ...) : le **même** routeur est monté deux fois dans `index.js`, une fois avec le service PostgreSQL (`/forum`), une fois avec le service SQLite (`/forum-sqlite`). Changer de base de données ne demande aucune modification du code HTTP.

## Documentation interactive (Swagger UI)

Toutes les routes sont documentées et testables dans le navigateur sur http://localhost:3000/api : chaque route a un bouton « Try it out » qui envoie une vraie requête au serveur. La spécification OpenAPI est générée à partir des annotations dans `swagger.js`.

## Prérequis

- **Node.js 22.5+** (pour le module `node:sqlite` utilisé par `/forum-sqlite`).
- **Une instance PostgreSQL** accessible sur `localhost:5432`, contenant une base `log2440_sql` (nom attendu par défaut ; un autre nom demande un fichier `.env`, voir plus bas).
  - Deux options : une installation locale ou un conteneur Docker.

### Option 1 : PostgreSQL installé localement

Les installateurs officiels pour Windows, macOS et Linux sont sur https://www.postgresql.org/download/ :

- **Windows** : installateur EDB (inclut pgAdmin). Retenir le mot de passe choisi pour l'utilisateur `postgres`.
- **macOS** : `brew install postgresql@16 && brew services start postgresql@16`.
- **Linux (Debian/Ubuntu)** : `sudo apt install postgresql`.

Créer ensuite la base utilisée par le projet :

```bash
# Avec l'outil en ligne de commande createdb
# Demandera le mot de passe de l'utilisateur postgres
createdb -h localhost -U postgres log2440_sql

# Ou depuis le client psql
psql -U postgres -c "CREATE DATABASE log2440_sql;"
```

### Option 2 : PostgreSQL avec Docker

Aucune installation à faire sur la machine : le conteneur crée directement la base grâce à `POSTGRES_DB`.

```bash
docker run --name postgres-demo \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=log2440_sql \
  -p 5432:5432 -d postgres:16
```

Le conteneur se gère ensuite avec `docker stop postgres-demo` et `docker start postgres-demo` (les données sont conservées entre les redémarrages ; `docker rm` les supprime). Pour ouvrir un client `psql` sans rien installer :

```bash
docker exec -it postgres-demo psql -U postgres -d log2440_sql
```

### Interface graphique (optionnel)

[pgAdmin](https://www.pgadmin.org/) permet d'explorer les tables, d'écrire des requêtes et d'en visualiser les résultats sans passer par `psql`. Il est inclus dans l'installateur Windows/macOS et s'installe séparément sinon.

À la première connexion, créer un serveur pointant vers `localhost:5432`, utilisateur `postgres`. Les extensions PostgreSQL de VS Code ou DBeaver sont des alternatives équivalentes.

### Hébergement PostgreSQL externe (optionnel)

La plateforme [Supabase](https://supabase.com/) propose un hébergement gratuit de bases PostgreSQL. La plateforme permet une visualisation des tables, leur contenu et une interface SQL pour exécuter des requêtes directement dans le navigateur.

Créer un projet, puis récupérer les paramètres de connexion à travers le bouton vert "Connect" > "Connection string" et les paramètres individuels (host, port, user, database). Ces valeurs peuvent ensuite être copiées dans un fichier `.env` à la racine du projet (voir ci-dessous).

### Paramètres de connexion (fichier `.env`)

Les paramètres de connexion sont lus dans des variables d'environnement : `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`. Les valeurs par défaut (voir `db/postgres.js`) correspondent aux deux options d'installation ci-dessus : **si votre configuration est identique, il n'y a rien à faire**.

Pour utiliser d'autres valeurs (mot de passe différent, autre port, base hébergée ailleurs), copier le fichier d'exemple fourni sous le nom `.env` à la racine du projet, puis modifier les valeurs :

```bash
cp .env.example .env
```

Le fichier `.env` est chargé automatiquement par `npm start` et `npm run seed` grâce à `--env-file-if-exists` de Node (voir `package.json`). Le projet fonctionne aussi sans fichier `.env`.

Deux détails à retenir : le fichier `.env` est ignoré par Git (il peut contenir un mot de passe), c'est pourquoi seul `.env.example` est versionné ; et une variable déjà définie dans le terminal (`export DB_NAME=...`) a priorité sur celle du fichier.

## Création et peuplement des tables (PostgreSQL)

```bash
npm run seed
```

Exécute `schema/postgres.sql` : recrée les tables `users`, `posts`, `comments` et insère des données de démonstration.

Note pour la démonstration en classe : les exemples de `UPDATE`/`DELETE` et de suppression en cascade modifient les données. Relancer `npm run seed` entre les sections pour revenir aux données des diapos. Pour la variante SQLite (en mémoire), redémarrer simplement le serveur.

La base SQLite (`/forum-sqlite`) est peuplée automatiquement en mémoire au démarrage du serveur : aucune commande à lancer.

## Lancement du serveur

```bash
npm ci
npm start
```

Le serveur est lancé sur http://localhost:3000

## SELECT, WHERE, tri et agrégation

```bash
curl http://localhost:3000/forum/users
curl http://localhost:3000/forum/comments
curl http://localhost:3000/forum/posts/1
curl http://localhost:3000/forum/most-active-users
```

Comparer avec la version SQLite (mêmes résultats, syntaxe différente sous le capot) :

```bash
curl http://localhost:3000/forum-sqlite/most-active-users
```

## Jointures

```bash
curl http://localhost:3000/forum/posts-with-authors

# Le post "Question sur les jointures" n'a aucun commentaire : bon exemple de LEFT JOIN
curl http://localhost:3000/forum/posts-without-comments
```

## INSERT : ajouter un commentaire

La route retourne le commentaire créé, avec les valeurs générées par le SGBD (`id` via `SERIAL`, `created_at` via `DEFAULT now()`), grâce à la clause `RETURNING`.

```bash
curl -X POST http://localhost:3000/forum/posts/1/comments \
  -H "Content-Type: application/json" \
  -d '{"userId": 2, "body": "Nouveau commentaire !"}'
```

L'intégrité référentielle en action : insérer un commentaire sur un post inexistant (ou avec un `userId` inexistant) est refusé par le SGBD lui-même (violation de clé étrangère) :

```bash
curl -X POST http://localhost:3000/forum/posts/99/comments \
  -H "Content-Type: application/json" \
  -d '{"userId": 2, "body": "Post fantome"}'
```

## UPDATE : corriger le titre d'un post

```bash
curl -X PATCH http://localhost:3000/forum/posts/2 \
  -H "Content-Type: application/json" \
  -d '{"title": "Titre corrigé"}'
```

## Injection SQL et requêtes préparées

Version vulnérable (concaténation de chaînes) :

```bash
curl "http://localhost:3000/forum/search/vulnerable?q=SQL"

# Injection : referme le LIKE et ajoute une condition toujours vraie (`' OR '1'='1`) pour retourner tous les posts
curl "http://localhost:3000/forum/search/vulnerable?q=%25%27%20OR%20%271%27%3D%271"
```

Version corrigée (requête paramétrée avec `$1`) : la même entrée est traitée comme une simple chaîne de recherche, sans effet.

```bash
curl "http://localhost:3000/forum/search/secure?q=%25%27%20OR%20%271%27%3D%271"
```

## ON DELETE CASCADE

Supprimer le post 1 (qui a des commentaires) supprime aussi ses commentaires automatiquement :

```bash
curl -X DELETE http://localhost:3000/forum/posts/1
curl http://localhost:3000/forum/posts-with-authors   # le post 1 et ses commentaires ont disparu
```

Même comportement côté SQLite, actif uniquement grâce à `PRAGMA foreign_keys = ON` (voir `db/sqlite.js`) :

```bash
curl -X DELETE http://localhost:3000/forum-sqlite/posts/1
```

## Transaction (BEGIN / COMMIT / ROLLBACK)

Supprimer un utilisateur et **tout** son contenu de façon atomique. Comme `posts.user_id` n'a pas de `ON DELETE CASCADE`, il faut deux `DELETE` (posts, puis utilisateur) qui doivent réussir ensemble : ils sont regroupés dans une transaction (voir `deleteUserWithContent` dans les services).

```bash
curl -X DELETE http://localhost:3000/forum/users/1   # alice + ses posts + les commentaires sur ces posts
```

Pour démontrer l'annulation : décommenter la ligne « DEMO ROLLBACK » entre les deux `DELETE` dans le service. Elle insère un `username` déjà pris (violation de `UNIQUE`), l'exception déclenche le `ROLLBACK`, et la base reste **inchangée** : l'utilisateur garde tous ses posts. La route répond alors `500 Transaction annulée (ROLLBACK)`.
