# MCP Server

SAM has a remote [Model Context Protocol](https://modelcontextprotocol.io)
(MCP) server at `<base URL>/api/mcp`. MCP clients such as Claude.ai, Claude
Desktop, Claude Code, ChatGPT and Codex connect with OAuth 2.1. The tools use the
permissions of the user who connects the client.

The server supports only the protocol revision 2026-07-28. It is stateless:
it has no sessions, no subscriptions and no prompts. Its only resources are
the files of its skills.

## Connect a client

The permission `mcp;use` ("MCP-Server nutzen" in the role settings) and the
clearance of the app (a confirmed email, `login;manage` and the Discord
two-factor authentication that some permissions require) gate the whole
server: the consent page, the app KI-Agenten, the token endpoint and each
request with an access token. Only the removal of access stays open without
`mcp;use`: a user can always disconnect a client and deny a consent. Each
user with it finds the URL and the steps for the supported clients in the
app KI-Agenten (`/app/ai-agents`), also for the Claude plugin and the skills
(see [Files for AI agents](#files-for-ai-agents)). In the same app, the user names and disconnects
clients and disables tools for each client. A client opens the consent page
`/app/oauth/authorize` of SAM; the user signs in to SAM if necessary, can
give the client a name and disable tools, and allows the access. The app
KI-Agenten shows only the clients of the MCP server, not the desktop
companion (see [Resources](#resources)).

## OAuth design

SAM is its own authorization server. `next-auth` stays the login of the
app.

- **Clients:** only Client ID Metadata Documents (CIMD). The client id is
  an HTTPS URL. SAM gets the document from this URL and keeps it in the
  cache. There is no Dynamic Client Registration and there are no
  pre-registered clients. Exception: the authorization server knows the
  document of the desktop companion from its code and does not fetch it
  (decision 35 of the [Remote Control Program](./remote-control-program/README.md#decisions)).
  Thus the local stack works with `http://localhost` without
  `OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS`. The app serves the same
  document on the client id.
- **Grant:** the authorization code grant with PKCE (`S256` only). Each
  consent makes a new grant (a "connected client" in the app KI-Agenten). The tool
  settings and the name belong to the grant. The grant keeps the user agent
  of the browser of the consent, thus the user can tell two grants of the
  same client apart.
- **Access tokens:** ES256 JSON Web Tokens with a lifetime of 1 hour. The
  embed signing key signs them (see
  [Embedded App Authentication](./embedded-app-authentication.md)). The
  audience is the URL of the resource of the grant, thus a token of one
  resource does not work for the other resource. Each token has a random
  `jti`. The private claim `grant_id` is the id of the grant: the MCP
  endpoint and the connection token route load the grant on each request,
  thus a revoked grant stops its tokens at once.
- **Refresh tokens:** opaque values. The database keeps only their SHA-256
  hashes. Each use replaces the token, and the new token is valid for 31
  days. The reuse of an old token revokes the grant. Exception for a client
  that did not get the answer of a refresh (for example after a lost
  network connection): within 60 seconds after its replacement, the old
  token works once more, but only while nobody used its replacement. This
  use gives a new token pair, and the replacement that the client did not
  get becomes invalid: its later use revokes the grant. Each other reuse
  revokes the grant. This applies to all clients.
- **Scope:** one scope for each resource (see [Resources](#resources)).
  A grant gets only the scope of its resource: a scope of the other
  resource has no effect, and an unknown scope gives `invalid_scope`.
  `offline_access` has no effect.
- **Cleanup:** each night, the midnight automations Lambda deletes expired
  codes, expired refresh tokens, grants without a token (for example after
  an abandoned authorization) and cached client metadata documents that
  expired more than 24 hours ago.
- **Permissions:** the own roles of the user. Admin mode is off. An admin
  can enable admin mode for one MCP client in the app KI-Agenten. The
  desktop companion never has admin mode.

### Resources

The authorization server has two resources (RFC 8707). The client id
selects the resource: only the desktop companion gets the Remote Control
Program, all other clients get the MCP server. A `resource` parameter
must name the resource of the client, else the request fails with
`invalid_target`. A request without it gets the resource of the client. A
refresh keeps the resource of the grant.

| Resource               | Resource URL (the audience)             | Scope                    | Permission of the consent and of the token endpoint | Kill switch                   |
| ---------------------- | --------------------------------------- | ------------------------ | --------------------------------------------------- | ----------------------------- |
| MCP server             | `<base URL>/api/mcp`                    | `mcp`                    | `mcp;use`                                           | `DisableMcpServer`            |
| Remote Control Program | `<base URL>/api/remote-control-program` | `remote_control_program` | `remoteControlProgram;use` and a citizen            | `DisableRemoteControlProgram` |

The desktop companion:

- Client id: `<base URL>/api/remote-control-program/desktop-companion/client-metadata.json`.
- Client name: "SAM Desktop Companion". A public client (`none`) with the
  grant types `authorization_code` and `refresh_token`.
- Redirect URI: `http://127.0.0.1/callback`, with the random port of the
  program (RFC 8252 section 7.3).
- Its access token gives connection tokens for the runtime of the citizen
  of the user (see [Connection and tokens](./remote-control-program/README.md#connection-and-tokens)).
  The sharing popover lists its grants as sign-ins, each with a sign-out.

Endpoints:

| Endpoint                                                             | Purpose                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/.well-known/oauth-authorization-server`                            | Authorization server metadata (RFC 8414)                                                   |
| `/.well-known/oauth-protected-resource`                              | Protected resource metadata (RFC 9728) of the MCP server, also on the path with `/api/mcp` |
| `/.well-known/oauth-protected-resource/api/remote-control-program`   | Protected resource metadata of the Remote Control Program                                  |
| `/api/remote-control-program/desktop-companion/client-metadata.json` | The client document of the desktop companion                                               |
| `/.well-known/jwks.json`                                             | The public key of the tokens                                                               |
| `/app/oauth/authorize`                                               | The consent page                                                                           |
| `/api/oauth/token`                                                   | Token endpoint (authorization code and refresh)                                            |
| `/api/oauth/revoke`                                                  | Token revocation (RFC 7009)                                                                |
| `/api/mcp`                                                           | The MCP endpoint (`POST` only)                                                             |
| `/api/remote-control-program/connection-token`                       | The connection tokens of the runtimes (`POST` only)                                        |

## Configuration

| Variable                                   | Effect                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EMBED_JWT_PRIVATE_KEY`                    | Necessary for the tokens. Without it, the consent page refuses the access and the token endpoint answers `503`. See [Set up the local machine](./setup-local-machine.md#embedded-app-authentication). |
| `NEXT_PUBLIC_BASE_URL`                     | The issuer of the tokens. The URLs of the resources and the client id of the desktop companion start with this URL. Each environment is its own issuer.                                               |
| `OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS` | `1` permits client ids with plain HTTP on a loopback host. Only the Playwright stack sets it. Never set it in a deployment: it weakens the SSRF protection of the document fetch.                     |

Each resource has a kill switch (see [Resources](#resources)). While it
is on, the token endpoint answers `503` to the clients of the resource,
the consent page shows a notice, and the protected resource metadata of
the resource answers `503`. `DisableMcpServer` also stops the MCP
endpoint. The authorization server metadata and the revocation endpoint
answer `503` only while both kill switches are on. The app KI-Agenten and
the files for AI agents stay available.

Use the standard strategy for all users on these flags. The MCP endpoint
and the OAuth endpoints have no session, thus a strategy for some users
does not apply to them. When Unleash is not available, the flags are off,
like all flags of the app: the kill switches do not work during an Unleash
outage.

## Tests

A real client id is an HTTPS URL on the internet. The Playwright stack
cannot use such a URL. Thus the stack sets
`OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS=1`, and a local HTTP server of the
test worker serves the CIMD document of the test client, with loopback
redirect URIs. The tests then do the consent in the browser, exchange the
code with `fetch` and call the MCP endpoint with the MCP client SDK. The
tests of the desktop companion need no document server, because the app
knows its document.

## Rules for tools

The tests of `packages/mcp` do not check these rules:

- **No full email address in an output.** The model of the client reads
  each output. Use `redactEmailAddress()` for a field and
  `redactEmailAddressesInJson()` for stored JSON (`packages/domain`).
- **One tool for a pair of opposite operations.** Add and remove, sign up
  and cancel, or mark as read and mark as unread are one tool with an
  `action` parameter (example: `update_event_participants`), not two tools.
- **The audit event type of a read tool has no "MCP" in its name**
  (example: `CITIZENS_LISTED`). The web app can write the same type for the
  same read.

## Skills

The server serves [Agent Skills](https://agentskills.io) with the
[Skills extension](https://modelcontextprotocol.io/extensions/skills/overview)
of MCP: `skills/list` and `skills/get` give the skills, and `resources/read`
gives their files. The skills teach a model the concepts of SAM. All users
get the same skills. The server instructions name the skills, thus a client
without the extension can read them as resources.

The skills are in `packages/mcp/src/skills`. Write a skill in English and
keep it short: give the concepts, the processes and the rules of an app that
the tool descriptions do not give, not each field or option. A description
has at most 200 characters, because Claude.ai refuses a longer one on upload.

## Files for AI agents

Few clients support the Skills extension (in 2026-11, no Claude client and
no Codex, see the [client matrix](https://modelcontextprotocol.io/extensions/client-matrix)).
Thus the app also serves the skills and the MCP server as files.
`packages/mcp` makes them from the same skills.

| Path                                     | Content                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/ai-agents/claude/marketplace.json` | A Claude Code marketplace with the plugin `sam`. The source of the plugin is the archive below.                                                              |
| `/api/ai-agents/claude/sam.zip`          | The Claude plugin: the MCP server of the environment and all skills. The upload in Claude Desktop and Claude.ai uses the same file.                          |
| `/.well-known/agent-skills/index.json`   | The index of the [Agent Skills Discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc) v0.2.0, for example for `npx skills add <base URL>`. |
| `/.well-known/agent-skills/<skill>.zip`  | One skill with `SKILL.md` at the root of the archive.                                                                                                        |

- The files are public: Claude Code cannot send credentials to a
  marketplace, and the content comes from the public repository. The build
  makes them as static files.
- The archives must be deterministic (a fixed file order and a fixed
  timestamp). The plugin has no version, thus Claude Code uses the SHA-256
  digest of the archive as the version. The marketplace and the index give
  the digests of the archives.

## Code layout

The code of the MCP server and of the OAuth server is in the packages
`application` and `mcp` and in the adapter modules of the Next.js app. See
[Architecture](./architecture.md).
