import {
  Kind,
  DefinitionNode,
} from "../../deps.ts";

import {
  DefinitionNodeObject,
} from "../types.ts";

export function getFragments(definitions: ReadonlyArray<DefinitionNode>): DefinitionNodeObject {
  return definitions.reduce((map: DefinitionNodeObject, definition) => {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      map[definition.name.value] = definition;
    }
    return map;
  }, {});
}

export function getQueriesAndMutations(definitions: ReadonlyArray<DefinitionNode>): DefinitionNodeObject {
  return definitions.reduce((map: DefinitionNodeObject, definition) => {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      map[definition.name ? definition.name.value : ""] = definition;
    }
    return map;
  }, {});
}