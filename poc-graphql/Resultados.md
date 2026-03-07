# Documentacion de Prueba de Concepto (PoC)

## Descripcion de la prueba
La prueba de concepto evalua dos enfoques de arquitectura de APIs para el mismo dominio de negocio (biblioteca):

- REST tradicional (enfoque legado).
- GraphQL moderno (enfoque flexible orientado a cliente).

Se ejecuta una comparacion practica para medir impacto en consumo de datos cuando el cliente solicita autores, libros y resenas.

## Objetivo(s) de la prueba
- Comparar el esfuerzo de consumo entre REST y GraphQL para un mismo caso funcional.
- Medir cantidad de requests necesarios por enfoque.
- Medir tamano de payload retornado por enfoque.
- Validar si GraphQL reduce over-fetching/under-fetching frente a REST en este escenario.

## Pasos implementados para llevar a cabo la prueba
1. Definicion del dominio compartido: `Author -> Book -> Review`.
2. Implementacion de una API REST en `legacy-rest/`.
3. Implementacion de una API GraphQL en `graphql-modern/` con `schema` y `resolvers`.
4. Creacion de clientes de prueba en `client/` para ejecutar consultas equivalentes.
5. Ejecucion de medicion automatica con `npm run compare:metrics`.
6. Consolidacion de resultados de requests y bytes de payload.

## Tecnologias usadas en la prueba (especifique lenguajes, librerias)
- Lenguaje: JavaScript (CommonJS).
- Runtime: Node.js.
- API REST: Express.
- API GraphQL: Apollo Server + GraphQL.
- Utilidades HTTP/parsing: body-parser.
- Gestor de paquetes: npm.

## Resultados
Resultado baseline para el caso: autor + libros + ratings de resenas.

| Enfoque | Requests | Payload |
|---|---:|---:|
| REST | 4 | 576 B |
| GraphQL | 1 | 198 B |

Impacto observado:
- Reduccion de requests con GraphQL: 75.0%.
- Reduccion de payload con GraphQL: 65.6%.

## Conclusiones
- En el escenario evaluado, GraphQL reduce significativamente llamadas de red y volumen de datos transferidos.
- REST mantiene simplicidad y madurez operacional, pero puede requerir multiples endpoints para consultas compuestas.
- GraphQL mejora la flexibilidad del cliente al permitir seleccionar solo los campos necesarios.
- Para evolucionar esta PoC hacia produccion, se recomienda complementar con controles de seguridad, observabilidad, cache, limites de complejidad y estrategia de versionado/evolucion del esquema.
