sample

deno run --allownet --unstable <filename>

SERVER: http://localhost:3000/graphql

EXAMPLE NESTED QUERY
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

