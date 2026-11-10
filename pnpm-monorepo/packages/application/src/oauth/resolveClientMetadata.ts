import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import {
  createClientMetadataDocumentSchema,
  getCacheLifetimeInSeconds,
  parseClientId,
} from "./clientMetadataDocument.js";
import { isLoopbackHostname, MAX_URL_LENGTH } from "./constants.js";

export enum ClientMetadataErrorReason {
  InvalidClientId = "invalid_client_id",
  DocumentUnavailable = "document_unavailable",
  InvalidDocument = "invalid_document",
}

/**
 * The client id or its document is not valid. The message tells the reason
 * without data of the response, thus the consent page can show the reason.
 */
export class ClientMetadataError extends ValidationError {
  constructor(
    readonly reason: ClientMetadataErrorReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export const resolveClientMetadataInputSchema = z.object({
  clientId: z.string().max(MAX_URL_LENGTH),
});

export interface ClientMetadata {
  /** The URL of the Client ID Metadata Document */
  readonly clientId: string;
  /** The client gives its name itself, thus the name is not trusted */
  readonly clientName: string;
  readonly redirectUris: readonly string[];
}

/**
 * Gives the metadata of an OAuth client from its Client ID Metadata
 * Document. The document stays in the database until the end of its cache
 * lifetime; after that, the next call fetches it again.
 */
export const resolveClientMetadata = (
  context: ApplicationContext,
  { clientId }: z.infer<typeof resolveClientMetadataInputSchema>,
): Promise<ClientMetadata> =>
  withSpan(context, "resolveClientMetadata", async () => {
    const url = parseClientId(clientId, context.allowInsecureLoopbackClientIds);
    if (!url)
      throw new ClientMetadataError(
        ClientMetadataErrorReason.InvalidClientId,
        "The client ID is not a valid URL of a client metadata document",
      );

    const now = context.now();

    const cachedMetadata = await context.prisma.oAuthClientMetadata.findUnique({
      where: { clientId },
      select: { clientName: true, redirectUris: true, expiresAt: true },
    });
    if (cachedMetadata && cachedMetadata.expiresAt > now)
      return {
        clientId,
        clientName: cachedMetadata.clientName,
        redirectUris: cachedMetadata.redirectUris,
      };

    let response;
    try {
      if (!context.clientMetadata)
        throw new Error("The host cannot fetch client metadata documents");

      response = await context.clientMetadata.fetchDocument(url, {
        allowLoopback:
          context.allowInsecureLoopbackClientIds &&
          isLoopbackHostname(url.hostname),
      });
    } catch (error) {
      context.log.warn("Failed to fetch the client metadata document", {
        clientId,
        error,
      });
      throw new ClientMetadataError(
        ClientMetadataErrorReason.DocumentUnavailable,
        "The client metadata document is not available",
        { cause: error },
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(response.body);
    } catch (error) {
      throw new ClientMetadataError(
        ClientMetadataErrorReason.InvalidDocument,
        "The client metadata document is not valid JSON",
        { cause: error },
      );
    }

    const result = createClientMetadataDocumentSchema(clientId).safeParse(json);
    if (!result.success) {
      context.log.warn("The client metadata document is not valid", {
        clientId,
        issues: result.error.issues.map(({ path, code }) => ({ path, code })),
      });
      throw new ClientMetadataError(
        ClientMetadataErrorReason.InvalidDocument,
        "The client metadata document is not valid",
      );
    }

    const document = result.data;
    const expiresAt = new Date(
      now.getTime() + getCacheLifetimeInSeconds(response.cacheControl) * 1000,
    );
    const data = {
      document,
      clientName: document.client_name,
      redirectUris: document.redirect_uris,
      fetchedAt: now,
      expiresAt,
    };

    await context.prisma.oAuthClientMetadata.upsert({
      where: { clientId },
      create: { clientId, ...data },
      update: data,
      select: { id: true },
    });

    return {
      clientId,
      clientName: document.client_name,
      redirectUris: document.redirect_uris,
    };
  });
