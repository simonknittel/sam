// Prints the lines of the root .env that let the local Grafana verify the
// embed tokens of the app:
//
//   node grafana-env.mjs <path of the app .env>
//
// SAM_GRAFANA_JWK_SET_VALUE is the base64 of the JSON Web Key Set that the
// app publishes at /.well-known/jwks.json (see createEmbedJsonWebKeySet() in
// pnpm-monorepo/apps/app/src/modules/embed-authentication/utils/embedSigningKey.ts).
// Without EMBED_JWT_PRIVATE_KEY, the key set is empty and Grafana refuses
// every token. SAM_GRAFANA_APP_BASE_URL is the issuer of the tokens.
//
// The output contains only the public key. Do not print the output.
import { createHash, createPrivateKey, createPublicKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// The default of NEXT_PUBLIC_BASE_URL in pnpm-monorepo/apps/app/src/env.ts
const DEFAULT_APP_BASE_URL = "http://localhost:3000";

const createJsonWebKeySet = (base64EncodedPrivateKeyPem) => {
  if (!base64EncodedPrivateKeyPem) return { keys: [] };

  const privateKey = createPrivateKey(
    Buffer.from(base64EncodedPrivateKeyPem, "base64").toString("utf8"),
  );
  const { kty, crv, x, y } = createPublicKey(privateKey).export({
    format: "jwk",
  });
  if (kty !== "EC" || crv !== "P-256")
    throw new Error("EMBED_JWT_PRIVATE_KEY must be an EC P-256 key");

  // RFC 7638 thumbprint: the required members in lexicographic order. The
  // app sets the same value as the `kid` of its tokens.
  const keyId = createHash("sha256")
    .update(JSON.stringify({ crv, kty, x, y }))
    .digest("base64url");

  return { keys: [{ kty, crv, x, y, alg: "ES256", use: "sig", kid: keyId }] };
};

const appEnvPath = process.argv[2];
if (!appEnvPath) throw new Error("Give the path of the app .env");

const appEnv = existsSync(appEnvPath)
  ? parseEnv(readFileSync(appEnvPath, "utf8"))
  : {};

const jsonWebKeySet = createJsonWebKeySet(appEnv.EMBED_JWT_PRIVATE_KEY);

process.stdout.write(
  [
    `SAM_GRAFANA_JWK_SET_VALUE=${Buffer.from(JSON.stringify(jsonWebKeySet)).toString("base64")}`,
    `SAM_GRAFANA_APP_BASE_URL=${appEnv.NEXT_PUBLIC_BASE_URL || DEFAULT_APP_BASE_URL}`,
    "",
  ].join("\n"),
);
