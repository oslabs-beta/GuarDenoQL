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

<iframe
  src="https://carbon.now.sh/embed?bg=rgba%28171%2C+184%2C+195%2C+1%29&t=solarized+dark&wt=sharp&l=application%2Ftypescript&width=680&ds=true&dsyoff=20px&dsblur=68px&wc=true&wa=true&pv=0px&ph=0px&ln=false&fl=1&fm=Hack&fs=14px&lh=133%25&si=false&es=2x&wm=false&code=import%2520%257B%2520opine%252C%2520OpineRequest%2520%257D%2520from%2520%27https%253A%252F%252Fdeno.land%252Fx%252Fopine%25402.2.0%252Fmod.ts%27%253B%250Aimport%2520%257B%2520GraphQLHTTP%2520%257D%2520from%2520%27https%253A%252F%252Fdeno.land%252Fx%252Fgql%25401.1.2%252Fmod.ts%27%253B%250Aimport%2520%257B%2520makeExecutableSchema%2520%257D%2520from%2520%27https%253A%252F%252Fdeno.land%252Fx%252Fgraphql_tools%25400.0.2%252Fmod.ts%27%253B%250Aimport%2520%257B%2520gql%2520%257D%2520from%2520%27https%253A%252F%252Fdeno.land%252Fx%252Fgraphql_tag%25400.0.1%252Fmod.ts%27%253B%250Aimport%2520%257B%2520readAll%2520%257D%2520from%2520%27https%253A%252F%252Fdeno.land%252Fstd%25400.148.0%252Fstreams%252Fconversion.ts%27%253B%250A%250Aimport%2520%257B%2520guarDenoQL%2520%257D%2520from%2520%2522..%252Fmod.ts%2522%253B%250A%250Atype%2520Request%2520%253D%2520OpineRequest%2520%2526%2520%257B%2520json%253A%2520%28%29%2520%253D%253E%2520Promise%253Cany%253E%2520%257D%253B%250A%250A%252F%252F%2520RUN%2520COMMAND%250A%252F%252F%2520deno%2520run%2520--allow-read%2520--allow-net%2520example%252Fopine.ts%250A%250Aconst%2520typeDefs%2520%253D%2520gql%2560%250A%2520%2520type%2520Query%2520%257B%250A%2520%2520%2520%2520posts%253A%2520%255BPost%255D%250A%2520%2520%2520%2520post%28id%253A%2520ID%21%29%253A%2520Post%250A%2520%2520%257D%250A%250A%2520%2520type%2520Post%2520%257B%250A%2520%2520%2520%2520id%253A%2520ID%21%250A%2520%2520%2520%2520title%253A%2520String%21%250A%2520%2520%2520%2520related%253A%2520%255BPost%255D%250A%2520%2520%257D%250A%2560%253B%250A%250Aconst%2520posts%2520%253D%2520%255B%257Bid%253A%2520%2522graphql%2522%252C%2520title%253A%2520%2522Learn%2520GraphQL%21%2522%257D%255D%253B%250A%250Aconst%2520resolvers%2520%253D%2520%257B%250A%2520%2520Query%253A%2520%257B%250A%2520%2520%2520%2520posts%253A%2520%28%29%2520%253D%253E%2520posts%252C%250A%2520%2520%2520%2520post%253A%2520%28_parent%253A%2520any%252C%2520args%253A%2520%257B%2520id%253A%2520string%2520%257D%29%2520%253D%253E%2520posts.find%28%28post%29%2520%253D%253E%2520post.id%2520%253D%253D%253D%2520args.id%29%252C%250A%2520%2520%257D%252C%250A%2520%2520Post%253A%2520%257B%250A%2520%2520%2520%2520related%253A%2520%28%29%2520%253D%253E%2520posts%252C%250A%2520%2520%257D%252C%250A%257D%253B%250A%250A%250Aconst%2520dec%2520%253D%2520new%2520TextDecoder%28%29%253B%250A%250Aconst%2520schema%2520%253D%2520makeExecutableSchema%28%257B%2520resolvers%252C%2520typeDefs%2520%257D%29%253B%250A%250Aconst%2520app%2520%253D%2520opine%28%29%253B%250A%250Aapp%250A%2520%2520.use%28%2522%252Fgraphql%2522%252C%2520async%2520%28req%252C%2520res%29%2520%253D%253E%2520%257B%250A%2520%2520%2520%2520const%2520request%2520%253D%2520req%2520as%2520Request%253B%250A%250A%2520%2520%2520%2520request.json%2520%253D%2520async%2520%28%29%2520%253D%253E%2520%257B%250A%2520%2520%2520%2520%2520%2520const%2520rawBody%2520%253D%2520await%2520readAll%28req.raw%29%253B%250A%2520%2520%2520%2520%2520%2520const%2520body%2520%253D%2520JSON.parse%28dec.decode%28rawBody%29%29%253B%250A%2520%2520%2520%2520%2520%2520const%2520query%2520%253D%2520body.query%253B%250A%250A%2520%2520%2520%2520%2520%2520const%2520error%2520%253D%2520guarDenoQL%28schema%252C%2520query%252C%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520depthLimitOptions%253A%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520maxDepth%253A%25202%252C%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520callback%253A%2520%28args%29%2520%253D%253E%2520console.log%28%27query%2520depth%2520is%253A%27%252C%2520args%29%250A%2520%2520%2520%2520%2520%2520%2520%2520%257D%252C%250A%2520%2520%2520%2520%2520%2520%2520%2520costLimitOptions%253A%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520maxCost%253A%252020%252C%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520mutationCost%253A%25205%252C%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520objectCost%253A%25202%252C%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520scalarCost%253A%25201%252C%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520depthCostFactor%253A%25202%252C%250A%2520%2520%2520%2520%2520%2520%2520%2520%2520%2520callback%253A%2520%28args%29%2520%253D%253E%2520console.log%28%27query%2520cost%2520is%253A%27%252C%2520args%29%250A%2520%2520%2520%2520%2520%2520%2520%2520%257D%252C%250A%2520%2520%2520%2520%2520%2520%257D%29%253B%250A%250A%2520%2520%2520%2520%2520%2520if%2520%28error%2520%21%253D%253D%2520undefined%2520%2526%2526%2520%21error.length%29%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520return%2520body%253B%250A%2520%2520%2520%2520%2520%2520%257D%2520else%2520%257B%250A%2520%2520%2520%2520%2520%2520%2520%2520const%2520errorMessage%2520%253D%2520%257B%2520error%2520%257D%253B%250A%2520%2520%2520%2520%2520%2520%2520%2520return%2520res.send%28JSON.stringify%28errorMessage%29%29%253B%250A%2520%2520%2520%2520%2520%2520%257D%250A%2520%2520%2520%2520%257D%253B%250A%250A%2520%2520%2520%2520const%2520resp%2520%253D%2520await%2520GraphQLHTTP%253CRequest%253E%28%257B%250A%2520%2520%2520%2520%2520%2520schema%252C%250A%2520%2520%2520%2520%2520%2520context%253A%2520%28request%29%2520%253D%253E%2520%28%257B%2520request%2520%257D%29%252C%250A%2520%2520%2520%2520%2520%2520graphiql%253A%2520true%252C%250A%2520%2520%2520%2520%257D%29%28request%29%253B%250A%250A%2520%2520%2520%2520for%2520%28const%2520%255Bk%252C%2520v%255D%2520of%2520resp.headers.entries%28%29%29%2520res.headers%253F.append%28k%252C%2520v%29%253B%250A%250A%2520%2520%2520%2520res.status%2520%253D%2520resp.status%253B%250A%250A%2520%2520%2520%2520res.send%28await%2520resp.text%28%29%29%253B%250A%2520%2520%257D%29%250A%2520%2520.listen%283000%252C%2520%28%29%2520%253D%253E%2520console.log%28%2560%25E2%2598%2581%2520%2520Started%2520on%2520http%253A%252F%252Flocalhost%253A3000%2560%29%29%253B%250A"
  style="width: 799px; height: 500px; border:0; transform: scale(1); overflow:hidden;"
  sandbox="allow-scripts allow-same-origin">
</iframe>
-

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
