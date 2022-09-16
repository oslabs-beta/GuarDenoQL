import {
  Kind,
  GraphQLError,
  ASTNode,
  ValidationContext,
} from "../../deps.ts";

import {
  ValidationFunc,
  DefinitionNodeObject,
  QueryDepths,
} from "../types.ts";

import {
  getFragments,
  getQueriesAndMutations,
} from "./helper-functions.ts";

// TODO: 
// refactor to give users options about whether they want to ignore introspection queries
// refactor to have users pass in a function to invoke after completion of queryDepths (like a console log) OPTIONAL
export function depthLimit(maxDepth: number): ValidationFunc {
  return (validationContext) => {
    const { definitions } = validationContext.getDocument();
    const fragments: DefinitionNodeObject = getFragments(definitions);
    const queries: DefinitionNodeObject = getQueriesAndMutations(definitions);

    const queryDepths: QueryDepths = {};
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
  node: ASTNode,
  fragments: DefinitionNodeObject,
  depthSoFar: number,
  maxDepth: number,
  context: ValidationContext,
  operationName: string
): number | undefined {
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
      const depthArray = node.selectionSet.selections.map((selection) =>
        determineDepth(
          selection,
          fragments,
          depthSoFar + 1,
          maxDepth,
          context,
          operationName
        )
      );
      if (depthArray.includes(undefined)) {
        return;
      }
      return 1 + Math.max(...<number[]>depthArray);
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
    case Kind.OPERATION_DEFINITION: {
      const depthArray = node.selectionSet.selections.map((selection) =>
        determineDepth(
          selection,
          fragments,
          depthSoFar,
          maxDepth,
          context,
          operationName
        )
      );
      if (depthArray.includes(undefined)) {
        return;
      }
      return Math.max(...<number[]>depthArray);
    }
    default:
      throw new Error("Uh oh! depth crawler cannot handle: " + node.kind);
  }
}
