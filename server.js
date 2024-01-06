import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
// import { startStandaloneServer } from "@apollo/server/standalone";
import bodyParser from 'body-parser';
import express from "express";
import { createServer } from "http";
import { resolvers } from "./resolvers.js";
import { typeDefs } from "./typeDefs.js";

const app = express();
const httpServer = createServer(app);

/**
 * Set and configure the server
 */
const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer })
    ]
});

await apolloServer.start();
app.use("/", bodyParser.json(), expressMiddleware(apolloServer));

/**
 * Start the server
 */
// const { url } = await startStandaloneServer(server, {
//     listen: {
//         port: 4000
//     }
// });

// console.log("url", url);

httpServer.listen(3000, () => {
    console.log("http://localhost:3000/");
});
