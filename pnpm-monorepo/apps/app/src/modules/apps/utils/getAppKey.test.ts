import { createElement } from "react";
import { describe, expect, test } from "vitest";
import { findAppByKey, getAppKey } from "./getAppKey";
import type { App, ExternalApp, IntegratedApp, RedactedApp } from "./types";

const integratedApp = (slug: string, name = slug): IntegratedApp => ({
  name,
  description: "",
  slug,
  href: `/app/${slug}`,
});

const externalApp = (slug: string, name = slug): ExternalApp => ({
  id: slug,
  name,
  description: "",
  slug,
  defaultPage: { iframeUrl: "https://example.com" },
  team: [],
  icon: createElement("span"),
});

const redactedApp = (name: string): RedactedApp => ({ name, redacted: true });

describe("getAppKey", () => {
  test("namespaces integrated apps", () => {
    expect(getAppKey(integratedApp("dashboard"))).toBe("integrated:dashboard");
  });

  test("namespaces external apps", () => {
    expect(getAppKey(externalApp("silo-request"))).toBe(
      "external:silo-request",
    );
  });

  test("returns nothing for redacted apps", () => {
    expect(getAppKey(redactedApp("Spynet"))).toBeUndefined();
  });

  test("keeps an integrated and an external app with the same slug apart", () => {
    expect(getAppKey(integratedApp("tasks"))).not.toBe(
      getAppKey(externalApp("tasks")),
    );
  });
});

describe("findAppByKey", () => {
  const apps: App[] = [
    integratedApp("tasks", "Tasks"),
    externalApp("tasks", "External Tasks"),
    redactedApp("Redacted"),
  ];

  test("resolves a key to the app of the matching namespace", () => {
    expect(findAppByKey(apps, "external:tasks")?.name).toBe("External Tasks");
  });

  test("returns nothing for a key that no longer resolves to an app", () => {
    expect(findAppByKey(apps, "integrated:removed-app")).toBeUndefined();
  });

  test("returns nothing when there are no apps", () => {
    expect(findAppByKey(null, "integrated:tasks")).toBeUndefined();
  });
});
