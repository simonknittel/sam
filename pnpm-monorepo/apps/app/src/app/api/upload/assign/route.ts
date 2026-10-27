import {
  getApplicationContext,
  isApplicationError,
  mapApplicationErrorToRouteResponse,
  toActor,
} from "@/modules/application";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import {
  getDiscordCoverImageWarning,
  getDiscordSyncWarning,
} from "@/modules/events/utils/discordPublishing";
import {
  assignEventCoverImage,
  assignEventCoverImageInputSchema,
  assignManufacturerImage,
  assignManufacturerImageInputSchema,
  assignRoleImage,
  assignRoleImageInputSchema,
  assignRoleTagImage,
  assignRoleTagImageInputSchema,
  assignWikiPageIcon,
  assignWikiPageIconInputSchema,
  idSchema,
  linkWikiPageUpload,
  linkWikiPageUploadInputSchema,
  NotFoundError,
  RoleImageAttribute,
  type Actor,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { NextResponse } from "next/server";
import * as z from "zod";

enum UploadTargetType {
  Manufacturer = "manufacturer",
  Event = "event",
  Role = "role",
  RoleTag = "roleTag",
  WikiPage = "wikiPage",
}

enum WikiPageUploadAttribute {
  Uploads = "uploads",
  Icon = "iconId",
}

/** The wire contract of the clients (`ImageUpload`, the wiki editor) */
const bodySchema = z.discriminatedUnion("resourceType", [
  z.object({
    resourceType: z.literal(UploadTargetType.Manufacturer),
    resourceId: idSchema,
    resourceAttribute: z.literal("imageId"),
    imageId: idSchema,
  }),
  /**
   * Sets or removes (`imageId: null`) the cover image of an app event.
   * `resourceId` is the id of the event.
   */
  z.object({
    resourceType: z.literal(UploadTargetType.Event),
    resourceAttribute: z.literal("coverImageId"),
    resourceId: idSchema,
    imageId: idSchema.nullable(),
  }),
  z.object({
    resourceType: z.literal(UploadTargetType.Role),
    resourceAttribute: z.enum(RoleImageAttribute),
    resourceId: idSchema,
    imageId: idSchema,
  }),
  /** Sets the icon of a role tag. `resourceId` is the id of the tag. */
  z.object({
    resourceType: z.literal(UploadTargetType.RoleTag),
    resourceAttribute: z.literal("iconId"),
    resourceId: idSchema,
    imageId: idSchema,
  }),
  z.discriminatedUnion("resourceAttribute", [
    /**
     * Links an upload (an image or an attachment) to the wiki page that
     * embeds it. `resourceId` is the id of the page.
     */
    z.object({
      resourceType: z.literal(UploadTargetType.WikiPage),
      resourceAttribute: z.literal(WikiPageUploadAttribute.Uploads),
      resourceId: idSchema,
      uploadId: idSchema,
    }),
    /**
     * Sets or removes (`imageId: null`) the icon of a wiki page.
     * `resourceId` is the id of the page.
     */
    z.object({
      resourceType: z.literal(UploadTargetType.WikiPage),
      resourceAttribute: z.literal(WikiPageUploadAttribute.Icon),
      resourceId: idSchema,
      imageId: idSchema.nullable(),
    }),
  ]),
]);

interface AssignmentResult {
  readonly probeUploadId: string | null;
  /** Work after the assignment that did not go through */
  readonly warning: string | null;
}

const assignWikiPageUpload = async (
  context: ApplicationContext,
  actor: Actor,
  body: Extract<
    z.output<typeof bodySchema>,
    { resourceType: UploadTargetType.WikiPage }
  >,
): Promise<AssignmentResult> => {
  switch (body.resourceAttribute) {
    case WikiPageUploadAttribute.Icon: {
      const result = await assignWikiPageIcon(
        context,
        actor,
        assignWikiPageIconInputSchema.parse({
          page_id: body.resourceId,
          upload_id: body.imageId,
        }),
      );
      return { probeUploadId: result.probe_upload_id, warning: null };
    }

    case WikiPageUploadAttribute.Uploads: {
      const result = await linkWikiPageUpload(
        context,
        actor,
        linkWikiPageUploadInputSchema.parse({
          page_id: body.resourceId,
          upload_id: body.uploadId,
        }),
      );
      return { probeUploadId: result.probe_upload_id, warning: null };
    }

    default:
      throw new Error(`Unknown wiki page attribute: ${body satisfies never}`);
  }
};

const assignUpload = async (
  context: ApplicationContext,
  actor: Actor,
  body: z.output<typeof bodySchema>,
): Promise<AssignmentResult> => {
  switch (body.resourceType) {
    case UploadTargetType.WikiPage:
      return assignWikiPageUpload(context, actor, body);

    case UploadTargetType.Event: {
      const result = await assignEventCoverImage(
        context,
        actor,
        assignEventCoverImageInputSchema.parse({
          event_id: body.resourceId,
          upload_id: body.imageId,
        }),
      );
      return {
        probeUploadId: result.probe_upload_id,
        warning:
          getDiscordSyncWarning(result.discord) ??
          getDiscordCoverImageWarning(result.discord),
      };
    }

    case UploadTargetType.Manufacturer: {
      const result = await assignManufacturerImage(
        context,
        actor,
        assignManufacturerImageInputSchema.parse({
          manufacturer_id: body.resourceId,
          upload_id: body.imageId,
        }),
      );
      return { probeUploadId: result.probe_upload_id, warning: null };
    }

    case UploadTargetType.Role: {
      const result = await assignRoleImage(
        context,
        actor,
        assignRoleImageInputSchema.parse({
          role_id: body.resourceId,
          attribute: body.resourceAttribute,
          upload_id: body.imageId,
        }),
      );
      return { probeUploadId: result.probe_upload_id, warning: null };
    }

    case UploadTargetType.RoleTag: {
      const result = await assignRoleTagImage(
        context,
        actor,
        assignRoleTagImageInputSchema.parse({
          tag_id: body.resourceId,
          upload_id: body.imageId,
        }),
      );
      return { probeUploadId: result.probe_upload_id, warning: null };
    }

    default:
      throw new Error(`Unknown upload target: ${body satisfies never}`);
  }
};

/**
 * Assigns an upload to its target. The probe of the image dimensions runs
 * after the response.
 */
export async function PATCH(request: Request) {
  try {
    const authentication = await requireAuthenticationApi(
      "/api/upload/assign",
      "PATCH",
    );

    const body = bodySchema.parse(await request.json());

    const { probeUploadId, warning } = await assignUpload(
      getApplicationContext(),
      await toActor(authentication.session),
      body,
    );

    if (probeUploadId) probeUploadImageDimensions(probeUploadId);

    return NextResponse.json(warning ? { warning } : {});
  } catch (error) {
    // The route refuses a target or an upload that does not exist as a bad
    // request
    if (error instanceof NotFoundError)
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });

    if (isApplicationError(error))
      return mapApplicationErrorToRouteResponse(error);

    return apiErrorHandler(error);
  }
}
