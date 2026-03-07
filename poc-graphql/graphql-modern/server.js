const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const bodyParser = require("body-parser");
const { typeDefs } = require("./schema");
const { resolvers } = require("./resolvers");

async function startServer() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });

  await server.start();

  app.use("/graphql", bodyParser.json(), expressMiddleware(server));

  app.listen(4000, () =>
    console.log("🟢 GraphQL Moderno corriendo en http://localhost:4000/graphql")
  );
}

startServer();