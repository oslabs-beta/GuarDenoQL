import {
  DefinitionNode,
} from "../deps.ts";

export type DefinitionNodeObject = {
  [key: string]: DefinitionNode,
};

export type QueryDepths = {
  [key: string]: number,
}

export interface ValidationFunc<ValidationContext> {
  (arg0: ValidationContext): ValidationContext;
}