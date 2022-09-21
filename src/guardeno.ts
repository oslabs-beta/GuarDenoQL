import {
  Source,
  parse,
  validate,
  specifiedRules,
  GraphQLSchema,
} from "../deps.ts";

import { depthLimit } from "./protections/depth-limiter.ts";

import { costLimit } from "./protections/cost-limiter.ts";

import { GuarDenoOptions, CostLimitOptions } from "./types.ts";

// merged the depthLimiter and costLimiter into a single function
export function guarDenoQL(
  schema: GraphQLSchema,
  query: string,
  options: GuarDenoOptions
  ) {
  const { depthLimitOptions, costLimitOptions } = options;
  const document = createDocument(query);

  if (depthLimitOptions && costLimitOptions) {
    if (depthLimitOptions.maxDepth === undefined) {
      throw "Missing max depth property on depthLimiter!";
    }
    if (checkCostProps(costLimitOptions)) {
      return validate(schema, document, [
        ...specifiedRules,
        depthLimit(depthLimitOptions.maxDepth, depthLimitOptions.callback),
        costLimit(costLimitOptions),
      ]);
    }
  } else if (depthLimitOptions) {
    if (depthLimitOptions.maxDepth === undefined) {
      throw "Missing max depth property on depthLimiter!";
    }
    return validate(schema, document, [
      ...specifiedRules,
      depthLimit(depthLimitOptions.maxDepth, depthLimitOptions.callback),
    ]);
  } else if (costLimitOptions) {
    if (checkCostProps(costLimitOptions)) {
      return validate(schema, document, [
        ...specifiedRules,
        costLimit(costLimitOptions),
      ]);
    }
  } else {
    throw "Missing depthLimiter & costLimiter options!";
  }
}

// helper function to determine if the correct properties of costLimiterOptions are provided
function checkCostProps(costLimiterOptions: CostLimitOptions) {
  const props = [
    "maxCost",
    "mutationCost",
    "objectCost",
    "scalarCost",
    "depthCostFactor",
  ];

  const badPropsArr = props.filter(
    (prop) => !Object.prototype.hasOwnProperty.call(costLimiterOptions, prop)
  );

  if (badPropsArr.length) {
    throw `Error with ${badPropsArr} prop(s) on costLimiter!`;
  } else {
    return true;
  }
}

// given a GraphQL source, the function parses the source into an AST, which represents a GraphQL document in a type-safe, machine-readable format
function createDocument(query: string) {
  const source = new Source(query);
  return parse(source);
}