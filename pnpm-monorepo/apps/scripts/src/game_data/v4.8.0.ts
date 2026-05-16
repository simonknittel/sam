import { prisma } from "@sam-monorepo/database";
import { XMLParser } from "fast-xml-parser";
import fs from "node:fs";
import path from "node:path";

function parseArgs(): { version: string; channel: string; dataFolder: string } {
  const args = process.argv.slice(2);

  if (!args[0] || !args[1] || !args[2]) {
    console.error(
      "Usage: tsx index.ts <game-version> <channel> <data-folder-path>",
    );
    console.error(
      "Example: tsx index.ts 4.8.0 LIVE /mnt/f/installed/Roberts\\ Space\\ Industries/StarCitizen/LIVE/Data",
    );
    process.exit(1);
  }

  return { version: args[0], channel: args[1], dataFolder: args[2] };
}

function parseTranslations(filePath: string): Map<string, string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const translations = new Map<string, string>();

  for (const line of content.split("\n")) {
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    translations.set(key.toLowerCase(), value);
  }

  return translations;
}

function lookupTranslation(
  translations: Map<string, string>,
  prefix: string,
  itemKey: string,
): string | undefined {
  const lowerKey = itemKey.toLowerCase();
  const lowerKeyWithSuffix = `${lowerKey}_scitem`;

  return (
    translations.get(`${prefix}_${lowerKey}`) ??
    translations.get(`${prefix}${lowerKey}`) ??
    translations.get(`${prefix}_${lowerKeyWithSuffix}`) ??
    translations.get(`${prefix}${lowerKeyWithSuffix}`) ??
    translations.get(`${prefix}_${lowerKey},p`) ??
    translations.get(`${prefix}${lowerKey},p`) ??
    translations.get(`${prefix}_${lowerKeyWithSuffix},p`) ??
    translations.get(`${prefix}${lowerKeyWithSuffix},p`)
  );
}

function extractKeys(
  rootTagName: string,
): { originalKey: string; itemKey: string } | null {
  const parts = rootTagName.split(".");
  const lastPart = parts[parts.length - 1];

  if (!lastPart?.startsWith("BP_CRAFT_")) return null;

  const originalKey = lastPart;
  let itemKey = lastPart.slice("BP_CRAFT_".length);

  const scItemSuffix = "_SCItem";
  if (itemKey.endsWith(scItemSuffix)) {
    itemKey = itemKey.slice(0, -scItemSuffix.length);
  }

  return { originalKey, itemKey };
}

function findXmlFiles(directory: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...findXmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".xml")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const { version, channel, dataFolder } = parseArgs();

  console.info(`Importing game files for version: ${version} (${channel})`);
  console.info(`Data folder: ${dataFolder}`);

  const blueprintsDir = path.join(
    dataFolder,
    "Libs",
    "Foundry",
    "Records",
    "crafting",
    "blueprints",
    "crafting",
  );

  if (!fs.existsSync(blueprintsDir)) {
    console.error(`Blueprints directory not found: ${blueprintsDir}`);
    process.exit(1);
  }

  const translationsFile = path.join(
    dataFolder,
    "Localization",
    "english",
    "global.ini",
  );

  if (!fs.existsSync(translationsFile)) {
    console.error(`Translations file not found: ${translationsFile}`);
    process.exit(1);
  }

  console.info("Parsing translations file...");
  const translations = parseTranslations(translationsFile);

  console.info("Finding blueprint XML files...");
  const xmlFiles = findXmlFiles(blueprintsDir);
  console.info(`Found ${xmlFiles.length} XML files`);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const extractedKeys = new Map<string, string>();

  console.info("Parsing XML files...");
  for (const xmlFile of xmlFiles) {
    try {
      const content = fs.readFileSync(xmlFile, "utf-8");
      const result = parser.parse(content);

      const rootTag = Object.keys(result)[0];
      if (!rootTag) continue;

      const keys = extractKeys(rootTag);
      if (keys) {
        extractedKeys.set(keys.itemKey, keys.originalKey);
      }
    } catch (error) {
      console.warn(`Failed to parse ${xmlFile}:`, error);
    }
  }

  console.info(`Extracted ${extractedKeys.size} unique item keys`);

  const items = Array.from(extractedKeys.entries()).map(
    ([itemKey, originalKey]) => ({
      key: itemKey.toLocaleLowerCase(),
      originalKey,
      name: lookupTranslation(translations, "item_name", itemKey) || null,
      description:
        lookupTranslation(translations, "item_desc", itemKey) || null,
    }),
  );

  const gameVersion = await prisma.gameVersion.upsert({
    where: { channel_version: { channel, version } },
    create: { version, channel, dataUpdatedAt: new Date() },
    update: { dataUpdatedAt: new Date() },
  });

  console.info(`GameVersion: ${gameVersion.id} (${version})`);

  console.info("Deleting existing items and blueprints for this version...");
  await prisma.$transaction([
    prisma.blueprint.deleteMany({
      where: { item: { gameVersionId: gameVersion.id } },
    }),

    prisma.item.deleteMany({
      where: { gameVersionId: gameVersion.id },
    }),
  ]);

  console.info("Inserting items...");
  await prisma.item.createMany({
    data: items.map(({ originalKey, ...item }) => ({
      ...item,
      gameVersionId: gameVersion.id,
    })),
  });

  const originalKeyByItemKey = new Map(
    items.map((item) => [item.key, item.originalKey]),
  );

  console.info("Fetching inserted items...");
  const insertedItems = await prisma.item.findMany({
    where: { gameVersionId: gameVersion.id },
    select: { id: true, key: true },
  });

  console.info("Creating blueprints...");
  await prisma.blueprint.createMany({
    data: insertedItems.map((item) => ({
      itemId: item.id,
      originalKey: originalKeyByItemKey.get(item.key)!,
    })),
  });

  console.info(
    `Imported ${items.length} items and ${items.length} blueprints for version ${version}`,
  );
}

void main().then(() => console.info("Finished."));
