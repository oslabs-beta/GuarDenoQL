import { opine, OpineRequest, GraphQLHTTP, makeExecutableSchema, gql, readAll } from '../deps.ts'
import { depthLimiter } from '../mod.ts'

type Request = OpineRequest & { json: () => Promise<any> }

// RUN COMMAND
// deno run --allow-read --allow-net demo.ts

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
      const error = depthLimiter(schema, query, 2);
      if (!error.length) {
        return body;
      } else {
        const errorMessage = { error };
        return res.send(JSON.stringify(errorMessage));
      }
    }

    const resp = await GraphQLHTTP<Request>({ schema, context: (request) => ({ request }), graphiql: true })(request)

    for (const [k, v] of resp.headers.entries()) res.headers?.append(k, v)

    res.status = resp.status

    res.send(await resp.text())
  })
  .listen(3000, () => console.log(`☁  Started on http://localhost:3000`))

  // request.json = async () => {
    //   const rawBody = await readAll(req.raw)
    //   const body = JSON.parse(dec.decode(rawBody))
    //   const query = body.query;
    //   const error = depthLimiter(schema, query, 2);
    //   if (!error.length) {
    //     return body;
    //   } else {
    //     const errorMessage = { error };
    //     return res.send(JSON.stringify(errorMessage));
    //   }
    // }