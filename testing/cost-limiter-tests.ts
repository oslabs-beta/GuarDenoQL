import { costLimit } from '../src/protections/cost-limiter.ts';
import 'https://unpkg.com/mocha@10.0.0/mocha.js';
import {
    expect,
    makeExecutableSchema,
    Source,
    parse,
    validate,
    specifiedRules
} from '../deps.ts';

function createDocument(query: string) {
  const source = new Source(query);
  return parse(source);
}

const typeDefinitions = `
  type Book {
    title: String
    author: String
  }

  type Query {
    books: [Book]
    getBook(title: String): Book
  }
`;
const books = [
  {
    title: 'The Awakening',
    author: 'Kate Chopin',
  },
  {
    title: 'City of Glass',
    author: 'Paul Auster',
  },
];

const resolvers = {
  Query: {
    books: () => books,
    getBook: (title: String) => books.find((book) => book.title === title),
  },
};

export const schema = makeExecutableSchema({
  resolvers: [resolvers],
  typeDefs: [typeDefinitions],
});

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

describe('cost limit tests', () => {
  
  const query = `query {
    books {
      title
      author
    }
  }`;

  it('should work for a default query', () => {
    const document = createDocument(query);
    const errors = validate(schema, document, [ ...specifiedRules, costLimit({
      maxCost: 20,
      mutationCost: 5,
      objectCost: 2,
      scalarCost: 1,
      depthCostFactor: 2,
    })]);
    expect(errors).toEqual([]);
  });
});






mocha.run(onCompleted).globals(['onerror']);