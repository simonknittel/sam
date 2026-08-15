/**
 * Labels match the slash command's block titles (WikiSlashCommand) where a
 * block exists there, so the same block reads the same everywhere.
 */
const NODE_TYPE_LABELS: Readonly<Record<string, string>> = {
  paragraph: "Text",
  bulletList: "Liste",
  orderedList: "Nummerierte Liste",
  taskList: "Aufgabenliste",
  blockquote: "Zitat",
  codeBlock: "Codeblock",
  table: "Tabelle",
  horizontalRule: "Trennlinie",
  details: "Ausklappbarer Abschnitt",
  wikiGrid: "Raster",
  wikiCallout: "Hervorgehobener Block",
  image: "Bild",
  wikiFloatImage: "Umflossenes Bild",
  wikiAttachment: "Dateianhang",
  wikiEmbed: "Einbettung",
  wikiPageLink: "Seitenlink",
  wikiCitizenMention: "Citizen-Erwähnung",
  wikiVariantLink: "Schiff",
  wikiPageIndex: "Seitenverzeichnis",
  wikiRoleCitizens: "Rollenmitglieder",
};

export const getWikiNodeTypeLabel = (
  typeName: string,
  headingLevel?: number | null,
): string => {
  if (typeName === "heading")
    return headingLevel ? `Überschrift ${headingLevel}` : "Überschrift";
  return NODE_TYPE_LABELS[typeName] ?? "Block";
};
