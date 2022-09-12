import { Source, parse, Kind, ValidationContext, GraphQLError, buildSchema, validate, specifiedRules, NullValueNode, GraphQLSchema, DefinitionNode } from '../deps.ts'

type Maybe<T> = T | null | undefined;


// TODO: 
// Depth-limiter invokes the determineDepth function passing in each query/mutation from the queries array
// Cost-limiter only takes in the root node and recursively determines the cost of the query/mutation of that query
// What is the difference between these two approaches? 

// QUESTIONS:
// Do we want to integrate all of our functionality into one method OR have the user invoke seperate methods

// refactor to give users options about whether they want to ignore introspection queries
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
    //to ignore introScpect Queries from constantly spamming terminal
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

// Note: should the query itself count as an object?
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
      queryCostLimit[name] = determineCost(queries[name], fragments, 0, options, validationContext, name);
    }
    console.log(queryCostLimit);
    return validationContext;
  } 
}

function determineCost(node, fragments, depth, options, context, operationName) {
  
  const {maxCost, mutationCost, objectCost, scalarCost, depthCostFactor, ignoreIntrospection} = options;

  let cost = scalarCost;


  // let mutation = false;
  // console.log('Is the name prop in node?', 'name' in node);
  // console.log('node.name is:', node.name);
  // console.log('node.name.value is:', node.name?.value);
  if (node.kind === Kind.OPERATION_DEFINITION) {
    cost = 0;
    // TODO: if it's a mutation, add in the cost for mutation
    if ('selectionSet' in node && node.selectionSet) {
      for (let child of node.selectionSet.selections) {
        cost += determineCost(child, fragments, depth + 1, options, context, operationName);
      }
    }
  }

  if (ignoreIntrospection && node.name !== undefined && /^__/.test(node.name?.value)) {
    //console.log('is this reached? introspec');
    return 0;
  }

  // if ('operation' in node && node.operation === 'mutation') {
  //   mutation = true;
  //   cost = mutationCost;
  // } 

  if (node.kind !== Kind.OPERATION_DEFINITION && 'selectionSet' in node && node.selectionSet) {
    // console.log('Is selection set reached?');
    // console.log('The selection set is:', node.selectionSet);
    // if (!mutation) {
    //   cost = objectCost;
    // }
    cost = objectCost;
    for (let child of node.selectionSet.selections) {
      cost += depthCostFactor * determineCost(child, fragments, depth + 1, options, context, operationName);
    }
  }

  if (node.kind === Kind.FRAGMENT_SPREAD && 'name' in node) {
    const fragment = fragments[node.name?.value];
    //needs to test 
    if (fragment) {
      cost += depthCostFactor * determineCost(fragment, fragments, depth + 1, options, context, operationName);
    }
  }

  if (cost > maxCost){
    return context.reportError(
      new GraphQLError(`'${operationName}' exceeds maximum operation cost of ${maxCost}`, [node])
    )
  }

  // console.log(`THE NODE.NAME.VALUE IS: ${node.name.value} \nTHE COST IS: ${cost}`);
  console.log('The node.kind is:', node.kind);
  console.log('The for this node is:', cost);

  return cost;
}

export function costLimiter(schema: GraphQLSchema, query: string, options) {
  const document = createDocument(query);
  return validate(schema, document, [...specifiedRules, costLimit(options)]);
}
