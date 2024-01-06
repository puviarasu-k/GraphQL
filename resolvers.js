import { games, authors, reviews } from "./common/constant.js";

/**
 * Resolver functions are used to handle requests and queries
 */

export const resolvers = {
    Query: {
        helloWorld: () => "hello World",

        games: () => games,
        authors: () => authors,
        reviews: () => reviews,

        getGameById: (_, args) => games.find(gameData => gameData.id === args.id),
        getAuthorById: (_, args) => authors.find(authorsData => authorsData.id === args.id),
        getReviewById: (_, args) => reviews.find(reviewData => reviewData.id === args.id)
    },
    Game: {
        reviews: (parentData) => reviews.filter(reviewData => reviewData?.game_id === parentData?.id)
    },
    Author: {
        reviews: (parentData) => reviews.filter(reviewData => reviewData?.game_id === parentData?.id)
    },
    Review: {
        author: (parentData) => authors.find(authorData => authorData?.id === parentData?.author_id),
        game: (parentData) => games.find(gameData => gameData?.id === parentData?.game_id)
    },
    /**
     * Add, delete, and update functions
     */
    Mutation: {
        deleteGame: (_, args) => {
            const indexOFGame = games.findIndex(gameData => gameData?.id === args.id);
            if (indexOFGame > -1) games.splice(indexOFGame, 1);
            return games;
        },
        addGame: (_, args) => {
            const newGame = {
                id: Math.floor(Math.random() * 10000)?.toString(),
                ...args.game
            };
            games.push(newGame);
            return newGame;
        },
        editGame: (_, args) => (games.map(gameData => {
            if (gameData.id === args.game.id) {
               if (args.game.platform) gameData.platform = args.game.platform;
               if (args.game.title) gameData.title = args.game.title;
            }
            return gameData;
        }))
    }
};
