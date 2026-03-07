const express = require("express");
const { authors, books, reviews } = require("./data");

const app = express();

// ❌ Problema 1: Over-fetching - retorna TODOS los campos aunque no los necesites
app.get("/authors", (req, res) => res.json(authors));
app.get("/authors/:id", (req, res) => {
  res.json(authors.find(a => a.id === req.params.id));
});

// ❌ Problema 2: Para obtener libros de un autor, necesitas OTRA llamada
app.get("/books", (req, res) => res.json(books));
app.get("/books/:id", (req, res) => {
  res.json(books.find(b => b.id === req.params.id));
});

// ❌ Problema 3: Para las reseñas de un libro, OTRA llamada más
app.get("/books/:id/reviews", (req, res) => {
  res.json(reviews.filter(r => r.bookId === req.params.id));
});

app.listen(3001, () =>
  console.log("🔴 REST Legacy API corriendo en http://localhost:3001")
);