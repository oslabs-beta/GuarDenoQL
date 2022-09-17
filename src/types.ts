
import {
  DefinitionNode,
  ValidationContext,
  ASTVisitor
} from "../deps.ts";

export type DefinitionNodeObject = {
  [key: string]: DefinitionNode,
};

export type QueryInfo = {
  [key: string]: number | undefined,
}

export interface ValidationFunc {
  (arg0: ValidationContext): ValidationContext | ASTVisitor ;
}

export type CostLimitOptions = {
  maxCost: number,
  mutationCost: number,
  objectCost: number,
  scalarCost: number,
  depthCostFactor: number,
};

export type DepthLimitOptions = {
  maxDepth: number
}

export type GuarDenoOptions = {
  depthLimitOptions: DepthLimitOptions,
  costLimitOptions: CostLimitOptions
}