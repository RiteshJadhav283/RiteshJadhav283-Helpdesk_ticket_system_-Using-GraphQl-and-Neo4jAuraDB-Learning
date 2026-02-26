import {ApolloServer} from "@apollo/server";
import {startStandaloneServer} from "@apollo/server/standalone";
import neo4j from "neo4j-driver";
import {Neo4jGraphQL} from "@neo4j/graphql";
import dotenv from "dotenv";
import {typeDefs} from "./Controller/typeDefs.js";
import {resolvers} from './Controller/resolvers.js'

dotenv.config();

const server= new ApolloServer({typeDefs,resolvers})

const {url} = await startStandaloneServer(server,{listen:{port:6767},});

console.log(`server ${url}`)