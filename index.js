const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const createForumRouter = require("./routes/forum");
const PostgresForumService = require("./services/forum.postgres.service");
const SqliteForumService = require("./services/forum.sqlite.service");

const app = express();
app.use(express.json());

// Documentation interactive de l'API (Swagger UI)
app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// permet de changer de base de données sans toucher au code HTTP.
app.use("/forum", createForumRouter(new PostgresForumService()));
app.use("/forum-sqlite", createForumRouter(new SqliteForumService()));

app.get("/", (req, res) => {
  res.type("html");
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(3000, () => {
  console.log("Serveur sur http://localhost:3000");
  console.log("Documentation de l'API sur http://localhost:3000/api");
});
