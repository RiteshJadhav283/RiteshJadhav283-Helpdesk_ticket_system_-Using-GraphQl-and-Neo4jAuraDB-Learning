'use strict';
require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { sequelize } = require('./models');

async function bootstrap() {
    // Authenticate DB connection
    await sequelize.authenticate();
    console.log('✅  PostgreSQL connected.');

    // Sync models (creates tables if they don't exist)
    // Use { alter: true } in dev so schema changes are applied automatically
    const syncOptions = process.env.NODE_ENV === 'test'
        ? { force: true }  // fresh DB every test run
        : { alter: true };

    await sequelize.sync(syncOptions);
    console.log('✅  Database synced.');

    // Build Apollo server
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        formatError: (formattedError, error) => {
            console.error('GraphQL Error:', formattedError.message);
            return formattedError;
        },
    });

    const port = parseInt(process.env.PORT, 10) || 4000;
    const { url } = await startStandaloneServer(server, {
        listen: { port },
        context: async ({ req }) => ({
            // Extend context here for auth/middleware in future
            headers: req.headers,
        }),
    });

    console.log(`🚀  GraphQL API ready at ${url}`);
}

bootstrap().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
