import { Source, parse, Kind, ValidationContext, GraphQLError, buildSchema } from '../../deps.ts';

const petMixin = `
  name: String!
  owner: Human!
`

const schema = buildSchema(`
  type Query {
    user(name: String): Human
    version: String
    user1: Human
    user2: Human
    user3: Human
  }
  type Human {
    name: String!
    email: String!
    address: Address
    pets: [Pet]
  }
  interface Pet {
    ${petMixin}
  }
  type Cat {
    ${petMixin}
  }
  type Dog {
    ${petMixin}
  }
  type Address {
    street: String
    number: Int
    city: String
    country: String
  }
`)

// const query = `
//   query read0 {
//     version
//   }
//   query read1 {
//     version
//     user {
//       name
//     }
//   }
//   query read2 {
//     matt: user(name: "matt") {
//       email
//     }
//     andy: user(name: "andy") {
//       email
//       address {
//         city
//       }
//     }
//   }
//   query read3 {
//     matt: user(name: "matt") {
//       email
//     }
//     andy: user(name: "andy") {
//       email
//       address {
//         city
//       }
//       pets {
//         name
//         owner {
//           name
//         }
//       }
//     }
//   }
//   `


const query = `
    query read0 {
      ... on Query {
        version
      }
    }
    query read1 {
      version
      user {
        ... on Human {
          name
        }
      }
    }
    fragment humanInfo on Human {
      email
    }
    fragment petInfo on Pet {
      name
      owner {
        name
      }
    }
    query read2 {
      matt: user(name: "matt") {
        ...humanInfo
      }
      andy: user(name: "andy") {
        ...humanInfo
        address {
          city
        }
      }
    }
    query read3 {
      matt: user(name: "matt") {
        ...humanInfo
      }
      andy: user(name: "andy") {
        ... on Human {
          email
        }
        address {
          city
        }
        pets {
          ...petInfo
        }
      }
    }
  `



// COMMAND TO RUN: deno run --allow-net --unstable test-limit.js

// Changes made from the original node version:
// removed options and callback as parameters
// removed seeIfIgnored function


// Calls the depth limit function with the hardcoded schema and query already defined above
depthLimit(2, query, schema);
// if you change the maxDepth variable above, an error will occur if the max depth is less than what is asked for in the query
// in this example, if you change it to 2, an error will occur. 3 or higher, and no errors will occur.

// have tested it with fragment and non-fragment queries so far, both work (see above for both)

// question: do we even need validation context?

function depthLimit(maxDepth, query, schema) {
  console.log('max depth is: ', maxDepth)
  const documentAST = parse(new Source(query));
  const validationContext = new ValidationContext(schema, documentAST);
  // console.log('Validation context is: ', validationContext);
  const { definitions } = documentAST;
  const fragments = getFragments(definitions);
  // console.log('fragments are: ', fragments);
  const queries = getQueriesAndMutations(definitions);
  // console.log('queries are: ', queries);
  const queryDepths = {};
  for (let name in queries) {
    // console.log('name is: ', name);
    queryDepths[name] = determineDepth(queries[name], fragments, 0, maxDepth, validationContext, name)
  }
  console.log('query depths are: ', queryDepths);
  // console.log('validation context is: ', validationContext);
  return validationContext;
}

function getFragments(definitions) {
  return definitions.reduce((map, definition) => {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      map[definition.name.value] = definition
    }
    return map
  }, {})
}

// this will actually get both queries and mutations. we can basically treat those the same
function getQueriesAndMutations(definitions) {
  return definitions.reduce((map, definition) => {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      map[definition.name ? definition.name.value : ''] = definition
    }
    return map
  }, {})
}

function determineDepth(node, fragments, depthSoFar, maxDepth, context, operationName) {
  if (depthSoFar > maxDepth) {
    // ERROR code that wasn't working: 
    // return context.reportError(
    //   new GraphQLError(`'${operationName}' exceeds maximum operation depth of ${maxDepth}`, [node])
    // )

    // New error handling I added for now
    throw 'Maximum depth exceeded!';
  }

  switch (node.kind) {
    case Kind.FIELD:
      {
        // by default, ignore the introspection fields which begin with double underscores
        const shouldIgnore = /^__/.test(node.name.value)

        if (shouldIgnore || !node.selectionSet) {
          return 0
        }
        return 1 + Math.max(...node.selectionSet.selections.map(selection =>
          determineDepth(selection, fragments, depthSoFar + 1, maxDepth, context, operationName)
        ))
      }
    case Kind.FRAGMENT_SPREAD:
      return determineDepth(fragments[node.name.value], fragments, depthSoFar, maxDepth, context, operationName)
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION:
      return Math.max(...node.selectionSet.selections.map(selection =>
        determineDepth(selection, fragments, depthSoFar, maxDepth, context, operationName)
      ))
    /* istanbul ignore next */
    default:
      throw new Error('uh oh! depth crawler cannot handle: ' + node.kind)
  }
}