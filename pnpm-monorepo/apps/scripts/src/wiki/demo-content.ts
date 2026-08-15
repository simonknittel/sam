import {
  getWikiEditorSchema,
  normalizeWikiEmbedUrl,
  WIKI_CALLOUT_COLORS,
  WIKI_COLOR_LABELS,
  WIKI_HIGHLIGHT_COLORS,
  WIKI_TEXT_COLORS,
} from "@sam-monorepo/wiki-editor";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

/**
 * Generates the Tiptap JSON for a "live demo page" exercising every
 * formatting option and embed the wiki editor supports.
 * Import the output file via the wiki's JSON import (page menu, requires
 * `wiki;manage`) to author/refresh help pages — e.g. a
 * "Formatierungsoptionen" page that documents the editor for users and
 * doubles as a manual regression check: one page rendering every node type
 * in both the editor and the static renderer.
 *
 * The document is validated against the shared editor schema before it is
 * written, so this script fails loudly when extensions change instead of
 * silently drifting out of date.
 *
 * Nodes referencing real records default to documented placeholders —
 * replace them via the flags below (or edit the page after import):
 * page/citizen/tag ids, image and attachment upload ids, the Google
 * document id and the generic-iframe URL. The iframe URL's host must be on
 * the wiki's iframe allowlist BEFORE importing — the import rejects
 * documents containing non-allowlisted iframes.
 */

const HELP = `Generates the wiki's demo page ("Formatierungsoptionen") as Tiptap JSON.

Usage:
  pnpm exec tsx src/wiki/demo-content.ts [options]

Options:
  --out <file>                 Output file (default: wiki-demo-content.json)
  --page-link-id <id>          WikiPage id the internal page link points at.
                               Renders "Nicht verfügbare Seite" until replaced.
  --citizen-id <id>            Entity (citizen) id of the citizen mention.
  --citizen-handle <handle>    Handle stored as the mention's label fallback.
  --image-src <url>            Image URL. Uploaded images live at
                               https://<S3_PUBLIC_URL>/<uploadId>.
  --attachment-upload-id <id>  Upload id of the file attachment card. The
                               download 404s until it points at a real upload
                               assigned to the page.
  --attachment-file-name <n>   File name shown on the attachment card.
  --google-doc-id <id>         Google document id of the Google embed. Google
                               shows an error frame until it points at a
                               publicly readable document.
  --iframe-src <url>           https URL of the generic iframe. Its host must
                               be on the wiki's iframe allowlist before the
                               import, otherwise the import is rejected.
  --tag-ids <ids>              Comma-separated WikiTag ids for the tag-mode
                               page index (default: none — the node renders
                               "Keine Seiten" until configured).
  --help                       Show this help.
`;

const { values: flags } = parseArgs({
  options: {
    out: { type: "string", default: "wiki-demo-content.json" },
    "page-link-id": { type: "string", default: "ersetze-seiten-id" },
    "citizen-id": { type: "string", default: "ersetze-citizen-id" },
    "citizen-handle": { type: "string", default: "Beispiel-Citizen" },
    "image-src": {
      type: "string",
      default: "https://example.com/ersetze-bild-upload-id",
    },
    "attachment-upload-id": {
      type: "string",
      default: "ersetze-anhang-upload-id",
    },
    "attachment-file-name": { type: "string", default: "beispiel.pdf" },
    "google-doc-id": { type: "string", default: "ERSETZE_GOOGLE_DOKUMENT_ID" },
    "iframe-src": {
      type: "string",
      default:
        "https://www.openstreetmap.org/export/embed.html?bbox=6.9578%2C50.9367%2C6.9634%2C50.9395&layer=mapnik",
    },
    "tag-ids": { type: "string", default: "" },
    help: { type: "boolean", default: false },
  },
});

if (flags.help) {
  console.info(HELP);
  process.exit(0);
}

interface DemoMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface DemoNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DemoNode[];
  marks?: DemoMark[];
  text?: string;
}

const text = (value: string, ...marks: DemoMark[]): DemoNode => ({
  type: "text",
  text: value,
  ...(marks.length > 0 ? { marks } : {}),
});

const mark = (type: string, attrs?: Record<string, unknown>): DemoMark => ({
  type,
  ...(attrs ? { attrs } : {}),
});

/** Bare strings become plain text nodes */
const inline = (content: (DemoNode | string)[]): DemoNode[] =>
  content.map((entry) => (typeof entry === "string" ? text(entry) : entry));

const paragraph = (...content: (DemoNode | string)[]): DemoNode => ({
  type: "paragraph",
  ...(content.length > 0 ? { content: inline(content) } : {}),
});

