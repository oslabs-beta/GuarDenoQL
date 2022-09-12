import { opine, OpineRequest, GraphQLHTTP, makeExecutableSchema, gql, readAll } from '../../deps.ts'
import { depthLimiter, costLimiter } from '../../src/mod.ts'

type Request = OpineRequest & { json: () => Promise<any> }

// RUN COMMAND
// deno run --allow-read --allow-net opine.ts

const typeDefs = gql`
  type Query {
    posts: [Post]
    post(id: ID!): Post
  }
  
  type Post {
    id: ID!
    title: String!
    related: [Post]
  }
`;

const posts = [{id: "graphql", title: "Learn GraphQL!"}];

const resolvers = {
  Query: {
    posts: () => posts,
    post: (_, args) => posts.find((post) => post.id === args.id),
  },
  Post: {
    related: () => posts,
  },
};

const dec = new TextDecoder()

const schema = makeExecutableSchema({ resolvers, typeDefs })

const app = opine()

app
  .use('/graphql', async (req, res) => {
    const request = req as Request

    request.json = async () => {
      const rawBody = await readAll(req.raw)
      const body = JSON.parse(dec.decode(rawBody))
      const query = body.query;
      // run all queries through the depth limit function
      // if the max depth limit is exceeded, an array with error(s) will be returned
      // store the errors array in a variable
      // const error = depthLimiter(schema, query, 2);
      
      // input: options object
        // maxCost (number)
        // mutationCost (number)
        // objectCost (number)
        // scalarCost (number)
        // depthCostFactor (number)
        // ignoreIntrospection
      const error = costLimiter(
        schema, 
        query, 
        {
          maxCost: 1000,
          mutationCost: 5,
          objectCost: 2,
          scalarCost: 1,
          depthCostFactor: 2,
          ignoreIntrospection: true
        }
      );
      // if there were no errors, return the body and let the query run
      if (!error.length) {
        return body;
      } else {
        const errorMessage = { error };
        // send the error to the client
        return res.send(JSON.stringify(errorMessage));
      }
    }

    const resp = await GraphQLHTTP<Request>({ schema, context: (request) => ({ request }), graphiql: true })(request)

    for (const [k, v] of resp.headers.entries()) res.headers?.append(k, v)

    res.status = resp.status
    
    res.send(await resp.text())
  
  })
  .listen(3000, () => console.log(`☁  Started on http://localhost:3000`))