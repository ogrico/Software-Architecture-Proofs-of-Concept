const { authors, books, reviews } = require("./data");

const resolvers = {
  Query: {
    authors: () => authors,
    author: (_, { id }) => authors.find(a => a.id === id),
    books: () => books,
    book: (_, { id }) => books.find(b => b.id === id),
  },

  // ✅ GraphQL resuelve las relaciones automáticamente
  Author: {
    books: (author) => books.filter(b => b.authorId === author.id),
  },

  Book: {
    author: (book) => authors.find(a => a.id === book.authorId),
    reviews: (book) => reviews.filter(r => r.bookId === book.id),
  },

  Review: {
    book: (review) => books.find(b => b.id === review.bookId),
  },

  Mutation: {
    addBook: (_, { title, authorId, year, genre }) => {
      const newBook = { id: String(books.length + 1), title, authorId, year, genre };
      books.push(newBook);
      return newBook;
    },
    addReview: (_, { bookId, rating, comment, reviewer }) => {
      const newReview = { id: String(reviews.length + 1), bookId, rating, comment, reviewer };
      reviews.push(newReview);
      return newReview;
    },
  },
};

module.exports = { resolvers };