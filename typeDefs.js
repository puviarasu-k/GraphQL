/**
 * Query type is not optional, Every GraphQL server must have it.
 * Type is used to represent a kind of object you can fetch from your service, and what fields it has
 */

export const typeDefs = `#graphql
    type Game {
        id: ID!
        title: String!
        platform: [String!]!
        reviews: [Review]
    }
    type Review {
        id: ID!
        rating: Int!
        content: String!
        author_id: String!
        game_id: String!
        game: Game
        author: Author
    }
    type Author {
        id: ID!
        name: String!
        verified: Boolean!
        author: Author!
        reviews: [Review]
    }
    type Query {
        games: [Game]
        authors: [Author]
        reviews: [Review]

        getGameById(id:ID): Game
        getAuthorById(id:ID): Author
        getReviewById(id:ID): Review

        helloWorld: String
    }
    type Mutation {
        deleteGame(id:ID!): [Game]
        addGame(game:AddGameInput!): Game
        editGame(game:EditGameInput!): [Game]
    }
    input AddGameInput {
        title: String!
        platform: [String!]!
    }
    input EditGameInput {
        id: ID!
        title: String
        platform: [String!]
    }
`