const alignedParagraph = (
  textAlign: "center" | "right",
  ...content: (DemoNode | string)[]
): DemoNode => ({
  type: "paragraph",
  attrs: { textAlign },
  content: inline(content),
});

const smallParagraph = (...content: (DemoNode | string)[]): DemoNode => ({
  type: "paragraph",
  attrs: { textSize: "small" },
  content: inline(content),
});

const heading = (level: 1 | 2 | 3, value: string): DemoNode => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});

const listItem = (...content: DemoNode[]): DemoNode => ({
  type: "listItem",
  content,
});

const taskItem = (checked: boolean, value: string): DemoNode => ({
  type: "taskItem",
  attrs: { checked },
  content: [paragraph(value)],
});

const codeBlock = (language: string, code: string): DemoNode => ({
  type: "codeBlock",
  attrs: { language },
  content: [text(code)],
});

const tableCell = (
  type: "tableHeader" | "tableCell",
  value: string,
): DemoNode => ({
  type,
  content: [paragraph(value)],
});

const tableRow = (
  type: "tableHeader" | "tableCell",
  cells: string[],
): DemoNode => ({
  type: "tableRow",
  content: cells.map((cell) => tableCell(type, cell)),
});

const callout = (color: string, ...content: DemoNode[]): DemoNode => ({
  type: "wikiCallout",
  attrs: { color },
  content,
});

const gridCell = (...content: DemoNode[]): DemoNode => ({
  type: "wikiGridCell",
  content,
});

const grid = (
  columns: 2 | 3 | 4,
  cells: DemoNode[],
  verticalAlign?: "center" | "stretch",
): DemoNode => ({
  type: "wikiGrid",
  attrs: { columns, ...(verticalAlign ? { verticalAlign } : {}) },
  content: cells,
});

const details = (summary: string, ...content: DemoNode[]): DemoNode => ({
  type: "details",
  content: [
    { type: "detailsSummary", content: [text(summary)] },
    { type: "detailsContent", content },
  ],
});

/**
 * Runs a human-facing URL through the same normalization the editor applies
 * on paste, so the stored src always matches what the render-time embed
 * validation expects — and the script fails loudly when the normalization
 * rules change.
 */
const embed = (provider: string, url: string): DemoNode => {
  const normalized = normalizeWikiEmbedUrl(url);
  if (!normalized || normalized.provider !== provider)
    throw new Error(`URL did not normalize to a ${provider} embed: ${url}`);
  return { type: "wikiEmbed", attrs: normalized };
};

const CALLOUT_LABELS: Record<string, string> = {
  neutral: "Neutral",
  blue: "Blau",
  green: "Grün",
  yellow: "Gelb",
  red: "Rot",
};

const tagIds = flags["tag-ids"]
  .split(",")
  .map((tagId) => tagId.trim())
  .filter(Boolean);

