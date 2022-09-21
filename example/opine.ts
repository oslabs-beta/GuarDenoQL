import { opine, OpineRequest } from "https://deno.land/x/opine@2.2.0/mod.ts";
import { GraphQLHTTP } from "https://deno.land/x/gql@1.1.2/mod.ts";
import { makeExecutableSchema } from "https://deno.land/x/graphql_tools@0.0.2/mod.ts";
import { gql } from "https://deno.land/x/graphql_tag@0.0.1/mod.ts";
import { readAll } from "https://deno.land/std@0.148.0/streams/conversion.ts";

import { guarDenoQL } from "../mod.ts";

type Request = OpineRequest & { json: () => Promise<any> };

// RUN COMMAND
// deno run --allow-read --allow-net example/opine.ts

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

const posts = [{ id: "graphql", title: "Learn GraphQL!" }];

const resolvers = {
  Query: {
    posts: () => posts,
    post: (_parent: any, args: { id: string }) =>
      posts.find((post) => post.id === args.id),
  },
  Post: {
    related: () => posts,
  },
};

const dec = new TextDecoder();

const schema = makeExecutableSchema({ resolvers, typeDefs });

const app = opine();

app
  .use("/graphql", async (req, res) => {
    const request = req as Request;

    request.json = async () => {
      const rawBody = await readAll(req.raw);
      const body = JSON.parse(dec.decode(rawBody));
      const query = body.query;

      const error = guarDenoQL(schema, query, {
        // customize depth limiter options
        depthLimitOptions: {
          maxDepth: 2,
          callback: (args) => console.log("query depth is:", args),
        },
        // customize cost Limiter options
        costLimitOptions: {
          maxCost: 5,
          mutationCost: 5,
          objectCost: 2,
          scalarCost: 1,
          depthCostFactor: 1.5,
          callback: (args) => console.log("query cost is:", args),
        },
      });

      if (error !== undefined && !error.length) {
        return body;
      } else {
        const errorMessage = { error };
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
