const { gql } = require("graphql-tag");

const typeDefs = gql`
  type Author {
    id: ID!
    name: String!
    nationality: String
    birthYear: Int
    books: [Book!]!              # Relación directa
  }

  type Book {
    id: ID!
    title: String!
    year: Int
    genre: String
    pages: Int
    author: Author!              # Relación inversa
    reviews: [Review!]!
  }

  type Review {
    id: ID!
    rating: Int!
    comment: String
    reviewer: String!
    book: Book!
  }

  type Query {
    authors: [Author!]!
    author(id: ID!): Author
    books: [Book!]!
    book(id: ID!): Book
  }

  type Mutation {
    addBook(title: String!, authorId: ID!, year: Int, genre: String): Book!
    addReview(bookId: ID!, rating: Int!, comment: String, reviewer: String!): Review!
  }
`;

module.exports = { typeDefs };