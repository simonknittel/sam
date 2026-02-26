import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event, Prisma } from "@prisma/client";
import { forbidden } from "next/navigation";
import { cache } from "react";

const EVENTS_PAGE_SIZE = 10;

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
    async (
      status = "open",
      participating: "me" | "all" = "all",
      cursor?: string | null,
      direction: "next" | "prev" = "next",
    ) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("event", "read"))) forbidden();

      const now = new Date();

      // Build where clause
      let where: Prisma.EventWhereInput = {};

      if (status === "closed") {
        where = { startTime: { lt: now } };
      } else if (status === "open") {
        where = {
          OR: [{ startTime: { gte: now } }, { endTime: { gte: now } }],
        };
      }

      if (participating === "me") {
        where.discordParticipants = {
          some: { discordUserId: authentication.session.discordId },
        };
      }

      // Determine ordering
      const orderDirection: "asc" | "desc" = status === "open" ? "asc" : "desc";
      const orderBy: Prisma.EventOrderByWithRelationInput = {
        startTime: orderDirection,
      };

      // Fetch one extra to detect if there are more pages
      const take =
        direction === "prev" ? -(EVENTS_PAGE_SIZE + 1) : EVENTS_PAGE_SIZE + 1;

      const rows = await prisma.event.findMany({
        where,
        include: {
          discordParticipants: true,
          managers: true,
        },
        orderBy,
        ...(cursor
          ? {
              cursor: {
                id: cursor,
              },
              skip: 1,
            }
          : {}),
        take,
      });

      const hasMore = rows.length > EVENTS_PAGE_SIZE;

      let events;
      if (hasMore) {
        if (direction === "prev") {
          // Extra item is at the beginning
          events = rows.slice(1);
        } else {
          // Extra item is at the end
          events = rows.slice(0, EVENTS_PAGE_SIZE);
        }
      } else {
        events = rows;
      }

      // Next page exists if we fetched forward and got extra, or we came from
      // a backward navigation (meaning there's a page ahead we already visited)
      const hasNextPage = direction === "next" ? hasMore : !!cursor;
      const hasPrevPage = direction === "prev" ? hasMore : !!cursor;

      return {
        events,
        nextCursor:
          hasNextPage && events.length > 0
            ? events[events.length - 1].id
            : null,
        prevCursor: hasPrevPage && events.length > 0 ? events[0].id : null,
      };
    },
  ),
);
