import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  prisma,
  type Entity,
  type Organization,
  type OrganizationMembershipHistoryEntry,
} from "@sam-monorepo/database";
import { parse } from "csv";
import { parse as dateParse } from "date-fns/parse";
import { createReadStream } from "node:fs";
import path from "node:path";

type Row = [
  string, // Spectrum ID
  string, // Beitritt
  string, // Verlassen
  string, // Main
  string, // Affiliate 1
  string, // Affiliate 2
  string, // Affiliate 3
  string, // Affiliate 4
  string, // Affiliate 5
  string, // Affiliate 6
  string, // Affiliate 7
  string, // Affiliate 8
  string, // Affiliate 9
];

const SINISTER = "S1NISTER";
const OWNER = "clog1zezo04isul0nfes57hmo";

async function main() {
  await prisma.organization.deleteMany();

  const rows: Row[] = [];

  await new Promise<void>((resolve, reject) => {
    createReadStream(path.resolve(__dirname, "./data.csv"))
      .pipe(parse({ delimiter: ",", fromLine: 2 }))
      .on("data", (row: Row) => {
        rows.push(row);
      })
      .on("error", (err) => {
        console.error(err);
        reject(new Error("Reading CSV failed."));
      })
      .on("end", () => {
        resolve();
      });
  });

  const sinisterOrg = await getOrg(SINISTER);

  for (const row of rows) {
    const spectrumId = row[0];

    const { beitritt, verlassen } = parseDates(row);

    const citizen = await prisma.entity.findFirst({
      where: {
        spectrumId,
      },
    });

    if (!citizen) {
      console.warn(`Citizen not found. spectrumId: ${spectrumId}`);
      continue;
    }

    const orgs = [
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10],
      row[11],
      row[12],
    ]
      .filter(Boolean)
      .map((spectrumId) => spectrumId.trim())
      .filter(Boolean)
      .filter((spectrumId) => spectrumId !== "Redacted");

    // eslint-disable-next-line
    for (const [index, spectrumId] of orgs.entries()) {
      const org = spectrumId.match(/Sinister/)
        ? sinisterOrg
        : await getOrg(spectrumId);
      const main = index === 0;
      const redacted = spectrumId.match(/ \([RH]{1}\)/);

      await prisma.organizationMembershipHistoryEntry.create({
        data: {
          organizationId: org.id,
          citizenId: citizen.id,
          type: main
            ? OrganizationMembershipType.MAIN
            : OrganizationMembershipType.AFFILIATE,
          visibility: redacted
            ? OrganizationMembershipVisibility.REDACTED
            : OrganizationMembershipVisibility.PUBLIC,
          createdAt: new Date(),
          createdById: OWNER,
          confirmed: ConfirmationStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: OWNER,
        },
      });
    }

    const siniserEntry =
      await prisma.organizationMembershipHistoryEntry.findFirst({
        where: {
          organizationId: sinisterOrg.id,
          citizenId: citizen.id,
        },
      });

    if (beitritt) {
      if (siniserEntry) {
        await prisma.organizationMembershipHistoryEntry.update({
          where: {
            id: siniserEntry.id,
          },
          data: {
            createdAt: beitritt,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: beitritt,
            confirmedById: OWNER,
          },
        });
      } else {
        await prisma.organizationMembershipHistoryEntry.create({
          data: {
            organizationId: sinisterOrg.id,
            citizenId: citizen.id,
            type: OrganizationMembershipType.MAIN,
            visibility: OrganizationMembershipVisibility.REDACTED,
            createdAt: beitritt,
            createdById: OWNER,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: beitritt,
            confirmedById: OWNER,
          },
        });
      }
    }

    if (verlassen) {
      if (siniserEntry) {
        await prisma.organizationMembershipHistoryEntry.update({
          where: {
            id: siniserEntry.id,
          },
          data: {
            type: OrganizationMembershipType.LEFT,
            createdAt: verlassen,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: verlassen,
            confirmedById: OWNER,
          },
        });
      } else {
        await prisma.organizationMembershipHistoryEntry.create({
          data: {
            organizationId: sinisterOrg.id,
            citizenId: citizen.id,
            type: OrganizationMembershipType.LEFT,
            visibility: OrganizationMembershipVisibility.PUBLIC,
            createdAt: verlassen,
            createdById: OWNER,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: verlassen,
            confirmedById: OWNER,
          },
        });
      }
    }

    await updateActiveMembership(citizen.id);
  }
}

