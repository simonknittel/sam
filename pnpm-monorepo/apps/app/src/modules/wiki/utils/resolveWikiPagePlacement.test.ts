import { describe, expect, test } from "vitest";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "./resolveWikiPagePlacement";

interface Page {
  readonly id: string;
  readonly deletedAt?: Date;
  readonly canAdmin?: boolean;
}

const context = (pages: readonly Page[]) => ({
  pagesById: new Map(
    pages.map((page) => [page.id, { deletedAt: page.deletedAt ?? null }]),
  ),
  permissions: new Map(
    pages.map((page) => [page.id, { canAdmin: page.canAdmin === true }]),
  ),
});

describe("resolveWikiPagePlacement", () => {
  test("allows a managed page as target", () => {
    expect(
      resolveWikiPagePlacement(
        context([{ id: "target", canAdmin: true }]),
        "target",
      ),
    ).toBe(WikiPagePlacement.Allowed);
  });

  test("rejects a page the viewer only reads or edits", () => {
    // Edit and read both resolve to canAdmin false — the tier that used to
    // be enough here and is exactly what this check closes off.
    expect(
      resolveWikiPagePlacement(
        context([{ id: "target", canAdmin: false }]),
        "target",
      ),
    ).toBe(WikiPagePlacement.Forbidden);
  });

  test("rejects the reported escalation: parent readable, subpage editable", () => {
    const pages = context([
      { id: "parent", canAdmin: false },
      { id: "subpage", canAdmin: false },
    ]);

    expect(resolveWikiPagePlacement(pages, "subpage")).toBe(
      WikiPagePlacement.Forbidden,
    );
  });

  test("reports a page in the trash as missing, not forbidden", () => {
    // The actions map missing onto "not found"/"bad request" and forbidden
    // onto "forbidden", so the two must stay distinguishable.
    expect(
      resolveWikiPagePlacement(
        context([
          { id: "target", canAdmin: true, deletedAt: new Date("2026-01-01") },
        ]),
        "target",
      ),
    ).toBe(WikiPagePlacement.Missing);
  });

  test("reports an unknown page as missing", () => {
    expect(resolveWikiPagePlacement(context([]), "nope")).toBe(
      WikiPagePlacement.Missing,
    );
  });

  test("reports a page without resolved permissions as forbidden", () => {
    const pages = {
      pagesById: new Map([["target", { deletedAt: null }]]),
      permissions: new Map<string, { canAdmin: boolean }>(),
    };

    expect(resolveWikiPagePlacement(pages, "target")).toBe(
      WikiPagePlacement.Forbidden,
    );
  });
});
