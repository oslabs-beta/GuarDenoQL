// centralize dependencies using a deps.ts file
// what dependencies do we need?
export {
Source,
parse,
Kind,
ValidationContext,
GraphQLError,
buildSchema,
validate,
specifiedRules,
GraphQLSchema
} from 'https://deno.land/x/graphql_deno@v15.0.0/mod.ts';

export type { DefinitionNode, NullValueNode, ASTNode } from 'https://deno.land/x/graphql_deno@v15.0.0/mod.ts';

export { opine } from 'https://deno.land/x/opine@2.2.0/mod.ts';
export type { OpineRequest } from 'https://deno.land/x/opine@2.2.0/mod.ts';
export { GraphQLHTTP } from 'https://deno.land/x/gql@1.1.2/mod.ts'
export { makeExecutableSchema } from 'https://deno.land/x/graphql_tools@0.0.2/mod.ts'
export { gql } from 'https://deno.land/x/graphql_tag@0.0.1/mod.ts'
export { readAll } from 'https://deno.land/std@0.148.0/streams/conversion.ts'

export { Server } from 'https://deno.land/std@0.148.0/http/server.ts'