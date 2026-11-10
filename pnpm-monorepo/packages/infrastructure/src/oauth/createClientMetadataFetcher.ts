import type {
  ClientMetadataDocumentResponse,
  ClientMetadataFetcher,
} from "@sam-monorepo/application";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import {
  createValidatingLookup,
  isLoopbackAddress,
  isPublicAddress,
} from "./publicAddress.js";

/** A client metadata document has a few short fields */
const MAX_DOCUMENT_SIZE_IN_BYTES = 5 * 1024;

const TIMEOUT_IN_MILLISECONDS = 5000;

const isJsonMediaType = (contentType: string | undefined) => {
  const mediaType = contentType?.split(";")[0]?.trim().toLowerCase();

  return mediaType === "application/json" || !!mediaType?.endsWith("+json");
};

const readBody = (response: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    response.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_DOCUMENT_SIZE_IN_BYTES) {
        response.destroy(new Error("The document is too large"));
        return;
      }

      chunks.push(chunk);
    });
    response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    response.on("error", reject);
    response.on("close", () => {
      if (!response.complete)
        reject(new Error("The connection closed before the end of the body"));
    });
  });

const fetchDocument = async (
  url: URL,
  { allowLoopback }: { readonly allowLoopback: boolean },
): Promise<ClientMetadataDocumentResponse> => {
  const isPermittedAddress = (address: string) =>
    isPublicAddress(address) || (allowLoopback && isLoopbackAddress(address));

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname) && !isPermittedAddress(hostname))
    throw new Error(`The address ${hostname} is not permitted`);

  const request = url.protocol === "https:" ? httpsRequest : httpRequest;

  const response = await new Promise<IncomingMessage>((resolve, reject) => {
    request(
      url,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        lookup: createValidatingLookup(isPermittedAddress),
        // A pooled socket of the global agent could come from a request
        // without the validating lookup
        agent: false,
        signal: AbortSignal.timeout(TIMEOUT_IN_MILLISECONDS),
      },
      resolve,
    )
      .on("error", reject)
      .end();
  });

  try {
    // A redirect could lead to an address that is not permitted
    if (response.statusCode !== 200)
      throw new Error(`The response has the status ${response.statusCode}`);

    if (!isJsonMediaType(response.headers["content-type"]))
      throw new Error("The response is not JSON");

    if (Number(response.headers["content-length"]) > MAX_DOCUMENT_SIZE_IN_BYTES)
      throw new Error("The document is too large");

    return {
      body: await readBody(response),
      cacheControl: response.headers["cache-control"],
    };
  } finally {
    response.destroy();
  }
};

/**
 * Fetches the Client ID Metadata Documents without a Server-Side Request
 * Forgery: only public addresses (or the loopback interface, when
 * `allowLoopback` is set), no redirects, a timeout and a size limit.
 * `fetch()` cannot validate the address at connect time, thus the fetcher
 * uses `node:http` with a validating `lookup`.
 */
export const createClientMetadataFetcher = (): ClientMetadataFetcher => ({
  fetchDocument,
});
