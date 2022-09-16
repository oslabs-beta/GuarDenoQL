import {
  Kind,
  DefinitionNode,
} from "../../deps.ts";

export function getFragments(definitions: ReadonlyArray<DefinitionNode>) {
  return definitions.reduce((map, definition) => {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      map[definition.name.value] = definition;
    }
    return map;
  }, {});
}

export function getQueriesAndMutations(definitions) {
  return definitions.reduce((map, definition) => {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      map[definition.name ? definition.name.value : ""] = definition;
    }
    return map;
  }, {});
}