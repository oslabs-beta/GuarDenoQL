import { Server, GraphQLHTTP, makeExecutableSchema, gql, readAll } from '../../deps.ts'

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

const schema = makeExecutableSchema({ resolvers, typeDefs })

const dec = new TextDecoder()

const s = new Server({
  handler: async (req) => {``
    const {pathname} = new URL(req.url)

    // req.json = async () => {
    //   const rawBody = await readAll(req.raw)
    //   const body = JSON.parse(dec.decode(rawBody))
    //   return body;
    // }

    if (pathname === '/graphql') {
      return await GraphQLHTTP({schema, graphiql: true})(req)
    } else {
      return new Response('Not Found', { status: 404})
    }
  },
  port: 3000
})

s.listenAndServe()

console.log(`☁  Started on http://localhost:3000`)