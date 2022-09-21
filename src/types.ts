import { DefinitionNode, ValidationContext, ASTVisitor } from "../deps.ts";

export type DefinitionNodeObject = {
  [key: string]: DefinitionNode;
};

export type QueryInfo = {
  [key: string]: number | undefined;
};

export interface ValidationFunc {
  (arg0: ValidationContext): ASTVisitor;
}

export type CostLimitOptions = {
  maxCost: number;
  mutationCost: number;
  objectCost: number;
  scalarCost: number;
  depthCostFactor: number;
  callback?: (arg0: QueryInfo) => any;
};

export type DepthLimitOptions = {
  maxDepth: number;
  callback?: (arg0: QueryInfo) => any;
};

export type GuarDenoOptions = {
  depthLimitOptions?: DepthLimitOptions;
  costLimitOptions?: CostLimitOptions;
};
