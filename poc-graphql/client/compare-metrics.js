const REST_BASE_URL = "http://localhost:3001";
const GRAPHQL_URL = "http://localhost:4000/graphql";

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al llamar ${url}`);
  }

  const raw = await response.text();
  const bytes = Buffer.byteLength(raw, "utf8");
  return { data: JSON.parse(raw), bytes };
}

async function measureRest(authorId) {
  let requests = 0;
  let payloadBytes = 0;

  const authorRes = await requestJson(`${REST_BASE_URL}/authors/${authorId}`);
  requests += 1;
  payloadBytes += authorRes.bytes;

  const booksRes = await requestJson(`${REST_BASE_URL}/books`);
  requests += 1;
  payloadBytes += booksRes.bytes;

  const authorBooks = booksRes.data.filter((book) => book.authorId === String(authorId));

  for (const book of authorBooks) {
    const reviewsRes = await requestJson(`${REST_BASE_URL}/books/${book.id}/reviews`);
    requests += 1;
    payloadBytes += reviewsRes.bytes;
  }

  return {
    approach: "REST",
    requests,
    payloadBytes,
  };
}

async function measureGraphql(authorId) {
  const query = `
    query ComparePayload($id: ID!) {
      author(id: $id) {
        name
        books {
          title
          reviews {
            rating
          }
        }
      }
    }
  `;

  const graphqlRes = await requestJson(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id: String(authorId) } }),
  });

  return {
    approach: "GraphQL",
    requests: 1,
    payloadBytes: graphqlRes.bytes,
  };
}

function formatBytes(bytes) {
  return `${bytes} B`;
}

function printComparison(rest, graphql) {
  const requestReduction = (((rest.requests - graphql.requests) / rest.requests) * 100).toFixed(1);
  const payloadReduction = (((rest.payloadBytes - graphql.payloadBytes) / rest.payloadBytes) * 100).toFixed(1);

  console.log("\n========================================");
  console.log("METRICAS DE COMPARACION");
  console.log("Caso: autor + libros + ratings de resenas");
  console.log("========================================");
  console.table([
    {
      Enfoque: rest.approach,
      Requests: rest.requests,
      Payload: formatBytes(rest.payloadBytes),
    },
    {
      Enfoque: graphql.approach,
      Requests: graphql.requests,
      Payload: formatBytes(graphql.payloadBytes),
    },
  ]);
  console.log(`Reduccion de requests con GraphQL: ${requestReduction}%`);
  console.log(`Reduccion de payload con GraphQL: ${payloadReduction}%`);
  console.log("========================================\n");
}

async function main() {
  try {
    const authorId = "1";
    const [restMetrics, graphqlMetrics] = await Promise.all([
      measureRest(authorId),
      measureGraphql(authorId),
    ]);

    printComparison(restMetrics, graphqlMetrics);
  } catch (error) {
    console.error("No se pudieron calcular las metricas.");
    console.error("Asegurate de tener ambos servidores ejecutandose:");
    console.error("- npm run start:rest");
    console.error("- npm run start:graphql");
    console.error(`Detalle: ${error.message}`);
    process.exit(1);
  }
}

main();
