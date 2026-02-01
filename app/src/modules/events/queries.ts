import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event } from "@prisma/client";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getEventById = cache(
  withTrace("getEventById", async (id: Event["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("event", "read"))) forbidden();

    return prisma.event.findUnique({
      where: {
        id,
      },
      include: {
        discordParticipants: true,
        positions: {
          where: {
            parentPositionId: null,
          },
          orderBy: {
            order: "asc",
          },
          include: {
            applications: {
              include: {
                citizen: true,
              },
            },
            citizen: true,
            requiredVariants: {
              orderBy: {
                order: "asc",
              },
              include: {
                variant: {
                  include: {
                    series: {
                      include: {
                        manufacturer: {
                          include: {
                            image: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            childPositions: {
              orderBy: {
                order: "asc",
              },
              include: {
                applications: {
                  include: {
                    citizen: true,
                  },
                },
                citizen: true,
                requiredVariants: {
                  orderBy: {
                    order: "asc",
                  },
                  include: {
                    variant: {
                      include: {
                        series: {
                          include: {
                            manufacturer: {
                              include: {
                                image: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                childPositions: {
                  orderBy: {
                    order: "asc",
                  },
                  include: {
                    applications: {
                      include: {
                        citizen: true,
                      },
                    },
                    citizen: true,
                    requiredVariants: {
                      orderBy: {
                        order: "asc",
                      },
                      include: {
                        variant: {
                          include: {
                            series: {
                              include: {
                                manufacturer: {
                                  include: {
                                    image: true,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    childPositions: {
                      orderBy: {
                        order: "asc",
                      },
                      include: {
                        applications: {
                          include: {
                            citizen: true,
                          },
                        },
                        citizen: true,
                        requiredVariants: {
                          orderBy: {
                            order: "asc",
                          },
                          include: {
                            variant: {
                              include: {
                                series: {
                                  include: {
                                    manufacturer: {
                                      include: {
                                        image: true,
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        managers: true,
      },
    });
  }),
);

export const getEvents = cache(
  withTrace(
    "getEvents",
    async (status = "open", participating: "me" | "all" = "all") => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("event", "read"))) forbidden();

      const now = new Date();

      let rows;

      if (status === "closed") {
        rows = prisma.event.findMany({
          where: {
            startTime: {
              lt: now,
            },
            discordParticipants:
              participating === "me"
                ? {
                    some: {
                      discordUserId: authentication.session.discordId,
                    },
                  }
                : undefined,
          },
          include: {
            discordParticipants: true,
            managers: true,
          },
          orderBy: {
            startTime: "desc",
          },
        });
      } else if (status === "open") {
        rows = prisma.event.findMany({
          where: {
            OR: [
              {
                startTime: {
                  gte: now,
                },
              },
              {
                endTime: {
                  gte: now,
                },
              },
            ],
            discordParticipants:
              participating === "me"
                ? {
                    some: {
                      discordUserId: authentication.session.discordId,
                    },
                  }
                : undefined,
          },
          include: {
            discordParticipants: true,
            managers: true,
          },
          orderBy: {
            startTime: "asc",
          },
        });
      } else {
        // All
        rows = prisma.event.findMany({
          where: {
            discordParticipants:
              participating === "me"
                ? {
                    some: {
                      discordUserId: authentication.session.discordId,
                    },
                  }
                : undefined,
          },
          include: {
            discordParticipants: true,
            managers: true,
          },
          orderBy: {
            startTime: "desc",
          },
        });
      }

      return rows;
    },
  ),
);
