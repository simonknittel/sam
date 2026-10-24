# MCP Server

SAM has a remote [Model Context Protocol](https://modelcontextprotocol.io)
(MCP) server at `<base URL>/api/mcp`. MCP clients such as Claude.ai, Claude
Desktop, Claude Code, ChatGPT and Codex connect with OAuth 2.1. The tools use the
permissions of the user who connects the client.

The server supports only the protocol revision 2026-07-28. It is stateless:
it has no sessions, no subscriptions, no resources and no prompts.

## Connect a client

The permission `mcp;use` ("MCP-Server nutzen" in the role settings) and the
clearance of the app (a confirmed email and `login;manage`) gate the whole
server: the consent page, the account page, the token endpoint and each
request with an access token. Only the removal of access stays open without
`mcp;use`: a user can always disconnect a client and deny a consent. Each
user with it finds the URL and the steps for the supported clients on
`/app/account/mcp`. On the same page, the user disconnects clients and
disables tools. A client opens the consent page `/app/oauth/authorize` of
SAM; the user signs in to SAM if necessary and allows the access.

## OAuth design

SAM is its own authorization server. `next-auth` stays the login of the
app.

- **Clients:** only Client ID Metadata Documents (CIMD). The client id is
  an HTTPS URL. SAM gets the document from this URL and keeps it in the
  cache. There is no Dynamic Client Registration and there are no
  pre-registered clients.
- **Grant:** the authorization code grant with PKCE (`S256` only). Each
  consent makes a new grant (a "connected client" on the account page).
- **Access tokens:** ES256 JSON Web Tokens with a lifetime of 1 hour. The
  embed signing key signs them (see
  [Embedded App Authentication](./embedded-app-authentication.md)). The
  audience is the MCP URL. Each token has a random `jti`. The private claim
  `grant_id` is the id of the grant: the MCP endpoint loads the grant on each
  request, thus a revoked grant stops its tokens at once.
- **Refresh tokens:** opaque values. The database keeps only their SHA-256
  hashes. Each use replaces the token, and the new token is valid for 31
  days. The reuse of an old token revokes the grant.
- **Scope:** one scope, `mcp`. `offline_access` has no effect.
- **Cleanup:** each night, the midnight automations Lambda deletes expired
  codes, expired refresh tokens, grants without a token (for example after
  an abandoned authorization) and cached client metadata documents that
  expired more than 24 hours ago.
- **Permissions:** the own roles of the user. Admin mode is off. An admin
  can enable admin mode for one client on the account page.

Endpoints:

| Endpoint                                  | Purpose                                         |
| ----------------------------------------- | ----------------------------------------------- |
| `/.well-known/oauth-authorization-server` | Authorization server metadata (RFC 8414)        |
| `/.well-known/oauth-protected-resource`   | Protected resource metadata (RFC 9728)          |
| `/.well-known/jwks.json`                  | The public key of the tokens                    |
| `/app/oauth/authorize`                    | The consent page                                |
| `/api/oauth/token`                        | Token endpoint (authorization code and refresh) |
| `/api/oauth/revoke`                       | Token revocation (RFC 7009)                     |
| `/api/mcp`                                | The MCP endpoint (`POST` only)                  |

## Configuration

| Variable                                   | Effect                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EMBED_JWT_PRIVATE_KEY`                    | Necessary for the tokens. Without it, the consent page refuses the access and the token endpoint answers `503`. See [Set up the local machine](./setup-local-machine.md#embedded-app-authentication). |
| `NEXT_PUBLIC_BASE_URL`                     | The issuer of the tokens. The MCP URL (the resource and the audience) is this URL with the path `/api/mcp`. Each environment is its own issuer.                                                       |
| `OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS` | `1` permits client ids with plain HTTP on a loopback host. Only the Playwright stack sets it. Never set it in a deployment: it weakens the SSRF protection of the document fetch.                     |

The Unleash flag `DisableMcpServer` is the kill switch. While it is on, the
MCP endpoint and the OAuth endpoints answer `503`, and the consent page
shows a notice. The account page stays available.

Use the standard strategy for all users on this flag. The MCP endpoint and
the OAuth endpoints have no session, thus a strategy for some users does not
apply to them. When Unleash is not available, the flag is off, like all
flags of the app: the kill switch does not work during an Unleash outage.

## Tests

A real client id is an HTTPS URL on the internet. The Playwright stack
cannot use such a URL. Thus the stack sets
`OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS=1`, and a local HTTP server of the
test worker serves the CIMD document of the test client, with loopback
redirect URIs. The tests then do the consent in the browser, exchange the
code with `fetch` and call the MCP endpoint with the MCP client SDK.

## Code layout

The code of the MCP server and of the OAuth server is in the packages
`application` and `mcp` and in the adapter modules of the Next.js app. See
[Architecture](./architecture.md).
