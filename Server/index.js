require('dotenv').config();

const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const schema = require('./schema');
const resolvers = require('./resolvers');

const app = express();
const port = process.env.PORT || 4000;

mongoose.connect(process.env.DATABASE_URL);

mongoose.connection.on('error', (error) => {
    console.error('Database error:', error);
});

mongoose.connection.once('connected', () => {
    console.log('GraphQL Server - Database Connected...');
});

app.use(cors());

function getUser(req){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return null;

    try{
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
}

app.use('/graphql', graphqlHTTP((req) => ({

    schema,
    rootValue: resolvers,
    context: {user: getUser(req)},
    graphiql: true,

})));

app.listen(port, () => {
    console.log(`GraphQL Server corriendo en http://localhost:${port}/graphql`);
    console.log(`GraphiQL disponible en http://localhost:${port}/graphql`);
})