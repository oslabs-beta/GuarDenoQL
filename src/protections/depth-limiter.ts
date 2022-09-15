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
// refactor to give users options about whether they want to ignore introspection queries
// refactor to have users pass in a function to invoke after completion of queryDepths (like a console log) OPTIONAL
export function depthLimit(maxDepth: number) {
  return (validationContext: ValidationContext) => {
    const { definitions } = validationContext.getDocument();
    const fragments = getFragments(definitions);
    const queries = getQueriesAndMutations(definitions);

    const queryDepths = {};
    for (const name in queries) {
      queryDepths[name] = determineDepth(
        queries[name],
        fragments,
        0,
        maxDepth,
        validationContext,
        name
      );
    }
    // log query depths for all queries except Introspection queries 
    if (!Object.keys(queryDepths).includes("IntrospectionQuery")) {
      console.log("query depths are: ", queryDepths);
    }

    return validationContext;
  };
}

function determineDepth(
  node,
  fragments,
  depthSoFar: number,
  maxDepth: number,
  context,
  operationName
) {
  if (depthSoFar > maxDepth) {
    return context.reportError(
      new GraphQLError(
        `'${operationName}' exceeds maximum operation depth of ${maxDepth}`,
        [node]
      )
    );
  }

  switch (node.kind) {
    case Kind.FIELD: {
      // by default, ignore the introspection fields which begin with double underscores
      const shouldIgnore = /^__/.test(node.name.value);

      if (shouldIgnore || !node.selectionSet) {
        return 0;
      }
      return (
        1 +
        Math.max(
          ...node.selectionSet.selections.map((selection) =>
            determineDepth(
              selection,
              fragments,
              depthSoFar + 1,
              maxDepth,
              context,
              operationName
            )
          )
        )
      );
    }
    case Kind.FRAGMENT_SPREAD:
      return determineDepth(
        fragments[node.name.value],
        fragments,
        depthSoFar,
        maxDepth,
        context,
        operationName
      );
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION:
      return Math.max(
        ...node.selectionSet.selections.map((selection) =>
          determineDepth(
            selection,
            fragments,
            depthSoFar,
            maxDepth,
            context,
            operationName
          )
        )
      );
    default:
      throw new Error("Uh oh! depth crawler cannot handle: " + node.kind);
  }
}
