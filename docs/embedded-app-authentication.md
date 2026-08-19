# Embedded App Authentication

SAM can embed an external app in an iframe under `/app/external/<app>`. By
default that app has no idea who is looking at it, which forces it to be
readable by anyone who knows the URL.

To fix that, SAM appends a short-lived, signed JSON Web Token to the iframe
URL. The token states who the current user is and what they are allowed to
do, and any app can verify it on its own with nothing but SAM's public key.

> [!IMPORTANT]
> This is an interim solution. It will eventually be replaced by a proper
> OAuth 2.0 / OIDC flow. The claim names below were chosen so that most of
> your verification code survives that migration unchanged.

## At a glance

| | |
| --- | --- |
| Transport | Query parameter `jwt` on the iframe URL |
| Algorithm | `ES256` (ECDSA on P-256), and nothing else |
| Key set | `https://<sam-host>/.well-known/jwks.json` (public, CORS-enabled) |
| Issuer (`iss`) | `https://<sam-host>` |
| Audience (`aud`) | A string agreed with us per app |
| Lifetime | 5 minutes |

Each SAM environment (production, preview, local development) signs with its
own key, so a token minted by a preview deployment can never verify as a
production one. Pin `iss` on top of the signature to make that explicit.

## Enabling it for your app

Embed authentication is off unless SAM is explicitly configured for your
app, and it is only enabled for apps we control — see
[Why the opt-in](#why-the-opt-in). Talk to us; we need:

1. the audience string you want in `aud` (typically your app's origin), and
2. the list of permission resources your app cares about (see
   [`permissions`](#permissions)).

Until then your iframe URL stays exactly as it is today.

## The token

Header:

```json
{
  "alg": "ES256",
  "kid": "Byl8qY6Wxan2E05c1CiRPNdhPCrw2ElkZDIsS49zMUE"
}
```

Payload:

```json
{
  "iss": "https://sam.example.com",
  "aud": "https://your-app.example.com",
  "sub": "clog1zezo04isul0nfes57hmo",
  "preferred_username": "SomeHandle",
  "permissions": ["event;read", "event;manage;flowId=abc"],
  "jti": "dwr5fqnkxk1fflu7pc00py89",
  "iat": 1787165428,
  "exp": 1787165728
}
```

### `sub`

The user's SAM entity id. **This is the only stable identifier in the
token** — key your own user records on it and nothing else.

### `preferred_username`

The user's Star Citizen handle. Display text only.

> [!WARNING]
> The handle looks exactly like a natural key, and it is not one. It holds
> the latest _confirmed_ value and changes when someone renames themselves
> in RSI. An app that stores it in its own user table forks one user into
> two the moment they rename. Key on `sub`, and re-read
> `preferred_username` from every token you receive.

**The claim is absent, never `null`, for a user without a confirmed
handle.** Write an absence check; do not render the string `"null"`.

### `permissions`

SAM permission strings of the form `resource;operation` or
`resource;operation;key=value;…`, for example:

- `event;read`
- `event;manage;flowId=abc`
- `note;manage;noteTypeId=1;classificationLevelId=2`

Only the resources your app declared are included, so the array is a
filtered view of the user's permissions, not all of them. It is
deduplicated and sorted, and it is an empty array — not a missing claim —
for a user who holds none of them.

Two things worth knowing:

- **Attribute values are ids and are not escaped.** Split on `;` for the
  segments and on the first `=` within a segment.
- **SAM's admin bypass is not reflected here.** An admin who enables admin
  mode in SAM sees everything there, but their token still carries only
  what their roles actually grant. Your app therefore shows them what their
  roles allow, which will occasionally look inconsistent with the rest of
  SAM. This is deliberate: admin mode is SAM's concept, not yours.

### `jti`

A unique id per token. Nothing in SAM depends on it; it exists so you can
harden against replay — see [Replay protection](#replay-protection).

## Verifying

Verification happens entirely on your side. The reference implementation
with [`jose`](https://github.com/panva/jose):

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

// Module scope: the key set caches and refreshes itself
const jsonWebKeySet = createRemoteJWKSet(
  new URL("https://sam.example.com/.well-known/jwks.json"),
);

export const verifySamToken = async (token: string) => {
  const { payload } = await jwtVerify(token, jsonWebKeySet, {
    // Never omit this — accepting the token's own `alg` is the classic
    // JWT verification footgun
    algorithms: ["ES256"],
    issuer: "https://sam.example.com",
    audience: "https://your-app.example.com",
  });

  return {
    entityId: payload.sub!,
    handle: payload.preferred_username as string | undefined,
    permissions: payload.permissions as string[],
  };
};
```

Requirements, in decreasing order of "we will not be able to help you if
you skip this":

1. **Pin the algorithm to `ES256`.** Without it, a verifier can be talked
   into accepting `none` or an HMAC signed with the public key.
2. **Pin `aud` to your own audience string.** Otherwise whoever controls
   another embed target can replay a user's token against your app.
3. **Pin `iss`.** This is what keeps a preview token out of production.
4. **Let expiry be enforced.** Every JWT library does this by default;
   don't widen the clock tolerance.
5. **Fetch the JWKS by URL and let it refresh.** Do not hardcode the key —
   the `kid` and the key change on rotation, and rotation happens without
   coordination with you.

## The 5-minute lifetime

The token is a **handshake credential**. SAM mints it while server-rendering
the page that contains your iframe, so it is fresh when your app loads.

Exchange it for your own session immediately:

1. Your page loads with `?jwt=…`.
2. You verify the token and establish your own session (cookie, etc.).
3. **You strip the parameter from the URL** — `history.replaceState()` or a
   redirect to the clean URL.

The expiry therefore only constrains that initial load, not how long the
iframe may stay open: once you hold your own session, the token is spent.
SAM does not refresh it and never will — re-minting would mean swapping the
iframe `src`, which reloads the frame and destroys any in-progress form
state.

Step 3 is not optional. The token sits in a query string, which means it
reaches your access logs, the user's browser history, and the `Referer`
header of every outbound link your page renders. Stripping it early bounds
that exposure; the short lifetime bounds the rest.

## Replay protection

Optional hardening, and only worth it if you already have server-side state
with a TTL: record each `jti` you have accepted and reject repeats.

If you do, there is one rule you must get right, or you will lock users out:

> Reject a repeated `jti` only when it is being exchanged for a **new**
> session. A requester that already holds a valid session is let through.

Reloading the page _inside_ the iframe re-requests the identical URL with
the identical token. A naive "seen this `jti` → reject" makes that reload
fail.

Entries can be dropped after 5 minutes; a token older than that is rejected
by its `exp` anyway.

## Key rotation

The JWKS publishes a `keys` array, but SAM currently holds exactly one key
per environment. The `kid` is the RFC 7638 thumbprint of the public key, so
it changes automatically whenever the key does.

Rotation means: deploy the new key, then retire the old one in a second
deploy. During the window in between, the previous public key is no longer
published — tolerable with 5-minute tokens, and a reason to keep your JWKS
cache short-lived rather than pinning a key. `createRemoteJWKSet` and its
equivalents handle this by refetching on an unknown `kid`.

## What SAM does not do

- No token refresh, and no mechanism keeping the embed authenticated past
  the handshake.
- No introspection endpoint and no revocation. A token is valid until it
  expires.
- No encryption (JWE). The claims are the user's own identity and
  permissions, shown to an app that is about to act on them anyway.
- No token for a user without a linked SAM entity (an admin can be in this
  state). The iframe then renders without the parameter and your app should
  fall back to its anonymous behaviour.
- No token at all when SAM's signing key is unconfigured in an environment.
  The JWKS then serves `{"keys":[]}`, which is a valid document meaning
  "this issuer currently publishes no keys".

## Why the opt-in

A token in a query string is a credential in a place credentials should not
be: access logs, browser history, `Referer` headers. That risk is
acceptable when the recipient is an app we control and that follows the
rules above, and not acceptable when it is an arbitrary third party. So
apps do not receive a token by virtue of being embedded — someone has to
enable it for that app explicitly.

## SAM-side setup

See [Setup Local Machine](./setup-local-machine.md#embedded-app-authentication)
for generating a key and configuring it per environment.
