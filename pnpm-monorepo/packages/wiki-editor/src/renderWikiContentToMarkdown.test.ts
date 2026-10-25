import { describe, expect, test } from "vitest";
import {
  renderWikiContentToMarkdown,
  type WikiMarkdownOptions,
} from "./renderWikiContentToMarkdown.js";

const BASE_URL = "https://sam.example.com";

const render = (
  content: readonly unknown[],
  options: Partial<WikiMarkdownOptions> = {},
) =>
  renderWikiContentToMarkdown(
    { type: "doc", content },
    { baseUrl: BASE_URL, ...options },
  );

const text = (value: string, marks?: readonly unknown[]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});

const paragraph = (...content: unknown[]) => ({ type: "paragraph", content });

describe("renderWikiContentToMarkdown", () => {
  test("renders the standard blocks and marks as Markdown", () => {
    expect(
      render([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [text("Ablauf & Ziele")],
        },
        paragraph(
          text("Fett", [{ type: "bold" }]),
          text(", "),
          text("kursiv", [{ type: "italic" }]),
          text(", "),
          text("Code", [{ type: "code" }]),
          text(" und "),
          text("Link", [
            { type: "link", attrs: { href: "https://example.com" } },
          ]),
        ),
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                paragraph(text("Eins")),
                {
                  type: "orderedList",
                  attrs: { start: 3 },
                  content: [
                    { type: "listItem", content: [paragraph(text("Drei"))] },
                    { type: "listItem", content: [paragraph(text("Vier"))] },
                  ],
                },
              ],
            },
            { type: "listItem", content: [paragraph(text("Zwei"))] },
          ],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [paragraph(text("Erledigt"))],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [paragraph(text("Offen"))],
            },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: "json" },
          content: [text('{ "a": 1 }')],
        },
      ]),
    ).toBe(
      [
        "## Ablauf & Ziele",
        "",
        "**Fett**, _kursiv_, `Code` und [Link](https://example.com/)",
        "",
        "- Eins",
        "  3. Drei",
        "  4. Vier",
        "- Zwei",
        "",
        "- [x] Erledigt",
        "- [ ] Offen",
        "",
        "```json",
        '{ "a": 1 }',
        "```",
        "",
      ].join("\n"),
    );
  });

  test("renders a table as a Markdown table", () => {
    const cell = (type: string, value: string) => ({
      type,
      content: [paragraph(text(value))],
    });

    expect(
      render([
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                cell("tableHeader", "Schiff"),
                cell("tableHeader", "Rolle"),
              ],
            },
            {
              type: "tableRow",
              content: [
                cell("tableCell", "Carrack"),
                cell("tableCell", "A \\ B | C"),
              ],
            },
          ],
        },
      ]),
    ).toBe("| Schiff | Rolle |\n| --- | --- |\n| Carrack | A \\\\ B \\| C |\n");
  });

  test("renders a callout as a block quote with a label", () => {
    expect(
      render([
        {
          type: "wikiCallout",
          attrs: { color: "red" },
          content: [paragraph(text("Achtung")), paragraph(text("Zweiter"))],
        },
      ]),
    ).toBe("> **Hinweis (Rot)**\n>\n> Achtung\n>\n> Zweiter\n");
  });

  test("renders a citizen mention as @handle", () => {
    expect(
      render(
        [
          paragraph(
            { type: "wikiCitizenMention", attrs: { citizenId: "c1" } },
            text(" und "),
            {
              type: "wikiCitizenMention",
              attrs: { citizenId: "c2", handle: "Gespeichert" },
            },
            text(" und "),
            { type: "wikiCitizenMention", attrs: { citizenId: "c3" } },
          ),
        ],
        { citizens: { c1: { handle: "Aktuell" } } },
      ),
    ).toBe("@Aktuell und @Gespeichert und @Unbekannt\n");
  });

  test("renders page links and variant links as links to the app", () => {
    expect(
      render(
        [
          paragraph(
            { type: "wikiPageLink", attrs: { pageId: "p1" } },
            text(", "),
            { type: "wikiPageLink", attrs: { pageId: "hidden" } },
            text(", "),
            {
              type: "wikiVariantLink",
              attrs: { variantId: "v1", name: "Carrack" },
            },
          ),
        ],
        {
          pages: {
            p1: {
              title: "Regeln [neu] ¯\\_(ツ)_/¯",
              slug: "regeln-neu",
              href: "/app/wiki/p1/regeln-neu",
            },
            hidden: null,
          },
        },
      ),
    ).toBe(
      "[Regeln \\[neu\\] ¯\\\\_(ツ)_/¯](https://sam.example.com/app/wiki/p1/regeln-neu), [Nicht verfügbare Seite], [Carrack](https://sam.example.com/app/fleet/variant/v1)\n",
    );
  });

  test("renders embeds as links and blocks the ones that are not allowed", () => {
    expect(
      render(
        [
          {
            type: "wikiEmbed",
            attrs: {
              provider: "youtube",
              src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90",
            },
          },
          {
            type: "wikiEmbed",
            attrs: {
              provider: "twitch",
              src: "https://player.twitch.tv/?channel=starcitizen&autoplay=false",
            },
          },
          {
            type: "wikiEmbed",
            attrs: { provider: "iframe", src: "https://maps.example.org/a" },
          },
          {
            type: "wikiEmbed",
            attrs: { provider: "iframe", src: "https://evil.example.net/" },
          },
        ],
        { iframeAllowlist: ["example.org"] },
      ),
    ).toBe(
      [
        "[Einbettung: YouTube](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s)",
        "",
        "[Einbettung: Twitch](https://www.twitch.tv/starcitizen)",
        "",
        "[Einbettung: maps.example.org](https://maps.example.org/a)",
        "",
        "[Blockierte Einbettung]",
        "",
      ].join("\n"),
    );
  });

  test("renders attachments as links to the download route and images as images", () => {
    expect(
      render([
        {
          type: "wikiAttachment",
          attrs: { uploadId: "u1", fileName: "Plan.pdf", size: 2048 },
        },
        {
          type: "image",
          attrs: { src: "https://files.example.com/u2", alt: "Karte" },
        },
        { type: "image", attrs: { src: "javascript:alert(1)", alt: "" } },
      ]),
    ).toBe(
      [
        "[Plan.pdf (2 KB)](https://sam.example.com/api/wiki/attachment/u1)",
        "",
        "![Karte](https://files.example.com/u2)",
        "",
        "[Bild]",
        "",
      ].join("\n"),
    );
  });

  test("renders the columns of a grid in sequence", () => {
    expect(
      render([
        {
          type: "wikiGrid",
          attrs: { columns: 2 },
          content: [
            { type: "wikiGridCell", content: [paragraph(text("Links"))] },
            { type: "wikiGridCell", content: [paragraph(text("Rechts"))] },
          ],
        },
      ]),
    ).toBe("Links\n\nRechts\n");
  });

  test("renders the page index, role members and unknown nodes as placeholders", () => {
    expect(
      render([
        { type: "wikiPageIndex" },
        { type: "wikiRoleCitizens", attrs: { roleId: "r1" } },
        { type: "somethingNew", content: [paragraph(text("Geheim"))] },
      ]),
    ).toBe(
      "[Seitenverzeichnis]\n\n[Mitglieder einer Rolle]\n\n[Nicht unterstützter Inhalt]\n",
    );
  });

  test("renders empty content as an empty string", () => {
    expect(renderWikiContentToMarkdown(null, { baseUrl: BASE_URL })).toBe("");
    expect(render([{ type: "paragraph" }])).toBe("");
  });
});
