import { prisma } from "@sam-monorepo/database";
import { parse } from "csv";
import { createReadStream } from "node:fs";
import path from "node:path";

const prod = true;

const ROLE_GESPERRT = prod
  ? "clofvubb30000mo0828k69kzm"
  : "clog07fvt0002ulb9ir2qslw1";

const NOTE_TYPE_ALLGEMEINES = prod
  ? "cli1z4tci0000ml08lxmggnvs"
  : "clhyyraz10002ul4qfvfivltc";
const NOTE_TYPE_BESCHWERDE = prod
  ? "cli25ai6e0000kz08hbh11t95"
  : "cli0avnts0002ulam9izvyjnv";
const NOTE_TYPE_HUMAN_RESOURCES = prod
  ? "cli25hcbb0000l408bb1pvewk"
  : "cli0avkow0000ulamul6r0tbd";

const CLASSIFICATION_LEVEL_LEVEL_0 = prod
  ? "cli1z58a30000jp08q7c5ewx3"
  : "clog0967r0003ulb9kcftutmd";
const CLASSIFICATION_LEVEL_LEVEL_1 = prod
  ? "cli25kvjf0000l0087kqip209"
  : "clog099540004ulb93mp4k1yn";
const CLASSIFICATION_LEVEL_LEVEL_2 = prod
  ? "cli25l8p30002l008l0al4pxj"
  : "clog09cll0005ulb9q6rvkjbb";
const CLASSIFICATION_LEVEL_LEVEL_3 = prod
  ? "cli4grtu90000mf08q26jfsdn"
  : "clog09fel0006ulb90oh654nf";
const CLASSIFICATION_LEVEL_BESCHWERDE = prod
  ? "clia9u4w10044mo0813htnj02"
  : "cli1cl3me0000ul90qmau1g5r";
const CLASSIFICATION_LEVEL_PERSONALAKTE = prod
  ? "clia9ue2l0046mo08ye90bdpu"
  : "clog09i5s0007ulb9wxk33nyt";
const CLASSIFICATION_LEVEL_BEWERBUNG = prod
  ? "clia9tx330042mo08rko1fnqx"
  : "cli73qa3z002yulalw7a2rsys";

const USER_ID_ME = prod
  ? "clhaw95yi0000jr08ybuvy137"
  : "clhyvveyg0000ul5nzt1e08d6";

type Row = [
  string, // Spectrum ID
  string, // Citizen ID
  string, // TS ID
  string, // Discord ID
  string, // Handle
  string, // Nickname
  string, // Allgemein - Level 0
  string, // Allgemein - Level 0
  string, // Allgemein - Level 1
  string, // Allgemein - Level 1
  string, // Allgemein - Level 1
  string, // Allgemein - Level 1
  string, // Allgemein - Level 2
  string, // Allgemein - Level 3
  string, // Beschwerde - Beschwerde
  string, // Human Resources - Personalakte
  string, // Human Resources - Bewerbung
];

