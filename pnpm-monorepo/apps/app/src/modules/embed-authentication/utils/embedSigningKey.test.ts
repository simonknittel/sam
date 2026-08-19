import { generateKeyPairSync } from "node:crypto";
import { describe, expect, test } from "vitest";
import {
  createEmbedJsonWebKeySet,
  createEmbedSigningKey,
} from "./embedSigningKey";

const generateBase64EncodedPrivateKeyPem = (namedCurve = "prime256v1") => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve });
  const pem = privateKey.export({ format: "pem", type: "pkcs8" }) as string;

  return Buffer.from(pem).toString("base64");
};

describe("embed signing key", () => {
  test("derives a public JWK without the private component", async () => {
    const signingKey = await createEmbedSigningKey(
      generateBase64EncodedPrivateKeyPem(),
    );

    expect(signingKey.publicJwk).toMatchObject({ kty: "EC", crv: "P-256" });
    expect(signingKey.publicJwk).not.toHaveProperty("d");
  });

  test("derives the same key id for the same key", async () => {
    const base64EncodedPrivateKeyPem = generateBase64EncodedPrivateKeyPem();

    const [first, second] = await Promise.all([
      createEmbedSigningKey(base64EncodedPrivateKeyPem),
      createEmbedSigningKey(base64EncodedPrivateKeyPem),
    ]);

    expect(first.keyId).toBe(second.keyId);
    expect(first.keyId).not.toBe(
      (await createEmbedSigningKey(generateBase64EncodedPrivateKeyPem())).keyId,
    );
  });

  test("rejects a key of the wrong curve", async () => {
    await expect(
      createEmbedSigningKey(generateBase64EncodedPrivateKeyPem("secp384r1")),
    ).rejects.toThrow();
  });

  test("rejects a value that is not a key at all", async () => {
    await expect(
      createEmbedSigningKey(Buffer.from("not a key").toString("base64")),
    ).rejects.toThrow();
  });
});

describe("embed JWKS", () => {
  test("publishes one annotated key with a key id", async () => {
    const signingKey = await createEmbedSigningKey(
      generateBase64EncodedPrivateKeyPem(),
    );

    const jsonWebKeySet = createEmbedJsonWebKeySet(signingKey);

    expect(jsonWebKeySet.keys).toHaveLength(1);
    expect(jsonWebKeySet.keys[0]).toMatchObject({
      kty: "EC",
      crv: "P-256",
      alg: "ES256",
      use: "sig",
      kid: signingKey.keyId,
    });
  });

  test("never exposes private key material", async () => {
    const jsonWebKeySet = createEmbedJsonWebKeySet(
      await createEmbedSigningKey(generateBase64EncodedPrivateKeyPem()),
    );

    expect(jsonWebKeySet.keys[0]).not.toHaveProperty("d");
    expect(JSON.stringify(jsonWebKeySet)).not.toContain('"d"');
  });

  test("is empty but structurally valid without a configured key", () => {
    expect(createEmbedJsonWebKeySet(null)).toEqual({ keys: [] });
  });
});
