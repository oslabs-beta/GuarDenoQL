import { Server } from 'https://deno.land/std@0.148.0/http/server.ts'
import { GraphQLHTTP } from 'https://deno.land/x/gql@1.1.2/mod.ts'
import { makeExecutableSchema } from 'https://deno.land/x/graphql_tools@0.0.2/mod.ts'
import { gql } from 'https://deno.land/x/graphql_tag@0.0.1/mod.ts'
import { readAll } from 'https://deno.land/std@0.148.0/streams/conversion.ts'

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

// SERVER: http://localhost:3000/graphql

// EXAMPLE NESTED QUERY
// query {
//   posts {
//     id
//     title
//     related {
//       id
//       title
//       related {
//         id
//         title
//         related {
//           id
//           title
//           related {
//             id
//             title
//             related {
//               id
//               title
//               related {
//                 id
//                 title
//                 related {
//                   id
//                   title
//                   related {
//                     id
//                     title
//                     related {
//                       id
//                       title
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   }
// }