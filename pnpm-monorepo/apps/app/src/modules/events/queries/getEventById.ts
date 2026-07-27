import { prisma } from "@/db";
import type { Event } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
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
