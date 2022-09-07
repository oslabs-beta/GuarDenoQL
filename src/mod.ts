import { Source, parse, Kind, ValidationContext, GraphQLError, buildSchema, validate, specifiedRules, NullValueNode } from 'https://deno.land/x/graphql_deno@v15.0.0/mod.ts';

type Maybe<T> = T | null | undefined;


function depthLimit(maxDepth: number) {
  return (validationContext<T>) => {
    // console.log('max depth is: ', maxDepth)
    // const documentAST = parse(new Source(query));
    // const validationContext = new ValidationContext(schema, documentAST);
    // console.log('Validation context is: ', validationContext);
    const { definitions } = validationContext.getDocument();
    const fragments = getFragments(definitions);
    // console.log('fragments are: ', fragments);
    const queries = getQueriesAndMutations(definitions);
    // console.log('queries are: ', queries);
    const queryDepths = {};
    for (const name in queries) {
      // console.log('name is: ', name);
      queryDepths[name] = determineDepth(queries[name], fragments, 0, maxDepth, validationContext, name)
    }
    if (!Object.keys(queryDepths).includes('IntrospectionQuery')) {
      console.log('query depths are: ', queryDepths);
    }
    // console.log('validation context is: ', validationContext);
    return validationContext;
  }
}

function getFragments(definitions: Array<{kind: string, name: {value: string}}>) {
  return definitions.reduce((map, definition) => {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      map[definition.name.value] = definition
    }
    return map
  }, {})
}

// this will actually get both queries and mutations. we can basically treat those the same
function getQueriesAndMutations(definitions: Array<{kind: string, name: string {value: string}}>) {
  return definitions.reduce((map, definition) => {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      map[definition.name ? definition.name.value : ''] = definition
    }
    return map
  }, {})
}

function determineDepth(node, fragments, depthSoFar: number, maxDepth: number, context, operationName) {
  if (depthSoFar > maxDepth) {
    // ERROR code that wasn't working: 
    return context.reportError(
      new GraphQLError(`'${operationName}' exceeds maximum operation depth of ${maxDepth}`, [node])
    )

    // New error handling I added for now
    // throw 'Maximum depth exceeded!';
  }

  switch (node.kind) {
    case Kind.FIELD:
      {
        // by default, ignore the introspection fields which begin with double underscores
        const shouldIgnore = /^__/.test(node.name.value)

        if (shouldIgnore || !node.selectionSet) {
          // console.log('shouldIgnore', shouldIgnore);
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


// helper functions
function createDocument(query) {
  const source = new Source(query);
  return parse(source);
}

// idea:
// main 'middelware' function, depthLimiter
// invokes the validate function, passing in the schema, document from the query, and an array with specified rules (imported), and the invocation of the depthLimit function, passing in the person's desired maxDepth
export function depthLimiter(schema, query, maxDepth: number) {
  const document = createDocument(query);
  return validate(schema, document, [...specifiedRules, depthLimit(maxDepth)]);
}