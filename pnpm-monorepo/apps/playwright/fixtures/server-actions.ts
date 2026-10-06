import type { Page, Request } from "@playwright/test";

/** A server action posts to the address of the page that it runs on */
export const isServerActionRequest = (request: Request, path: string) =>
  request.method() === "POST" &&
  new URL(request.url()).pathname === path &&
  request.headers()["next-action"] !== undefined;

/** Collects the server actions that the page at the path sends from now on */
export const recordServerActions = (page: Page, path: string) => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (isServerActionRequest(request, path)) requests.push(request);
  });
  return requests;
};

/**
 * Holds the server actions of the page at the path in the browser until the
 * test calls the returned function. Thus the test can act while a save runs.
 */
export const holdServerActions = async (page: Page, path: string) => {
  const { promise: released, resolve: release } = Promise.withResolvers<void>();
  await page.route(
    (url) => url.pathname === path,
    async (route) => {
      if (isServerActionRequest(route.request(), path)) await released;
      await route.continue();
    },
  );
  return release;
};
