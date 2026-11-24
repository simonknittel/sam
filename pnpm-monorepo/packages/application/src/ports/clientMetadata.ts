export interface ClientMetadataDocumentResponse {
  readonly body: string;
  readonly cacheControl: string | undefined;
}

/**
 * Fetches the Client ID Metadata Documents of the OAuth clients. The client
 * id is user input, thus the implementation must prevent a Server-Side
 * Request Forgery.
 */
export interface ClientMetadataFetcher {
  /**
   * Only a public address is permitted, and with `allowLoopback` also the
   * loopback interface.
   *
   * Throws an `Error` with an English message for each failure. The message
   * can contain the hostname, but no data of the response.
   */
  readonly fetchDocument: (
    url: URL,
    options: { readonly allowLoopback: boolean },
  ) => Promise<ClientMetadataDocumentResponse>;
}
