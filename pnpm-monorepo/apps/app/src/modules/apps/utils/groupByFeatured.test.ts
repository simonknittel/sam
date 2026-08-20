import { createElement } from "react";
import { describe, expect, test } from "vitest";
import { groupByFeatured } from "./groupByFeatured";
import type { App, ExternalApp, IntegratedApp, RedactedApp } from "./types";

const integratedApp = (
  slug: string,
  name: string,
  tags?: string[],
): IntegratedApp => ({
  name,
  description: "",
  slug,
  href: `/app/${slug}`,
  tags,
});

const externalApp = (
  slug: string,
  name: string,
  tags?: string[],
): ExternalApp => ({
  id: slug,
  name,
  description: "",
  slug,
  tags,
  defaultPage: { iframeUrl: "https://example.com" },
  team: [],
  icon: createElement("span"),
});

const redactedApp = (name: string): RedactedApp => ({ name, redacted: true });

const names = (apps: App[] | undefined) => apps?.map((app) => app.name);

describe("groupByFeatured", () => {
  const apps: App[] = [
    integratedApp("wiki", "Wiki", ["featured"]),
    integratedApp("account", "Account", ["System"]),
    externalApp("silo-request", "SILO-Anfrage", ["featured"]),
    redactedApp("Redacted"),
  ];

  test("returns an empty favorites group without favorites", () => {
    expect(names(groupByFeatured(apps).favorites)).toEqual([]);
  });

  test("sorts favorites alphabetically", () => {
    const { favorites } = groupByFeatured(
      apps,
      new Set(["integrated:wiki", "integrated:account"]),
    );

    expect(names(favorites)).toEqual(["Account", "Wiki"]);
  });

  test("keeps favorited apps in their original group", () => {
    const { featured, other } = groupByFeatured(
      apps,
      new Set(["integrated:wiki", "integrated:account"]),
    );

    expect(names(featured)).toEqual(["SILO-Anfrage", "Wiki"]);
    expect(names(other)).toEqual(["Account", "Redacted"]);
  });

  test("ignores a favorite key that no longer resolves to an app", () => {
    const { favorites } = groupByFeatured(
      apps,
      new Set(["integrated:removed-app"]),
    );

    expect(names(favorites)).toEqual([]);
  });

  test("only favorites the app of the matching namespace when slugs collide", () => {
    const collidingApps: App[] = [
      integratedApp("tasks", "Tasks"),
      externalApp("tasks", "External Tasks"),
    ];

    const { favorites } = groupByFeatured(
      collidingApps,
      new Set(["external:tasks"]),
    );

    expect(names(favorites)).toEqual(["External Tasks"]);
  });

  test("never favorites a redacted app", () => {
    const { favorites } = groupByFeatured(apps, new Set(["Redacted"]));

    expect(names(favorites)).toEqual([]);
  });

  test("returns nothing when there are no apps", () => {
    expect(groupByFeatured(null).favorites).toBeUndefined();
  });
});
