const authors = [
	{
		id: "1",
		name: "Gabriel García Márquez",
		nationality: "Colombian",
		birthYear: 1927,
	},
	{
		id: "2",
		name: "Isabel Allende",
		nationality: "Chilean",
		birthYear: 1942,
	},
];

const books = [
	{
		id: "1",
		title: "Cien años de soledad",
		authorId: "1",
		year: 1967,
		genre: "Magical Realism",
		pages: 417,
	},
	{
		id: "2",
		title: "El amor en los tiempos del cólera",
		authorId: "1",
		year: 1985,
		genre: "Romance",
		pages: 348,
	},
	{
		id: "3",
		title: "La casa de los espíritus",
		authorId: "2",
		year: 1982,
		genre: "Magical Realism",
		pages: 433,
	},
];

const reviews = [
	{
		id: "1",
		bookId: "1",
		rating: 5,
		comment: "Obra maestra",
		reviewer: "Ana",
	},
	{
		id: "2",
		bookId: "1",
		rating: 4,
		comment: "Muy buena",
		reviewer: "Luis",
	},
	{
		id: "3",
		bookId: "3",
		rating: 5,
		comment: "Increíble",
		reviewer: "María",
	},
];

module.exports = { authors, books, reviews };
