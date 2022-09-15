import {
  Source,
  parse,
  validate,
  specifiedRules,
  GraphQLSchema,
} from "../deps.ts";

export function guarDenoQL(schema: GraphQLSchema, query: string, options) {
  const { depthLimitOptions, costLimitOptions } = options;
  const document = createDocument(query);
  // if depthLimiter is truthy AND costLimiter is truthy
  if (depthLimitOptions && costLimitOptions) {
    // if depthLimiter DOESN'T have maxDepth prop, throw an error
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
  // else if depthLimiter is truthy
  else if (depthLimitOptions) {
    if (!depthLimitOptions.hasOwnProperty("maxDepth")) {
      throw "missing max depth property on depthLimiter!";
    }
    return validate(schema, document, [
      ...specifiedRules,
      depthLimit(depthLimitOptions.maxDepth),
    ]);
  }
  // else if costLimiter is truthy
  else if (costLimitOptions) {
    if (checkCostProps(costLimitOptions)) {
      return validate(schema, document, [
        ...specifiedRules,
        costLimit(costLimitOptions),
      ]);
    }
  }
  // else error
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
    "depthCostFactor",
    "ignoreIntrospection",
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