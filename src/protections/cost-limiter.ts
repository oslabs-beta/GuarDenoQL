import {
  Kind,
  ValidationContext,
  GraphQLError,
} from "../../deps.ts";

import {
  getFragments,
  getQueriesAndMutations,
} from "./helper-functions.ts";

// TODO:
// refactor to have users pass in a function to invoke after completion of queryDepths (like a console log) OPTIONAL

// input: options object
  // maxCost (number)
  // mutationCost (number)
  // objectCost (number)
  // scalarCost (number)
  // depthCostFactor (number)
  // ignoreIntrospection
// output: function that takes ValidationContext object as an arg and returns out a ValidationContext
function costLimit(options) {
  return (validationContext: ValidationContext) => {
    const { definitions } = validationContext.getDocument();
    const fragments = getFragments(definitions);
    const queries = getQueriesAndMutations(definitions);

    const queryCostLimit = {};
    for (const name in queries) {
      queryCostLimit[name] = determineCost(
        queries[name],
        fragments,
        0,
        options,
        validationContext,
        name
      );
    }

    // log query depths for all queries except Introspection queries 
    if (!Object.keys(queryCostLimit).includes("IntrospectionQuery")) {
      console.log("query costs are: ", queryCostLimit);
    }
    
    return validationContext;
  };
}

function determineCost(
  node,
  fragments,
  depth,
  options,
  context,
  operationName
) {
  const {
    maxCost,
    mutationCost,
    objectCost,
    scalarCost,
    depthCostFactor,
    ignoreIntrospection,
  } = options;

  let cost = scalarCost;

  if (node.kind === Kind.OPERATION_DEFINITION) {
    cost = 0;
    if (node.operation === "mutation") {
      cost = mutationCost;
    }

    if ("selectionSet" in node && node.selectionSet) {
      for (const child of node.selectionSet.selections) {
        cost += determineCost(
          child,
          fragments,
          depth + 1,
          options,
          context,
          operationName
        );
      }
    }
  }

  if (
    ignoreIntrospection &&
    node.name !== undefined &&
    /^__/.test(node.name?.value)
  ) {
    return 0;
  }

  if (
    node.kind !== Kind.OPERATION_DEFINITION &&
    "selectionSet" in node &&
    node.selectionSet
  ) {
    cost = objectCost;
    for (const child of node.selectionSet.selections) {
      cost +=
        depthCostFactor *
        determineCost(
          child,
          fragments,
          depth + 1,
          options,
          context,
          operationName
        );
    }
  }

  if (node.kind === Kind.FRAGMENT_SPREAD && "name" in node) {
    const fragment = fragments[node.name?.value];
    if (fragment) {
      cost +=
        depthCostFactor *
        determineCost(
          fragment,
          fragments,
          depth + 1,
          options,
          context,
          operationName
        );
    }
  }

  if (cost > maxCost) {
    return context.reportError(
      new GraphQLError(
        `'${operationName}' exceeds maximum operation cost of ${maxCost}`,
        [node]
      )
    );
  }

  return cost;
}