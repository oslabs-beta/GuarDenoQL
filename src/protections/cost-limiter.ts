import {
  Kind,
  ValidationContext,
  GraphQLError,
  ASTNode,
  ASTVisitor,
} from "../../deps.ts";

import {
  getFragments,
  getQueriesAndMutations,
} from "./helper-functions.ts";

import {
  CostLimitOptions,
  QueryInfo,
  ValidationFunc,
  DefinitionNodeObject,
} from "../types.ts";

export function costLimit(options: CostLimitOptions): ValidationFunc {
  return (validationContext: ValidationContext) => {
    const { definitions } = validationContext.getDocument();
    const fragments = getFragments(definitions);
    const queries = getQueriesAndMutations(definitions);

    const queryCostLimit: QueryInfo = {};
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
    const { callback } = options;
    if (callback !== undefined) {
      callback(queryCostLimit);
    }
    return <ASTVisitor>validationContext;
  };
}

function determineCost(
  node: ASTNode,
  fragments: DefinitionNodeObject,
  depth: number,
  options: CostLimitOptions,
  context: ValidationContext,
  operationName: string
): number | undefined {
  const {
    maxCost,
    mutationCost,
    objectCost,
    scalarCost,
    depthCostFactor,
  } = options;

  let cost = scalarCost;

  if (node.kind === Kind.OPERATION_DEFINITION) {
    cost = 0;
    if (node.operation === "mutation") {
      cost = mutationCost;
    }
    if ("selectionSet" in node && node.selectionSet) {
      for (const child of node.selectionSet.selections) {
        const additionalCost = determineCost(
          child,
          fragments,
          depth + 1,
          options,
          context,
          operationName
        );
        if (additionalCost === undefined) {
          return;
        }
        cost += additionalCost;
      }
    }
  }

  if (node.kind === Kind.FIELD && /^__/.test(node.name.value)) {
    return 0;
  }

  if (
    node.kind !== Kind.OPERATION_DEFINITION &&
    "selectionSet" in node &&
    node.selectionSet
  ) {
    cost = objectCost;
    for (const child of node.selectionSet.selections) {
      const additionalCost = determineCost(
        child,
        fragments,
        depth + 1,
        options,
        context,
        operationName
      );
      if (additionalCost === undefined) {
        return;
      }
      cost += depthCostFactor * additionalCost;
    }
  }

  if (node.kind === Kind.FRAGMENT_SPREAD && "name" in node) {
    const fragment = fragments[node.name?.value];
    if (fragment) {
      const additionalCost = determineCost(
        fragment,
        fragments,
        depth + 1,
        options,
        context,
        operationName
      );
      if (additionalCost === undefined) {
        return;
      }
      cost += depthCostFactor * additionalCost;
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