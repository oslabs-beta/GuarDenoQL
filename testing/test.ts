import 'https://unpkg.com/mocha@10.0.0/mocha.js';
import { depthLimit } from '../src/protections/depth-limiter.ts';
import { costLimit } from '../src/protections/cost-limiter.ts';
import {
    expect,
    buildSchema,
    Source,
    parse,
    validate,
    specifiedRules
} from '../deps.ts';

function createDocument(query: string) {
  const source = new Source(query);
  return parse(source);
}

const petMixin = `
    name: String!
    owner: Human!
`

const schema = buildSchema(`
  type Query {
    user(name: String): Human
    version: String
    user1: Human
    user2: Human
    user3: Human
  }

  type Human {
    name: String!
    email: String!
    address: Address
    pets: [Pet]
  }

  interface Pet {
    ${petMixin}
  }

  type Cat {
    ${petMixin}
  }

  type Dog {
    ${petMixin}
  }

  type Address {
    street: String
    number: Int
    city: String
    country: String
  }
`)

function onCompleted(failures: number): void {
    if (failures > 0) {
       Deno.exit(1);
   } else {
       Deno.exit(0);
   }
}
  
  (window as any).location = new URL('http://localhost:0');
  
  mocha.setup({ ui: 'bdd', reporter: 'spec' });

  mocha.checkLeaks();

  describe('depth limit tests', () => {
    it('should should count depth without fragment', () => {
        const query = `
        query read0 {
          version
        }
        query read1 {
          version
          user {
            name
          }
        }
        query read2 {
          matt: user(name: "matt") {
            email
          }
          andy: user(name: "andy") {
            email
            address {
              city
            }
          }
        }
        query read3 {
          matt: user(name: "matt") {
            email
          }
          andy: user(name: "andy") {
            email
            address {
              city
            }
            pets {
              name
              owner {
                name
              }
            }
          }
        }
      `
      const document = createDocument(query);
      const expectedDepths = {
        read0: 0,
        read1: 1,
        read2: 2,
        read3: 3
      };
      
      const spec = queryDepths => expect(queryDepths).toEqual(expectedDepths);
      const errors = validate(schema, document, [ ...specifiedRules, depthLimit(10, spec)]);
        
      expect(errors).toEqual([]);
    })

    it('should count with fragments', () => {
      const query = `
        query read0 {
          ... on Query {
            version
          }
        }
        query read1 {
          version
          user {
            ... on Human {
              name
            }
          }
        }
        fragment humanInfo on Human {
          email
        }
        fragment petInfo on Pet {
          name
          owner {
            name
          }
        }
        query read2 {
          matt: user(name: "matt") {
            ...humanInfo
          }
          andy: user(name: "andy") {
            ...humanInfo
            address {
              city
            }
          }
        }
        query read3 {
          matt: user(name: "matt") {
            ...humanInfo
          }
          andy: user(name: "andy") {
            ... on Human {
              email
            }
            address {
              city
            }
            pets {
              ...petInfo
            }
          }
        }
      `
      const document = createDocument(query);
      const expectedDepths = {
        read0: 0,
        read1: 1,
        read2: 2,
        read3: 3
      }
      
      const spec = queryDepths => expect(queryDepths).toEqual(expectedDepths);
      const errors = validate(schema, document, [ ...specifiedRules, depthLimit(10, spec)]);
        
      expect(errors).toEqual([]);
    })

    it('should ignore the introspection query', () => {
        const introQuery = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type { ...TypeRef }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`
        const document = createDocument(introQuery);        
        const errors = validate(schema, document, [ ...specifiedRules, depthLimit(5)]);
        expect(errors).toEqual([]);
      })

      it('should catch a query that is too deep', () => {
        const query = `{
          user {
            pets {
              owner {
                pets {
                  owner {
                    pets {
                      name
                    }
                  }
                }
              }
            }
          }
        }`
        const document = createDocument(query);
        const errors = validate(schema, document, [ ...specifiedRules, depthLimit(4)]);
        expect(errors[0].message).toEqual("'' exceeds maximum operation depth of 4");
      })
  })
  
  mocha.run(onCompleted).globals(['onerror']);