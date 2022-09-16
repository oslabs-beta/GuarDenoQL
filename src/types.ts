import {
  DefinitionNode,
  ValidationContext,
} from "../deps.ts";

export type DefinitionNodeObject = {
  [key: string]: DefinitionNode,
};

export type QueryDepths = {
  [key: string]: number | undefined,
}

export interface ValidationFunc {
  (arg0: ValidationContext): ValidationContext;
}