const getOrg = async (spectrumId: string) => {
  const cleanedSpectrumId = spectrumId.replace(/\([HR]\)/g, "").trim();

  const existingOrg = await prisma.organization.findUnique({
    where: {
      spectrumId: cleanedSpectrumId,
    },
  });

  if (!existingOrg) {
    // Get org name
    let name = cleanedSpectrumId;
    let logo = null;

    const response = await fetch(
      `https://robertsspaceindustries.com/orgs/${cleanedSpectrumId}/`,
    );
    if (response.ok) {
      const html = await response.text();
      try {
        const titleMatches = html.match(/<title>([^<]*)<\/title>/)![1];
        const nameMatches = titleMatches?.match(/(.+)\[/)![1];
        name = nameMatches.trim();
        // eslint-disable-next-line

        const logoMatches = html.match(/"(\/media\/(?:.+)\/logo\/(?:.+))"/);
        logo = logoMatches?.[1] || null;
      } catch (error) {
        console.error(error);
        console.warn(
          `Failed to parse org name from CIG. spectrumId: ${spectrumId}`,
        );
      }
    } else {
      console.warn(`Failed to fetch org from CIG. spectrumId: ${spectrumId}`);
    }

    // Create org
    const newOrg = await prisma.organization.create({
      data: {
        spectrumId,
        name,
        logo,
        createdById: OWNER,
        attributeHistoryEntries: {
          create: {
            attributeKey: "name",
            newValue: name,
            createdById: OWNER,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: new Date(),
            confirmedById: OWNER,
          },
        },
      },
    });

    return newOrg;
  }

  return existingOrg;
};

export const updateActiveMembership = async (citizenId: Entity["id"]) => {
  /**
   * Figure out currently active memberships
   */
  const confirmedHistoryEntries =
    await prisma.organizationMembershipHistoryEntry.findMany({
      where: {
        citizenId,
        confirmed: ConfirmationStatus.CONFIRMED,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  const activeMemberships = new Map<
    Organization["id"],
    OrganizationMembershipHistoryEntry
  >();

  for (const entry of confirmedHistoryEntries) {
    if (
      [
        OrganizationMembershipType.MAIN,
        OrganizationMembershipType.AFFILIATE,
        // @ts-expect-error Stupid type error
      ].includes(entry.type)
    ) {
      activeMemberships.set(entry.organizationId, entry);
    } else if (entry.type === OrganizationMembershipType.LEFT) {
      activeMemberships.delete(entry.organizationId);
    } else {
      throw new Error("Unknown membership type");
    }
  }

  /**
   * Update database
   */
  await prisma.$transaction([
    prisma.activeOrganizationMembership.deleteMany({
      where: {
        citizenId,
      },
    }),

    prisma.activeOrganizationMembership.createMany({
      data: Array.from(activeMemberships.values()).map((entry) => ({
        organizationId: entry.organizationId,
        citizenId,
        type: entry.type,
        visibility: entry.visibility,
      })),
    }),
  ]);
};

const parseDates = (row: Row) => {
  const trimmedBeitritt = row[1].trim();
  let beitritt = null;
  if (trimmedBeitritt) {
    if (trimmedBeitritt.match(/\w{2}\.\w{2}\.\w{4}/)) {
      beitritt = dateParse(trimmedBeitritt, "dd.MM.yyyy", new Date());
    } else if (trimmedBeitritt.match(/\w{2}\.\w{2}\.\w{2}/)) {
      beitritt = dateParse(trimmedBeitritt, "dd.MM.yy", new Date());
    } else {
      console.error(`Failed to parse date. spectrumId: ${row[0]}`);
    }
  }

  const trimmedVerlassen = row[2].trim();
  let verlassen = null;
  if (trimmedVerlassen) {
    if (trimmedVerlassen.match(/\w{2}\.\w{2}\.\w{4}/)) {
      verlassen = dateParse(trimmedVerlassen, "dd.MM.yyyy", new Date());
    } else if (trimmedVerlassen.match(/\w{2}\.\w{2}\.\w{2}/)) {
      verlassen = dateParse(trimmedVerlassen, "dd.MM.yy", new Date());
    } else {
      console.error(`Failed to parse date. spectrumId: ${row[0]}`);
    }
  }

  return { beitritt, verlassen };
};

void main().then(() => console.info("Finished."));