const documentContent: DemoNode = {
  type: "doc",
  content: [
    paragraph(
      "Diese Seite zeigt alle Formatierungsoptionen des Wikis im Überblick.",
    ),

    heading(1, "Überschriften"),
    paragraph(
      "Drei Ebenen, per Toolbar oder Slash-Menü (",
      text("/h1", mark("code")),
      " bis ",
      text("/h3", mark("code")),
      "). Jede Überschrift bekommt automatisch einen Anker für Deep-Links.",
    ),
    heading(1, "Überschrift 1"),
    heading(2, "Überschrift 2"),
    heading(3, "Überschrift 3"),

    heading(1, "Textformatierung"),
    paragraph(
      "Text kann ",
      text("fett", mark("bold")),
      ", ",
      text("kursiv", mark("italic")),
      ", ",
      text("unterstrichen", mark("underline")),
      ", ",
      text("durchgestrichen", mark("strike")),
      ", ",
      text("klein", mark("wikiSmallText")),
      ", ",
      text("Code", mark("code")),
      " oder ",
      text("kombiniert", mark("bold"), mark("italic"), mark("underline")),
      " sein — und auf ",
      text(
        "externe Seiten verlinken",
        mark("link", { href: "https://robertsspaceindustries.com" }),
      ),
      ".",
    ),
    paragraph(
      "Textmarker in allen Farben: ",
      ...WIKI_HIGHLIGHT_COLORS.flatMap((color, index) => [
        ...(index > 0 ? [", "] : []),
        text(WIKI_COLOR_LABELS[color], mark("highlight", { color })),
      ]),
      ".",
    ),
    paragraph(
      "Textfarben in allen Tönen: ",
      ...WIKI_TEXT_COLORS.flatMap((color, index) => [
        ...(index > 0 ? [", "] : []),
        text(WIKI_COLOR_LABELS[color], mark("wikiTextColor", { color })),
      ]),
      ".",
    ),
    smallParagraph(
      "Ganze Blöcke lassen sich auf „Kleiner Text“ stellen — anders als die ",
      text("Formatierung", mark("wikiSmallText")),
      " schrumpft dabei auch der Zeilenabstand, was sich erst über mehrere ",
      "Zeilen zeigt: für Bildunterschriften, Fußnoten und Kleingedrucktes.",
    ),
    {
      type: "bulletList",
      attrs: { textSize: "small" },
      content: [
        listItem(paragraph("Listen können ebenfalls klein sein")),
        listItem(paragraph("Der Schalter dafür sitzt im Menü der Liste")),
      ],
    },
    alignedParagraph("center", "Zentrierter Absatz."),
    alignedParagraph("right", "Rechtsbündiger Absatz."),
    paragraph(
      "Ein Zeilenumbruch ohne neuen Absatz (Shift+Enter):",
      { type: "hardBreak" },
      "zweite Zeile im selben Absatz.",
    ),

    heading(1, "Listen"),
    heading(2, "Aufzählung"),
    {
      type: "bulletList",
      content: [
        listItem(paragraph("Erster Punkt")),
        listItem(paragraph("Zweiter Punkt mit Unterpunkten"), {
          type: "bulletList",
          content: [
            listItem(paragraph("Unterpunkt A")),
            listItem(paragraph("Unterpunkt B")),
          ],
        }),
        listItem(paragraph("Dritter Punkt")),
      ],
    },
    heading(2, "Nummerierte Liste"),
    {
      type: "orderedList",
      content: [
        listItem(paragraph("Schritt eins")),
        listItem(paragraph("Schritt zwei")),
        listItem(paragraph("Schritt drei")),
      ],
    },
    heading(2, "Aufgabenliste"),
    {
      type: "taskList",
      content: [
        taskItem(true, "Erledigte Aufgabe"),
        taskItem(false, "Offene Aufgabe"),
        taskItem(false, "Noch eine offene Aufgabe"),
      ],
    },

    heading(1, "Zitate und Trennlinien"),
    {
      type: "blockquote",
      content: [
        paragraph("Zitate heben längere Passagen oder Aussagen hervor."),
        paragraph(text("— Quelle des Zitats", mark("italic"))),
      ],
    },
    paragraph("Eine horizontale Trennlinie:"),
    { type: "horizontalRule" },

    heading(1, "Code"),
    paragraph("Codeblöcke mit Syntaxhervorhebung (Sprache pro Block wählbar):"),
    codeBlock(
      "typescript",
      [
        "interface Ship {",
        "  name: string;",
        "  manufacturer: string;",
        "}",
        "",
        'const carrack: Ship = { name: "Carrack", manufacturer: "Anvil" };',
      ].join("\n"),
    ),
    codeBlock(
      "json",
      ["{", '  "name": "Carrack",', '  "crew": 6', "}"].join("\n"),
    ),

    heading(1, "Tabellen"),
    {
      type: "table",
      content: [
        tableRow("tableHeader", ["Schiff", "Hersteller", "Rolle"]),
        tableRow("tableCell", ["Carrack", "Anvil Aerospace", "Exploration"]),
        tableRow("tableCell", ["Hull C", "MISC", "Fracht"]),
        tableRow("tableCell", ["Hammerhead", "Aegis Dynamics", "Eskorte"]),
      ],
    },

    heading(1, "Aufklappbare Bereiche"),
    details(
      "Klick zum Aufklappen",
      paragraph(
        "Aufklappbare Bereiche halten Seiten übersichtlich — Details bleiben verborgen, bis sie gebraucht werden.",
      ),
    ),

    heading(1, "Raster"),
    paragraph(
      "Raster stellen Inhalte in 2–4 Spalten nebeneinander; auf schmalen Bildschirmen werden sie untereinander gestapelt.",
    ),
    grid(2, [
      gridCell(paragraph("Linke Spalte")),
      gridCell(paragraph("Rechte Spalte")),
    ]),
    grid(
      3,
      [
        gridCell(paragraph("Spalte 1")),
        gridCell(
          paragraph(
            "Spalte 2 mit mehr Inhalt, an der die vertikale Zentrierung sichtbar wird.",
          ),
        ),
        gridCell(paragraph("Spalte 3")),
      ],
      "center",
    ),
    grid(4, [
      gridCell(paragraph("1")),
      gridCell(paragraph("2")),
      gridCell(paragraph("3")),
      gridCell(paragraph("4")),
    ]),
    grid(
      2,
      [
        gridCell(
          callout(
            "blue",
            paragraph(
              "Hinweisboxen in einem gestreckten Raster enden auf gleicher Höhe.",
            ),
          ),
        ),
        gridCell(
          callout(
            "green",
            paragraph(
              "Auch wenn die Inhalte unterschiedlich lang sind: Diese Box hat deutlich mehr Text und bestimmt damit die Höhe der gesamten Zeile, an die sich die anderen Boxen anpassen.",
            ),
          ),
        ),
      ],
      "stretch",
    ),

    heading(1, "Hinweisboxen"),
    ...WIKI_CALLOUT_COLORS.map((color) =>
      callout(
        color,
        paragraph(
          text(`${CALLOUT_LABELS[color] ?? color}: `, mark("bold")),
          "Hinweisboxen heben Inhalte farblich hervor.",
        ),
      ),
    ),

    heading(1, "Bilder"),
    paragraph(
      "Bilder in voller Breite oder verkleinert und ausgerichtet (hier: 50 % Breite, zentriert):",
    ),
    {
      type: "image",
      attrs: {
        src: flags["image-src"],
        alt: "Beispielbild",
        title: "Beispielbild",
      },
    },
    {
      type: "image",
      attrs: {
        src: flags["image-src"],
        alt: "Verkleinertes Beispielbild",
        widthPx: 400,
        align: "center",
      },
    },

    heading(1, "Videos und Embeds"),
    heading(2, "YouTube"),
    embed("youtube", "https://www.youtube.com/watch?v=v0Ufvgr8sTI"),
    heading(2, "Twitch"),
    embed("twitch", "https://www.twitch.tv/starcitizen"),
    heading(2, "Spotify"),
    embed("spotify", "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"),
    heading(2, "Google Docs"),
    embed(
      "google",
      `https://docs.google.com/document/d/${flags["google-doc-id"]}/edit`,
    ),
    heading(2, "Generisches iframe"),
    paragraph(
      "Beliebige Seiten lassen sich einbetten, solange ihre Domain auf der Allowlist in den Wiki-Einstellungen steht:",
    ),
    {
      type: "wikiEmbed",
      attrs: { provider: "iframe", src: flags["iframe-src"] },
    },

    heading(1, "Verweise"),
    paragraph(
      "Interne Links zeigen immer den aktuellen Seitentitel und überstehen Umbenennungen: ",
      { type: "wikiPageLink", attrs: { pageId: flags["page-link-id"] } },
      ".",
    ),
    paragraph(
      "Citizen lassen sich mit @ erwähnen und verlinken ins Spynet: ",
      {
        type: "wikiCitizenMention",
        attrs: {
          citizenId: flags["citizen-id"],
          handle: flags["citizen-handle"],
        },
      },
      ".",
    ),

    heading(1, "Seitenverzeichnis"),
    paragraph(
      "Listet Unterseiten der aktuellen Seite auf (Baummodus, unbegrenzte Tiefe):",
    ),
    {
      type: "wikiPageIndex",
      attrs: {
        mode: "tree",
        rootPageId: null,
        maxDepth: null,
        tagIds: [],
        matchMode: "all",
      },
    },
    paragraph("Oder alle Seiten mit bestimmten Tags (Tag-Modus):"),
    {
      type: "wikiPageIndex",
      attrs: {
        mode: "tags",
        rootPageId: null,
        maxDepth: null,
        tagIds,
        matchMode: "any",
      },
    },

    heading(1, "Dateianhänge"),
    paragraph(
      "Nicht-Bild-Dateien erscheinen als Download-Karte. Der Download ist berechtigungsgeprüft — nur wer die Seite sehen kann, kann die Datei laden:",
    ),
    {
      type: "wikiAttachment",
      attrs: {
        uploadId: flags["attachment-upload-id"],
        fileName: flags["attachment-file-name"],
        size: 2_345_678,
        mimeType: "application/pdf",
      },
    },
  ],
};

/**
 * Validate against the shared editor schema — the exact check the JSON
 * import applies — and write the normalized round-tripped JSON, so the
 * output is byte-identical to what the app would store.
 */
const documentNode = getWikiEditorSchema().nodeFromJSON(documentContent);
documentNode.check();

const outPath = resolve(flags.out);
await writeFile(outPath, `${JSON.stringify(documentNode.toJSON(), null, 2)}\n`);

console.info(`Demo page written to ${outPath}`);
console.info(
  "Import it via the wiki's JSON import (page menu, requires wiki;manage).",
);
console.info(
  `Before importing, make sure the iframe host is on the wiki's iframe allowlist: ${new URL(flags["iframe-src"]).hostname}`,
);
console.info(
  "Replace the placeholder references after import (see --help for the flags): page link, citizen mention, images, attachment, Google document, tags.",
);
