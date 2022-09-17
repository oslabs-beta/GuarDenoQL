import {
  Source,
  parse,
  validate,
  specifiedRules,
  GraphQLSchema,
} from "../deps.ts";

import {
  depthLimit
} from "./protections/depth-limiter.ts";

import {
  costLimit
} from "./protections/cost-limiter.ts";

export function guarDenoQL(schema: GraphQLSchema, query: string, options) {
  const { depthLimitOptions, costLimitOptions } = options;
  const document = createDocument(query);
  
  if (depthLimitOptions && costLimitOptions) {
    if (!depthLimitOptions.hasOwnProperty("maxDepth")) {
      throw "missing max depth property on depthLimiter!";
    }
    if (checkCostProps(costLimitOptions)) {
      return validate(schema, document, [
        ...specifiedRules,
        depthLimit(depthLimitOptions.maxDepth),
        costLimit(costLimitOptions),
      ]);
    }
  }
  else if (depthLimitOptions) {
    if (!depthLimitOptions.hasOwnProperty("maxDepth")) {
      throw "missing max depth property on depthLimiter!";
    }
    return validate(schema, document, [
      ...specifiedRules,
      depthLimit(depthLimitOptions.maxDepth),
    ]);
  }
  else if (costLimitOptions) {
    if (checkCostProps(costLimitOptions)) {
      return validate(schema, document, [
        ...specifiedRules,
        costLimit(costLimitOptions),
      ]);
    }
  }
  else {
    throw "missing depthLimiter & costLimiter options!";
  }
}

//helper functions to check props on cost
function checkCostProps(costLimiterOptions) {
  const props = [
    "maxCost",
    "mutationCost",
    "objectCost",
    "scalarCost",
    "depthCostFactor"
  ];
  const badPropsArr = props.filter(
    (prop) => !costLimiterOptions.hasOwnProperty(prop)
  );
  if (badPropsArr.length) {
    throw `Error with ${badPropsArr} prop(s) on costLimiter!`;
  } else {
    return true;
  }
};

// helper function to create an ast document
function createDocument(query: string) {
  const source = new Source(query);
  return parse(source);
}