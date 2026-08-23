# Embedded App Authentication

SAM can embed an external app in an iframe under `/app/external/<app>`. By
default, the external app cannot identify the user who looks at it. Thus
each person who knows the URL can read the content of the app.

To correct that, SAM appends a short-lived, signed JSON Web Token to the
iframe URL. The token states who the current user is and which permissions
they have. Each app can verify the token independently with only the public
key of SAM.

> [!IMPORTANT]
> This is an interim solution. A full OAuth 2.0 / OIDC flow will replace it
> later. The claim names below were selected so that most of your
> verification code survives that migration without changes.

## Overview

|                  |                                                                   |
| ---------------- | ----------------------------------------------------------------- |
| Transport        | Query parameter `jwt` on the iframe URL                           |
| Algorithm        | `ES256` (ECDSA on P-256), and no other                            |
| Key set          | `https://<sam-host>/.well-known/jwks.json` (public, CORS-enabled) |
| Issuer (`iss`)   | `https://<sam-host>`                                              |
| Audience (`aud`) | A string agreed with us for each app                              |
| Lifetime         | 5 minutes                                                         |

Each SAM environment (production, preview, local development) signs with
its own key. Thus a token from a preview deployment can never verify as a
production token. Also pin `iss` to make that explicit.

## Enable the tokens for your app

Embed authentication is off unless SAM is explicitly configured for your
app. It is only enabled for apps that we control — see
[Why the opt-in](#why-the-opt-in). Speak with us; we need:

1. the audience string you want in `aud` (usually the origin of your app), and
2. the list of permission resources that your app uses (see
   [`permissions`](#permissions)).

Until then, your iframe URL stays unchanged.

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

The SAM entity id of the user. **This is the only stable identifier in the
token.** Use it, and only it, as the key for your own user records.

### `preferred_username`

The Star Citizen handle of the user. Use it as display text only.

> [!WARNING]
> The handle looks like a natural key, but it is not one. It holds the
> latest _confirmed_ value, and it changes when a person changes their name
> in RSI. If an app stores the handle in its own user table, one user
> becomes two users after such a change. Use `sub` as the key, and read
> `preferred_username` again from each token that you receive.

**For a user without a confirmed handle, the claim is absent, never
`null`.** Check for absence; do not show the string `"null"`.

### `permissions`

SAM permission strings with the form `resource;operation` or
`resource;operation;key=value;…`, for example:

- `event;read`
- `event;manage;flowId=abc`
- `note;manage;noteTypeId=1;classificationLevelId=2`

The array only includes the resources that your app declared. Thus the
array is a filtered view of the permissions of the user, not all of them.
The array is deduplicated and sorted. For a user who has none of these
permissions, the array is empty — the claim is not absent.

Two important points:

- **Attribute values are ids, and they are not escaped.** Split on `;` for
  the segments, and split on the first `=` in a segment.
- **The token does not show the admin bypass of SAM.** When an admin
  enables admin mode, they see everything in SAM, but their token only
  includes the permissions that their roles grant. Thus your app shows them
  what their roles permit, and this can look different from the remainder
  of SAM. This is intentional: admin mode is a concept of SAM, not of your
  app.

### `jti`

A unique id for each token. No function in SAM depends on it. It exists so
that you can add protection against replay — see
[Replay protection](#replay-protection).

## Verify the token

All verification occurs on your side. The reference implementation with
[`jose`](https://github.com/panva/jose):

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

// Module scope: the key set caches and refreshes itself
const jsonWebKeySet = createRemoteJWKSet(
  new URL("https://sam.example.com/.well-known/jwks.json"),
);

export const verifySamToken = async (token: string) => {
  const { payload } = await jwtVerify(token, jsonWebKeySet, {
    // Never omit this. A verifier that accepts the token's own `alg`
    // value is not safe.
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

Requirements, with the most important first:

1. **Pin the algorithm to `ES256`.** Without this, an attacker can make a
   verifier accept `none` or an HMAC that is signed with the public key.
2. **Pin `aud` to your own audience string.** Without this, the controller
   of a different embed target can replay the token of a user against your
   app.
3. **Pin `iss`.** This keeps a preview token out of production.
4. **Let the library enforce the expiry.** Each JWT library does this by
   default; do not increase the clock tolerance.
5. **Get the JWKS from the URL and let it refresh.** Do not hardcode the
   key. The `kid` and the key change on rotation, and rotation occurs
   without coordination with you.

## The 5-minute lifetime

The token is a **handshake credential**. SAM makes the token while it
renders the page that contains your iframe on the server. Thus the token is
fresh when your app loads.

Exchange the token for your own session immediately:

1. Your page loads with `?jwt=…`.
2. Verify the token and create your own session (a cookie, for example).
3. **Remove the parameter from the URL** with `history.replaceState()` or
   with a redirect to the clean URL.

Thus the expiry only limits that first load, not the time that the iframe
can stay open: when you have your own session, the token is used up.
SAM does not refresh the token and never will. A new token would mean a new
iframe `src`, which reloads the frame and destroys form state that is in
progress.

Step 3 is mandatory. The token is in a query string. Thus it goes into your
access logs, into the browser history of the user, and into the `Referer`
header of each outbound link on your page. Early removal limits that
exposure; the short lifetime limits the remainder.

## Replay protection

This protection is optional. Add it only if you already have server-side
state with a TTL: record each `jti` that you accepted, and reject repeats.

If you add it, one rule is critical. If you do not obey this rule, you lock
users out:

> Reject a repeated `jti` only when a requester exchanges it for a **new**
> session. Let through a requester that already has a valid session.

A page reload _inside_ the iframe requests the identical URL with the
identical token. A simple "`jti` was seen → reject" rule makes that reload
fail.

You can remove recorded entries after 5 minutes. The `exp` claim rejects a
token that is older.

## Key rotation

The JWKS publishes a `keys` array, but SAM currently holds exactly one key
for each environment. The `kid` is the RFC 7638 thumbprint of the public
key. Thus it changes automatically when the key changes.

The rotation procedure is: deploy the new key, then remove the old key in a
second deploy. In the time between the two deploys, the previous public key
is not published. This is acceptable with 5-minute tokens, and it is a
reason to keep your JWKS cache short-lived and to not pin a key.
`createRemoteJWKSet` and its equivalents get the JWKS again when they see
an unknown `kid`.

## What SAM does not do

- No token refresh, and no mechanism that keeps the embed authenticated
  after the handshake.
- No introspection endpoint and no revocation. A token is valid until it
  expires.
- No encryption (JWE). The claims are the identity and the permissions of
  the user, shown to an app that will operate on them.
- No token for a user without a linked SAM entity (an admin can be in this
  state). The iframe then renders without the parameter. We recommend that
  your app then shows its anonymous behavior.
- No token when the signing key of SAM is not configured in an
  environment. The JWKS then serves `{"keys":[]}`. This is a valid document
  with the meaning "this issuer currently publishes no keys".

## Why the opt-in

A token in a query string is a credential in locations where credentials
must not be: access logs, browser history, `Referer` headers. That risk is
acceptable when the recipient is an app that we control and that obeys the
rules above. It is not acceptable for an arbitrary third party. Thus an
embedded app does not automatically receive a token — a person must enable
it for that app explicitly.

## SAM-side setup

See [Set up the local machine](./setup-local-machine.md#embedded-app-authentication)
to generate a key and to configure it for each environment.
