import {
  opine,
  OpineRequest,
  GraphQLHTTP,
  makeExecutableSchema,
  gql,
  readAll,
} from "../deps.ts";
import { guarDenoQL } from "../mod.ts";

type Request = OpineRequest & { json: () => Promise<any> };

// RUN COMMAND
// deno run --allow-read --allow-net opine.ts

// const typeDefs = gql`
//   type Query {
//     posts: [Post]
//     post(id: ID!): Post
//   }

//   type Post {
//     id: ID!
//     title: String!
//     related: [Post]
//   }
// `;

// const posts = [{id: "graphql", title: "Learn GraphQL!"}];

// const resolvers = {
//   Query: {
//     posts: () => posts,
//     post: (_, args) => posts.find((post) => post.id === args.id),
//   },
//   Post: {
//     related: () => posts,
//   },
// };

// const petMixin = `
//   name: String!
//   owner: Human!
// `

// const schema = buildSchema(`
//   type Query {
//     user(name: String): Human
//     version: String
//     user1: Human
//     user2: Human
//     user3: Human
//   }

//   type Human {
//     name: String!
//     email: String!
//     address: Address
//     pets: [Pet]
//   }

//   interface Pet {
//     ${petMixin}
//   }

//   type Cat {
//     ${petMixin}
//   }

//   type Dog {
//     ${petMixin}
//   }

//   type Address {
//     street: String
//     number: Int
//     city: String
//     country: String
//   }
// `);

const typeDefs = gql`
  type Query {
    info: String!
    feed: [Link!]!
    link(id: ID!): Link
  }

  type Mutation {
    post(url: String!, description: String!): Link!
    updateLink(id: ID!, url: String, description: String): Link
    deleteLink(id: ID!): Link
  }

  type Link {
    id: ID!
    description: String!
    url: String!
  }
`;
// links stores an array of objects, each obj has 3 props (id, url, description)
// *note: everything is stored in memory rather than a database
let links = [
  {
    id: "link-0",
    url: "www.howtographql.com",
    description: "Fullstack tutorial for GraphQL",
  },
];

// implementation of GraphQL schema
const resolvers = {
  Query: {
    info: () => "This is the API of a Hackernews Clone",
    link: (parent, args) => {
      for (let i = 0; i < links.length; i++) {
        if (links[i].id === args.id) {
          return links[i];
        }
      }
      return null;
    },
    // resolver for the feed root field (resolver must be named exactly after the corresponding field from the schema definition)
    feed: () => links,
  },
  Mutation: {
    // args represents the arguments for the operation!
    post: (parent, args) => {
      // generates a unique id for each link
      let idCount = links.length;
      // creates a new link object
      const link = {
        id: `link-${idCount++}`,
        description: args.description,
        url: args.url,
      };
      // adds the link to the links list
      links.push(link);
      // returns the new link object
      return link;
    },
    updateLink: (parent, args) => {
      for (let i = 0; i < links.length; i++) {
        if (links[i].id === args.id) {
          if (args.url) links[i].url = args.url;
          if (args.description) links[i].description = args.description;
          return links[i];
        }
      }
      return null;
    },
    deleteLink: (parent, args) => {
      for (let i = 0; i < links.length; i++) {
        if (links[i].id === args.id) {
          const delLink = links[i];
          links.splice(i, 1);
          return delLink;
        }
      }
      return null;
    },
  },
  // Link resolvers are unnecessary, because the implementation is trivial!
  // you can remove this entirely...
  Link: {
    id: (parent) => parent.id,
    description: (parent) => parent.description,
    url: (parent) => parent.url,
  },
};

const dec = new TextDecoder();

const schema = makeExecutableSchema({ resolvers, typeDefs });
// const schema = makeExecutableSchema({ typeDefs })

const app = opine();

app
  .use("/graphql", async (req, res) => {
    const request = req as Request;

    request.json = async () => {
      const rawBody = await readAll(req.raw);
      const body = JSON.parse(dec.decode(rawBody));
      const query = body.query;

      // if there were no errors, return the body and let the query run
      const error = guarDenoQL(schema, query, {
        depthLimitOptions: {
          maxDepth: 4,
        },
        costLimitOptions: {
          maxCost: 20,
          mutationCost: 5,
          objectCost: 2,
          scalarCost: 1,
          depthCostFactor: 2,
          ignoreIntrospection: true,
        },
      });

      if (!error.length) {
        return body;
      } else {
        const errorMessage = { error };
        // send the error to the client
        return res.send(JSON.stringify(errorMessage));
      }
    };

    const resp = await GraphQLHTTP<Request>({
      schema,
      context: (request) => ({ request }),
      graphiql: true,
    })(request);

    for (const [k, v] of resp.headers.entries()) res.headers?.append(k, v);

    res.status = resp.status;

    res.send(await resp.text());
  })
  .listen(3000, () => console.log(`☁  Started on http://localhost:3000`));
