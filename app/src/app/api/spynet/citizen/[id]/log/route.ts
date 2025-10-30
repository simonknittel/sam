import { prisma } from "@/db";
import { requireAuthenticationApi } from "@/modules/auth/server";
import { confirmLog } from "@/modules/citizen/utils/confirmLog";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateEntityRolesCache } from "./_lib/updateEntityRolesCache";

type Params = Promise<{
  id: string;
}>;

const paramsSchema = z.cuid();

const postBodySchema = z.union([
  z.object({
    type: z.literal("handle"),
    content: z.string().trim().min(1).max(255),
    confirmed: z.literal("confirmed").optional(),
  }),
  z.object({
    type: z.literal("teamspeak-id"),
    content: z.string().trim().min(1).max(255),
    confirmed: z.literal("confirmed").optional(),
  }),
  z.object({
    type: z.literal("note"),
    content: z.string().trim().min(1),
    noteTypeId: z.string().trim().cuid(),
    classificationLevelId: z.string().trim().cuid(),
    confirmed: z.literal("confirmed").optional(),
  }),
  z.object({
    type: z.literal("discord-id"),
    content: z.string().trim().min(1).max(255),
    confirmed: z.literal("confirmed").optional(),
  }),
  z.object({
    type: z.literal("citizen-id"),
    content: z.string().trim().min(1).max(255),
    confirmed: z.literal("confirmed").optional(),
  }),
  z.object({
    type: z.literal("community-moniker"),
    content: z.string().trim().min(1).max(255),
    confirmed: z.literal("confirmed").optional(),
  }),
  z.object({
    type: z.literal("role-added"),
    content: z.string().trim().cuid(),
    confirmed: z.literal("confirmed").optional(),
  }),
  z.object({
    type: z.literal("role-removed"),
    content: z.string().trim().cuid(),
    confirmed: z.literal("confirmed").optional(),
  }),
]);

export async function POST(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/citizen/[id]/log",
      "POST",
    );

    /**
     * Validate the request
     */
    const paramsData = paramsSchema.parse((await props.params).id);
    const body: unknown = await request.json();
    const data = postBodySchema.parse(body);

    /**
     * Authorize the request
     */
    switch (data.type) {
      case "handle":
        await authentication.authorizeApi("handle", "create");
        break;
      case "teamspeak-id":
        await authentication.authorizeApi("teamspeak-id", "create");
        break;
      case "note":
        await authentication.authorizeApi("note", "create", [
          {
            key: "noteTypeId",
            value: data.noteTypeId,
          },
          {
            key: "classificationLevelId",
            value: data.classificationLevelId,
          },
        ]);
        break;
      case "discord-id":
        await authentication.authorizeApi("discord-id", "create");
        break;
      case "citizen-id":
        await authentication.authorizeApi("citizen-id", "create");
        break;
      case "community-moniker":
        await authentication.authorizeApi("community-moniker", "create");
        break;
      case "role-added":
        await authentication.authorizeApi("otherRole", "assign", [
          {
            key: "roleId",
            value: data.content,
          },
        ]);
        break;
      case "role-removed":
        await authentication.authorizeApi("otherRole", "dismiss", [
          {
            key: "roleId",
            value: data.content,
          },
        ]);
        break;
    }

    /**
     * Do the thing
     */
    const entity = await prisma.entity.findFirst({
      where: {
        id: paramsData,
      },
    });

    if (!entity) throw new Error("Not found");

    const item = await prisma.entityLog.create({
      data: {
        type: data.type,
        content: data.content,
        submittedBy: {
          connect: {
            id: authentication.session.user.id,
          },
        },
        entity: {
          connect: {
            id: entity.id,
          },
        },
        attributes:
          "noteTypeId" in data
            ? {
                createMany: {
                  data: [
                    {
                      key: "noteTypeId",
                      value: data.noteTypeId,
                      createdById: authentication.session.user.id,
                    },
                    {
                      key: "classificationLevelId",
                      value: data.classificationLevelId,
                      createdById: authentication.session.user.id,
                    },
                  ],
                },
              }
            : undefined,
      },
      include: {
        attributes: true,
      },
    });

    if (data.confirmed) await confirmLog(item, "confirmed");

    if (["role-added", "role-removed"].includes(data.type)) {
      await updateEntityRolesCache(entity.id);
    }

    if (data.type === "role-added") {
      await triggerNotifications([
        {
          type: "RoleAdded",
          payload: {
            citizenId: entity.id,
            roleId: data.content,
          },
        },
      ]);
    }

    /**
     * Respond with the result
     */
    return NextResponse.json(item);
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