async function main() {
  await prisma.entity.deleteMany();

  const rows: Row[] = [];

  await new Promise<void>((resolve, reject) => {
    createReadStream(path.resolve(__dirname, "./citizen-data.csv"))
      .pipe(parse({ delimiter: ";", fromLine: 2 }))
      .on("data", (row: Row) => {
        rows.push(row);
      })
      .on("error", (err) => {
        console.error(err);
        reject("Reading CSV failed.");
      })
      .on("end", () => {
        resolve();
      });
  });

  for (const row of rows) {
    await prisma.entity
      .create({
        data: {
          type: "citizen",
          createdById: USER_ID_ME,
        },
      })
      .then(async (entity) => {
        const transactions = [];

        let gesperrt = false;

        if (row[0].trim()) {
          transactions.push(
            prisma.entityLog.create({
              data: {
                entityId: entity.id,
                type: "spectrum-id",
                content: row[0],
                submittedById: USER_ID_ME,
                attributes: {
                  create: {
                    key: "confirmed",
                    value: "confirmed",
                    createdById: USER_ID_ME,
                  },
                },
              },
            }),
          );
        } else {
          await prisma.entity.delete({ where: { id: entity.id } });

          console.error(`Error importing ${JSON.stringify(row)}`);
          console.error("No Spectrum ID.");
          return;
        }

        if (row[1].trim())
          transactions.push(
            prisma.entityLog.create({
              data: {
                entityId: entity.id,
                type: "citizen-id",
                content: row[1],
                submittedById: USER_ID_ME,
                attributes: {
                  create: {
                    key: "confirmed",
                    value: "confirmed",
                    createdById: USER_ID_ME,
                  },
                },
              },
            }),
          );

        if (row[2].trim())
          transactions.push(
            prisma.entityLog.create({
              data: {
                entityId: entity.id,
                type: "teamspeakId",
                content: row[2],
                submittedById: USER_ID_ME,
                attributes: {
                  create: {
                    key: "confirmed",
                    value: "confirmed",
                    createdById: USER_ID_ME,
                  },
                },
              },
            }),
          );

        if (row[3].trim())
          transactions.push(
            prisma.entityLog.create({
              data: {
                entityId: entity.id,
                type: "discordId",
                content: row[3],
                submittedById: USER_ID_ME,
                attributes: {
                  create: {
                    key: "confirmed",
                    value: "confirmed",
                    createdById: USER_ID_ME,
                  },
                },
              },
            }),
          );

        if (row[4].trim())
          transactions.push(
            prisma.entityLog.create({
              data: {
                entityId: entity.id,
                type: "handle",
                content: row[4],
                submittedById: USER_ID_ME,
                attributes: {
                  create: {
                    key: "confirmed",
                    value: "confirmed",
                    createdById: USER_ID_ME,
                  },
                },
              },
            }),
          );

        if (row[5].trim())
          transactions.push(
            prisma.entityLog.create({
              data: {
                entityId: entity.id,
                type: "communityMoniker",
                content: row[5],
                submittedById: USER_ID_ME,
                attributes: {
                  create: {
                    key: "confirmed",
                    value: "confirmed",
                    createdById: USER_ID_ME,
                  },
                },
              },
            }),
          );

        if (row[6]) {
          if (row[6].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[6],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_ALLGEMEINES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_LEVEL_0,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[7]) {
          if (row[7].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[7],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_ALLGEMEINES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_LEVEL_0,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[8]) {
          if (row[8].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[8],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_ALLGEMEINES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_LEVEL_1,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[9]) {
          if (row[9].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[9],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_ALLGEMEINES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_LEVEL_1,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[10]) {
          if (row[10].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[10],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_ALLGEMEINES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_LEVEL_1,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[11]) {
          if (row[11].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[11],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_ALLGEMEINES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_LEVEL_1,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[12]) {
          if (row[12].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[12],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_ALLGEMEINES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_LEVEL_2,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[13]) {
          if (row[13].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[13],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_ALLGEMEINES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_LEVEL_3,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[14]) {
          if (row[14].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[14],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_BESCHWERDE,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_BESCHWERDE,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[15]) {
          if (row[15].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[15],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_HUMAN_RESOURCES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_PERSONALAKTE,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (row[16]) {
          if (row[16].trim() === "Gesperrt") {
            gesperrt = true;
          } else {
            transactions.push(
              prisma.entityLog.create({
                data: {
                  entityId: entity.id,
                  type: "note",
                  content: row[16],
                  submittedById: USER_ID_ME,
                  attributes: {
                    createMany: {
                      data: [
                        {
                          key: "confirmed",
                          value: "confirmed",
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "noteTypeId",
                          value: NOTE_TYPE_HUMAN_RESOURCES,
                          createdById: USER_ID_ME,
                        },
                        {
                          key: "classificationLevelId",
                          value: CLASSIFICATION_LEVEL_BEWERBUNG,
                          createdById: USER_ID_ME,
                        },
                      ],
                    },
                  },
                },
              }),
            );
          }
        }

        if (gesperrt) {
          transactions.push(
            prisma.entityLog.create({
              data: {
                entityId: entity.id,
                type: "role-added",
                content: ROLE_GESPERRT,
                submittedById: USER_ID_ME,
              },
            }),
          );
        }

        return prisma.$transaction(transactions);
      })
      .catch((err) => {
        console.info(`Error importing ${JSON.stringify(row)}`);
        console.error(err);
      });
  }
}

void main().then(() => console.info("Finished."));
