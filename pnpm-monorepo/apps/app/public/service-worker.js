self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo-white-on-black.png",
      data: data.url,
    }),
  );
});

/**
 * Accepts only a URL of the app's own origin, so that a push payload cannot
 * open a different site. A relative URL resolves against the origin.
 */
const toSameOriginUrl = (value) => {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.href : null;
  } catch {
    return null;
  }
};

/**
 * Shows the URL in the most recently focused app window, or opens a new
 * window if no app window is open. Only a window that this worker controls
 * can navigate, thus matchAll() leaves out the other windows.
 */
const showUrl = async (url) => {
  const windowClients = await self.clients.matchAll({ type: "window" });
  const windowClient =
    windowClients.find((client) => client.url === url) ?? windowClients[0];

  if (!windowClient) {
    await self.clients.openWindow(url);
    return;
  }

  // The browser allows focus() only for a short time after the click, thus
  // focus before the navigation.
  await windowClient.focus();
  if (windowClient.url !== url) await windowClient.navigate(url);
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = toSameOriginUrl(event.notification.data);
  if (!url) return;

  event.waitUntil(showUrl(url));
});
