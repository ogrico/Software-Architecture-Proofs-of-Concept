/**
 * CLIENTE GRAPHQL MODERNO
 * 
 * Objetivo: Obtener el nombre de un autor y los títulos de sus libros
 * con el rating promedio de cada uno.
 * 
 *    Ventajas demostradas:
 *    - Una sola llamada HTTP (vs 4+ en REST)
 *    - Solo recibimos los campos que pedimos (no over-fetching)
 *    - La query autodocumenta exactamente qué datos necesitamos
 */

const GRAPHQL_URL = "http://localhost:4000/graphql";

// La query declara EXACTAMENTE lo que necesitamos
// No más, no menos
const GET_AUTHOR_WITH_BOOKS = `
  query GetAuthorWithBooks($id: ID!) {
    author(id: $id) {
      name                   # Solo el nombre (no nationality, no birthYear)
      books {
        title                # Solo el título (no year, no genre, no pages)
        reviews {
          rating             # Solo el rating (no comment, no reviewer)
        }
      }
    }
  }
`;

async function graphqlRequest(query, variables = {}) {
  console.log("\n📡 [REQUEST] Una única llamada GraphQL");
  console.log(`   → POST ${GRAPHQL_URL}`);
  console.log("   → Query enviada:", query.trim());
  console.log("   → Variables:", variables);

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const { data, errors } = await res.json();

  if (errors) {
    console.error("   ← Errores GraphQL:", errors);
    throw new Error("Error en la query GraphQL");
  }

  console.log("   ← Respuesta:", JSON.stringify(data, null, 2));
  return data;
}

async function getAuthorWithBooksAndReviews(authorId) {
  console.log("\n========================================");
  console.log("CLIENTE GRAPHQL MODERNO");
  console.log("   Tarea: obtener autor + libros + reseñas");
  console.log("========================================");

  const data = await graphqlRequest(GET_AUTHOR_WITH_BOOKS, { id: authorId });

  const { author } = data;

  // Calcular el promedio de ratings en cliente (igual que en REST)
  const libros = author.books.map(book => ({
    title: book.title,
    avgRating: book.reviews.length
      ? (book.reviews.reduce((sum, r) => sum + r.rating, 0) / book.reviews.length).toFixed(1)
      : "Sin reseñas",
  }));

  console.log("\n========================================");
  console.log("RESULTADO FINAL (GraphQL)");
  console.log("========================================");
  console.log({
    autor: author.name,
    libros,
  });
  console.log(`\nTotal de requests HTTP realizados: 1`);
  console.log("========================================\n");
}

getAuthorWithBooksAndReviews("1");