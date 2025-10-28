import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  requestId: string | null;
};

/**
 * Some data is needed in several places of our functions. To prevent prop
 * drilling, we want to cache/memorize it on a per-request basis. We can use
 * the `AsyncLocalStorage` API from Node.js to achieve this.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

export const initializeRequestContext = <T>(
  requestId: string | null,
  callback: () => T,
) => {
  return requestContext.run(
    {
      requestId,
    },
    callback,
  );
};

export const getRequestContext = () => {
  const store = requestContext.getStore();

  if (!store)
    throw new Error(
      "This function needs to be called from within our request context (`initializeRequestContext(context.awsRequestId, () => { ... })`)",
    );

  return store;
};

export const disableRequestContext = () => {
  requestContext.disable();
};
