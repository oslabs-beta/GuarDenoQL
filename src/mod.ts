import { Source, parse, Kind, ValidationContext, GraphQLError, buildSchema, validate, specifiedRules, NullValueNode, GraphQLSchema, DefinitionNode } from '../deps.ts'

type Maybe<T> = T | null | undefined;


function depthLimit(maxDepth: number) {
  return (validationContext: ValidationContext) => {
    // console.log('max depth is: ', maxDepth)
    // const documentAST = parse(new Source(query));
    // const validationContext = new ValidationContext(schema, documentAST);
    // console.log('Validation context is: ', validationContext);
    const { definitions } = validationContext.getDocument();
    const fragments = getFragments(definitions);
    // console.log('fragments are: ', fragments);
    const queries = getQueriesAndMutations(definitions);
    console.log('queries are: ', queries);
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

function getFragments(definitions: ReadonlyArray<DefinitionNode>) {
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
function createDocument(query: string) {
  const source = new Source(query);
  return parse(source);
}

// idea:
// main 'middelware' function, depthLimiter
// invokes the validate function, passing in the schema, document from the query, and an array with specified rules (imported), and the invocation of the depthLimit function, passing in the person's desired maxDepth
export function depthLimiter(schema: GraphQLSchema, query: string, maxDepth: number) {
  const document = createDocument(query);
  return validate(schema, document, [...specifiedRules, depthLimit(maxDepth)]);
}

// input: options object
  // maxCost (number)
  // mutationCost (number)
  // objectCost (number)
  // scalarCost (number)
  // depthCostFactor (number)
  // ignoreIntrospection
// output: function that takes ValidationContext object as an arg and returns out a ValidationContext
function costLimit(options) {
  return (validationContext) => {
    const { definitions } = validationContext.getDocument();
    const fragments = getFragments(definitions);
    const queries = getQueriesAndMutations(definitions);
    const queryCostLimit = {};
    for (const name in queries) {
      queryCostLimit[name] = determineCost(queries[name], fragments, 0, 0, options, validationContext, name);
    }
    // { maxCost } = options;
    // Object.entries(queryCostLimit).forEach((entry) => {
    //   if (entry[1] > maxCost) {
    //     validationContext.reportError(
    //       new GraphQLError(`'${entry[0]}' exceeds maximum operation cost of ${maxCost}`, [queries[entry[0]]])
    //     );
    //   }
    // });
    return validationContext;
  } 
}

function determineCost(node, fragments, depth, options, context, operationName) {
  
  const {maxCost, mutationCost, objectCost, scalarCost, depthCostFactor, ignoreIntrospection} = options;

  // if (costSoFar > maxCost){
  //   return context.reportError(
  //     new GraphQLError(`'${operationName}' exceeds maximum operation cost of ${maxCost}`, [node])
  //   )
  // }

  let cost = scalarCost;
  let mutation = false;

  if (ignoreIntrospection && 'name' in node && /^__/.test(node.name.value)) {
    return 0;
  }

  if ('operation' in node && node.operation === 'mutation') {
    mutation = true;
    cost = mutationCost;
  } 

  if ('selectionSet' in node && node.selectionSet) {
    if (!mutation) {
      cost = objectCost;
    }
    for (let child of node.selectionSet.selections) {
      cost += depthCostFactor * determineCost(child, fragments, depth + 1, options, context, operationName);
    }
  }

  if (node.kind === Kind.FRAGMENT_SPREAD && 'name' in node) {
    const fragment = fragments[node.name?.value];
    if (fragment) {
      cost += depthCostFactor * determineCost(fragment, fragments, depth + 1, options, context, operationName);
    }
  }

  return cost;
}


export function costLimiter(schema: GraphQLSchema, query: string, options) {
  const document = createDocument(query);
  return validate(schema, document, [...specifiedRules, costLimit(options)]);
}