# POC: GraphQL Moderno vs Enfoque Legado (REST)

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![GraphQL](https://img.shields.io/badge/GraphQL-16-E10098?logo=graphql&logoColor=white)](https://graphql.org/)
[![Apollo Server](https://img.shields.io/badge/Apollo_Server-v4-311C87?logo=apollographql&logoColor=white)](https://www.apollographql.com/docs/apollo-server/)
[![Express](https://img.shields.io/badge/Express-4-black?logo=express&logoColor=white)](https://expressjs.com/)
[![Status](https://img.shields.io/badge/status-scaffold-orange)](#estado-actual)

Comparacion practica entre una API REST tradicional y una API GraphQL moderna usando el mismo dominio de negocio.

## Tabla de contenido
- [Objetivo](#objetivo)
- [Dominio de la POC](#dominio-de-la-poc)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Comparacion de enfoques](#comparacion-de-enfoques)
- [Stack tecnico](#stack-tecnico)
- [Requisitos](#requisitos)
- [Instalacion](#instalacion)
- [Ejecucion](#ejecucion)
- [Comparacion ejecutable](#comparacion-ejecutable)
- [Resultado baseline](#resultado-baseline)
- [Demo de referencia](#demo-de-referencia)
- [Estado actual](#estado-actual)
- [Roadmap corto](#roadmap-corto)
- [Licencia](#licencia)

## Objetivo
Demostrar las ventajas de GraphQL moderno frente a un enfoque legado (REST tradicional o GraphQL mal implementado), aplicando ambos sobre el mismo dominio de datos.

## Dominio de la POC
Biblioteca de libros:

`Author (1) -> (N) Book (1) -> (N) Review`

## Arquitectura del proyecto

```text
poc-graphql/
|-- legacy-rest/          # API REST tradicional (enfoque legado)
|   |-- server.js
|   `-- data.js
|
|-- graphql-modern/       # API GraphQL moderna
|   |-- server.js
|   |-- schema.js
|   |-- resolvers.js
|   `-- data.js
|
|-- client/               # Cliente para comparar ambos enfoques
|   |-- rest-client.js
|   `-- graphql-client.js
|
`-- README.md
```

## Comparacion de enfoques

| Criterio | REST tradicional | GraphQL moderno |
|---|---|---|
| Obtencion de datos | Multiples endpoints | Un solo endpoint con consultas flexibles |
| Over-fetching / under-fetching | Frecuente | Minimizado |
| Evolucion del contrato | Versionado de endpoints | Evolucion del esquema |
| Experiencia de cliente | Acoplado a respuestas fijas | Cliente define exactamente lo que necesita |

## Stack tecnico
- Runtime: Node.js
- REST: Express
- GraphQL: Apollo Server + GraphQL
- Lenguaje: JavaScript (CommonJS)

## Requisitos
- Node.js 18+
- npm 9+

## Instalacion

```bash
npm install
```

## Ejecucion

API REST (legado):

```bash
npm run start:rest
```

API GraphQL (moderna):

```bash
npm run start:graphql
```

## Comparacion ejecutable
Con ambos servidores levantados, puedes correr:

Cliente REST (flujo con multiples llamadas):

```bash
npm run compare:rest
```

Cliente GraphQL (flujo en una sola llamada):

```bash
npm run compare:graphql
```

Metricas automaticas (requests y bytes de payload):

```bash
npm run compare:metrics
```

## Resultado
Resultado real obtenido con `npm run compare:metrics` para el caso:
`autor + libros + ratings de resenas`.

| Enfoque | Requests | Payload |
|---|---:|---:|
| REST | 4 | 576 B |
| GraphQL | 1 | 198 B |

Resumen de mejora con GraphQL:
- Reduccion de requests: `75.0%`
- Reduccion de payload: `65.6%`

## Demo de referencia
La comparacion implementada incluye:

1. Peticion REST para obtener autores con libros y reseñas (potencialmente multiples llamadas).
2. Consulta GraphQL equivalente en una sola operacion.
3. Comparacion de payload devuelto (campos requeridos vs campos extra).
4. Comparacion de complejidad en cliente y evolucion de contrato.

Ejemplo de consulta GraphQL usada en la comparacion:

```graphql
query AuthorsWithBooksAndReviews {
	authors {
		id
		name
		books {
			id
			title
			reviews {
				id
				rating
				comment
			}
		}
	}
}
```

## Estado actual
La POC ya cuenta con:
- API REST legado funcional en `legacy-rest/server.js`.
- API GraphQL funcional en `graphql-modern/server.js`.
- Esquema y resolvers configurados en `graphql-modern/schema.js` y `graphql-modern/resolvers.js`.
- Datos de ejemplo cargados en ambos enfoques (`legacy-rest/data.js` y `graphql-modern/data.js`).
- Clientes de comparacion implementados en `client/rest-client.js` y `client/graphql-client.js`.

## Roadmap corto
1. Modelar datos compartidos (`authors`, `books`, `reviews`).
2. Exponer endpoints REST minimos para lectura.
3. Definir `schema` y `resolvers` GraphQL equivalentes.
4. Implementar clientes de prueba y medir diferencias de consumo.

## Licencia
MIT
