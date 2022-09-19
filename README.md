<div align="center">
  <img alt="guardenoql-logo" height="350" src="assets/logo.svg">
  <h1>GuarDenoQL</h1>
  <p><em>Simple and customizable security middleware for GraphQL servers in Deno.</em></p>
</div>

## Features

---

- 
-

## Why?

___

- 
- 

## Getting Started

___

-
-

## Functionality

---

- Screenshots of graphiql playground here

## How to Contribute

___

- Could link to CONTRIBUTING.md here with instructions 

## Authors

___

- 

## License

___




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

