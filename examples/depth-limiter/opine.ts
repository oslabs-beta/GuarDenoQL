import { opine, OpineRequest } from 'https://deno.land/x/opine@2.2.0/mod.ts'
import { GraphQLHTTP } from 'https://deno.land/x/gql@1.1.2/mod.ts'
import { makeExecutableSchema } from 'https://deno.land/x/graphql_tools@0.0.2/mod.ts'
import { gql } from 'https://deno.land/x/graphql_tag@0.0.1/mod.ts'
import { readAll } from 'https://deno.land/std@0.148.0/streams/conversion.ts'
// import { Source, parse, Kind, ValidationContext, GraphQLError, buildSchema, validate, specifiedRules } from 'https://deno.land/x/graphql_deno@v15.0.0/mod.ts';
import { depthLimiter } from '../../src/mod.ts'

type Request = OpineRequest & { json: () => Promise<any> }

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
      const error = depthLimiter(schema, query, 2);
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

    // const response = await resp.text();
    // console.log(response)
    
    res.send(await resp.text())
    // res.send(response);
  })
  .listen(3000, () => console.log(`☁  Started on http://localhost:3000`))



  // function depthLimit(maxDepth) {
  //   return (validationContext) => {
  //     console.log('max depth is: ', maxDepth)
  //     // const documentAST = parse(new Source(query));
  //     // const validationContext = new ValidationContext(schema, documentAST);
  //     // console.log('Validation context is: ', validationContext);
  //     const { definitions } = validationContext.getDocument();
  //     const fragments = getFragments(definitions);
  //     // console.log('fragments are: ', fragments);
  //     const queries = getQueriesAndMutations(definitions);
  //     // console.log('queries are: ', queries);
  //     const queryDepths = {};
  //     for (let name in queries) {
  //       // console.log('name is: ', name);
  //       queryDepths[name] = determineDepth(queries[name], fragments, 0, maxDepth, validationContext, name)
  //     }
  //     console.log('query depths are: ', queryDepths);
  //     // console.log('validation context is: ', validationContext);
  //     return validationContext;
  //   }
  // }
  
  // function getFragments(definitions) {
  //   return definitions.reduce((map, definition) => {
  //     if (definition.kind === Kind.FRAGMENT_DEFINITION) {
  //       map[definition.name.value] = definition
  //     }
  //     return map
  //   }, {})
  // }
  
  // // this will actually get both queries and mutations. we can basically treat those the same
  // function getQueriesAndMutations(definitions) {
  //   return definitions.reduce((map, definition) => {
  //     if (definition.kind === Kind.OPERATION_DEFINITION) {
  //       map[definition.name ? definition.name.value : ''] = definition
  //     }
  //     return map
  //   }, {})
  // }
  
  // function determineDepth(node, fragments, depthSoFar, maxDepth, context, operationName) {
  //   if (depthSoFar > maxDepth) {
  //     // ERROR code that wasn't working: 
  //     return context.reportError(
  //       new GraphQLError(`'${operationName}' exceeds maximum operation depth of ${maxDepth}`, [node])
  //     )
  
  //     // New error handling I added for now
  //     // throw 'Maximum depth exceeded!';
  //   }
  
  //   switch (node.kind) {
  //     case Kind.FIELD:
  //       {
  //         // by default, ignore the introspection fields which begin with double underscores
  //         const shouldIgnore = /^__/.test(node.name.value)
  
  //         if (shouldIgnore || !node.selectionSet) {
  //           console.log('shouldIgnore', shouldIgnore);
  //           return 0
  //         }
  //         return 1 + Math.max(...node.selectionSet.selections.map(selection =>
  //           determineDepth(selection, fragments, depthSoFar + 1, maxDepth, context, operationName)
  //         ))
  //       }
  //     case Kind.FRAGMENT_SPREAD:
  //       return determineDepth(fragments[node.name.value], fragments, depthSoFar, maxDepth, context, operationName)
  //     case Kind.INLINE_FRAGMENT:
  //     case Kind.FRAGMENT_DEFINITION:
  //     case Kind.OPERATION_DEFINITION:
  //       return Math.max(...node.selectionSet.selections.map(selection =>
  //         determineDepth(selection, fragments, depthSoFar, maxDepth, context, operationName)
  //       ))
  //     /* istanbul ignore next */
  //     default:
  //       throw new Error('uh oh! depth crawler cannot handle: ' + node.kind)
  //   }
  // }
  
  
  // // helper functions
  // function createDocument(query) {
  //   const source = new Source(query);
  //   return parse(source);
  // }
  
  // // idea:
  // // main 'middelware' function, depthLimiter
  // // invokes the validate function, passing in the schema, document from the query, and an array with specified rules (imported), and the invocation of the depthLimit function, passing in the person's desired maxDepth
  // function depthLimiter(schema, query, maxDepth) {
  //   const document = createDocument(query);
  //   return validate(schema, document, [...specifiedRules, depthLimit(maxDepth)]);
  // }