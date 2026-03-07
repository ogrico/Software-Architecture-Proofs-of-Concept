/**
 * CLIENTE REST LEGADO
 * 
 * Objetivo: Obtener el nombre de un autor y los títulos de sus libros
 * con el rating promedio de cada uno.
 * 
 * ❌ Problema demostrado:
 *    - Necesitamos 4 llamadas HTTP para obtener lo que GraphQL da en 1
 *    - Recibimos campos que no necesitamos (over-fetching)
 */

const BASE_URL = "http://localhost:3001";

async function fetchWithLog(label, url) {
  console.log(`\n📡 [REQUEST] ${label}`);
  console.log(`   → GET ${url}`);
  const res = await fetch(url);
  const data = await res.json();
  console.log(`   ← Respuesta:`, JSON.stringify(data, null, 2));
  return data;
}

async function getAuthorWithBooksAndReviews(authorId) {
  console.log("\n========================================");
  console.log("🔴 CLIENTE REST LEGADO");
  console.log("   Tarea: obtener autor + libros + reseñas");
  console.log("========================================");

  let totalRequests = 0;

  // Llamada 1: Obtener el autor
  // ❌ Over-fetching: recibo nationality, birthYear aunque no los necesito
  const author = await fetchWithLog("Obtener autor", `${BASE_URL}/authors/${authorId}`);
  totalRequests++;

  // Llamada 2: Obtener TODOS los libros y filtrar en cliente
  // ❌ Over-fetching: recibo pages, genre aunque no los necesito
  // ❌ Over-fetching: recibo libros de OTROS autores también
  const allBooks = await fetchWithLog("Obtener todos los libros", `${BASE_URL}/books`);
  totalRequests++;
  const authorBooks = allBooks.filter(b => b.authorId === String(authorId));

  // Llamadas 3..N: Una llamada por cada libro para obtener sus reseñas
  const booksWithReviews = [];
  for (const book of authorBooks) {
    const reviews = await fetchWithLog(
      `Obtener reseñas del libro "${book.title}"`,
      `${BASE_URL}/books/${book.id}/reviews`
    );
    totalRequests++;
    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "Sin reseñas";

    booksWithReviews.push({
      title: book.title,         // ✅ Lo necesito
      avgRating,                 // ✅ Lo necesito
      // year, genre, pages      // ❌ Los recibí pero no los uso
    });
  }

  console.log("\n========================================");
  console.log("📊 RESULTADO FINAL (REST)");
  console.log("========================================");
  console.log({
    autor: author.name,
    libros: booksWithReviews
  });
  console.log(`\n⚠️  Total de requests HTTP realizados: ${totalRequests}`);
  console.log("========================================\n");
}

getAuthorWithBooksAndReviews(1);