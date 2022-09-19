<div align="center">
  <img alt="guardenoql-logo" height="350" src="assets/logo.svg">
  <h1>GuarDenoQL</h1>
  <p><em>Simple and customizable security middleware for GraphQL servers in Deno.</em></p>
</div>

## Features

- Integrates with an Opine server in a Deno runtime.
- Enables users to customize both a _**maximum depth**_ and a _**cost limit
  algorithm**_ for all GraphQL queries and mutations sent to the server.
- Validates queries and mutations against the depth limiter and/or cost limiter
  before they are executed by the server.

## Why?

**Depth Limiting**

Because GraphQL schemas can be cyclic graphs, it is possible that a client could
construct a query such as this one:

<div>
  <img src="./assets/evil-query.png">
</div>
Therefore, if nested deep enough, a malicious actor could potentially bring your server down with an abusive query.
<br />
<br />

However, using a **Depth Limiter**, you can validate the depth of incoming
queries against a user-defined limit and prevent these queries from going
through.

**Cost Limiting**

Queries can still be very expensive even if they aren't nested deeply. Using a
Cost Limiter, your server will calculate the total cost of the query based on
its types before execution.

## Getting Started

A set up with [gql](https://github.com/deno-libs/gql) and
[Opine](https://github.com/cmorten/opine) out-of-the-box:

## Functionality

- Screenshots of graphiql playground here

## How to Contribute

- Could link to CONTRIBUTING.md here with instructions

## Authors

-

## License

sample

`deno run --allownet --unstable <filename>`

SERVER: http://localhost:3000/graphql

EXAMPLE NESTED QUERY

```
query {
  posts {
    id
    title
    related {
      id
      title
      related {
        id
        title
        related {
          id
          title
          related {
            id
            title
            related {
              id
              title
              related {
                id
                title
                related {
                  id
                  title
                  related {
                    id
                    title
                    related {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```
