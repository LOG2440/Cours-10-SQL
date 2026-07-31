DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Ne pas supprimer le commentaire
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO users (username, email) VALUES
  ('alice', 'alice@example.com'),
  ('bob', 'bob@example.com'),
  ('chloe', 'chloe@example.com');

INSERT INTO posts (user_id, title, body) VALUES
  (1, 'Bienvenue sur le forum', 'Premier post du forum...'),
  (1, 'SQL vs NoSQL', 'Quelles differences entre les deux modeles...'),
  (2, 'Question sur les jointures', 'Comment fonctionne LEFT JOIN...');

INSERT INTO comments (post_id, user_id, body) VALUES
  (1, 2, 'Merci pour le post !'),
  (1, 3, 'Hate de commencer.'),
  (2, 3, 'Bonne explication.');
