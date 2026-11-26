import { describe, expect, test } from "vitest";
import { createApplicationUrls } from "../context.js";
import {
  createClientMetadataDocumentSchema,
  getCacheLifetimeInSeconds,
  parseClientId,
} from "./clientMetadataDocument.js";
import { getDesktopCompanionClientMetadataDocument } from "./desktopCompanionClient.js";

const CLIENT_ID = "https://claude.ai/oauth/mcp-oauth-client-metadata";

const DOCUMENT = {
  client_id: CLIENT_ID,
  client_name: "Claude",
  redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
  token_endpoint_auth_method: "none",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  unknown_field: "ignored",
};

describe("the client metadata document", () => {
  const schema = createClientMetadataDocumentSchema(CLIENT_ID);

  test("accepts a valid document and removes unknown fields", () => {
    const result = schema.safeParse(DOCUMENT);

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("unknown_field");
  });

  test("accepts the document of the desktop companion, which the app knows without a fetch", () => {
    const context = {
      urls: createApplicationUrls({
        baseUrl: "http://localhost:3000",
        publicUploadBaseUrl: "",
      }),
    };
    const document = getDesktopCompanionClientMetadataDocument(context);

    expect(
      createClientMetadataDocumentSchema(document.client_id).safeParse(document)
        .success,
    ).toBe(true);
  });

  test("refuses a client_id that is not the URL of the document", () => {
    expect(
      schema.safeParse({ ...DOCUMENT, client_id: `${CLIENT_ID}/other` })
        .success,
    ).toBe(false);
  });

  test("refuses more than 10 redirect URIs", () => {
    expect(
      schema.safeParse({
        ...DOCUMENT,
        redirect_uris: Array.from(
          { length: 11 },
          (_value, index) => `https://claude.ai/callback/${index}`,
        ),
      }).success,
    ).toBe(false);
  });

  test("refuses a client with a secret", () => {
    expect(
      schema.safeParse({
        ...DOCUMENT,
        token_endpoint_auth_method: "client_secret_basic",
      }).success,
    ).toBe(false);
  });

  test("accepts a client that lists the public method next to another default (ChatGPT)", () => {
    expect(
      schema.safeParse({
        ...DOCUMENT,
        token_endpoint_auth_method: "private_key_jwt",
        token_endpoint_auth_methods_supported: ["none", "private_key_jwt"],
      }).success,
    ).toBe(true);
  });
});

describe("parseClientId", () => {
  test("accepts an https URL with a path", () => {
    expect(parseClientId(CLIENT_ID, false)?.href).toBe(CLIENT_ID);
  });

  test("refuses URLs that are not a document URL", () => {
    for (const clientId of [
      "https://claude.ai/",
      "https://claude.ai",
      "https://claude.ai/a/../metadata",
      "https://user:password@claude.ai/metadata",
      "https://claude.ai/metadata#fragment",
      "http://claude.ai/metadata",
      "http://localhost:1234/metadata",
    ])
      expect(parseClientId(clientId, false), clientId).toBeNull();
  });

  test("accepts http on a loopback host only with the test flag", () => {
    expect(
      parseClientId("http://127.0.0.1:1234/metadata", true),
    ).not.toBeNull();
    expect(parseClientId("http://example.com/metadata", true)).toBeNull();
  });
});

describe("getCacheLifetimeInSeconds", () => {
  test("keeps a document within the limits of the cache", () => {
    for (const [cacheControl, expectedLifetime] of [
      [undefined, 60 * 60],
      ["public, max-age=600", 600],
      ["max-age=0", 60],
      ["max-age=31536000", 24 * 60 * 60],
      ["no-store", 60],
      ["public, no-cache, max-age=600", 60],
      ['no-cache="Set-Cookie", max-age=600', 60],
    ] as const)
      expect(getCacheLifetimeInSeconds(cacheControl), cacheControl).toBe(
        expectedLifetime,
      );
  });
});
