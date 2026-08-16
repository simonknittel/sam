import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { canSeeEvent } from "@/modules/events/utils/eventVisibility";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Event } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getEventById = cache(
  withTrace("getEventById", async (id: Event["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("event", "read"))) forbidden();

    const event = await prisma.event.findUnique({
      where: {
        id,
      },
      include: {
        visibilityRoles: true,
        createdBy: true,
        coverImage: true,
        participants: {
          where: { cancelledAt: null },
        },
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
    if (!event) return null;

    /**
     * Not visible is indistinguishable from nonexistent: callers translate
     * the null into a 404.
     */
    if (!(await canSeeEvent(event))) return null;

    return event;
  }),
);
