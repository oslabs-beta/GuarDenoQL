import {
  Kind,
  GraphQLError,
  ASTNode,
  ValidationContext,
} from "../../deps.ts";

import {
  ValidationFunc,
  DefinitionNodeObject,
  QueryInfo,
} from "../types.ts";

import {
  getFragments,
  getQueriesAndMutations,
} from "./helper-functions.ts";

export function depthLimit(maxDepth: number): ValidationFunc {
  return (validationContext) => {
    const { definitions } = validationContext.getDocument();
    const fragments: DefinitionNodeObject = getFragments(definitions);
    const queries: DefinitionNodeObject = getQueriesAndMutations(definitions);

    const queryDepths: QueryInfo = {};
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
