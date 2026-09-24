"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { SeasonalEventKey } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMySeasonalThemeSettings } from "../queries/getMySeasonalThemeSettings";

/**
 * The form sends one key per switched-on event, thus a request never needs
 * more keys than the calendar has events. The limit keeps the loops of the
 * action bounded even if the schema becomes more permissive later.
 */
const MAXIMUM_FORM_KEY_COUNT = 20;

/**
 * A checked switch sends the key of its event; a cleared switch sends
 * nothing. Every key of the request must name an event of the calendar.
 */
const schema = z.partialRecord(z.enum(SeasonalEventKey), z.string());

interface SeasonalThemeSettingChange {
  readonly eventKey: SeasonalEventKey;
  readonly enabled: boolean;
}

export const updateMySeasonalThemeSettings = createAuthenticatedAction(
  "updateMySeasonalThemeSettings",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const citizenId = authentication.session.entity.id;

    /**
     * Further validate the request
     */
    if (Array.from(formData.keys()).length > MAXIMUM_FORM_KEY_COUNT)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    /**
     * Keep the events the request really changes
     */
    const myCurrentSettings = await getMySeasonalThemeSettings();

    // Opt-out model: the existence of a row means the event is switched off.
    const switchedOffEventKeys = new Set(
      myCurrentSettings?.map((setting) => setting.eventKey) ?? [],
    );

    const changes: SeasonalThemeSettingChange[] = Object.values(
      SeasonalEventKey,
    )
      .map((eventKey) => ({
        eventKey,
        enabled: data[eventKey] !== undefined,
      }))
      .filter((change) => {
        const currentlyEnabled = !switchedOffEventKeys.has(change.eventKey);

        return change.enabled !== currentlyEnabled;
      });

    await prisma.$transaction(
      changes.map((change) => {
        if (change.enabled)
          // deleteMany instead of delete so overlapping debounced submits
          // do not throw when the row is already gone
          return prisma.seasonalThemeSetting.deleteMany({
            where: {
              citizenId,
              eventKey: change.eventKey,
            },
          });

        return prisma.seasonalThemeSetting.upsert({
          where: {
            citizenId_eventKey: {
              citizenId,
              eventKey: change.eventKey,
            },
          },
          update: {
            disabledAt: new Date(),
          },
          create: {
            citizenId,
            eventKey: change.eventKey,
            disabledAt: new Date(),
          },
        });
      }),
    );

    if (changes.length > 0)
      await createAuditEvents([
        {
          type: AuditEventType.SEASONAL_THEME_SETTINGS_UPDATED,
          data: {
            citizenId,
            enabled: changes
              .filter((change) => change.enabled)
              .map((change) => change.eventKey),
            disabled: changes
              .filter((change) => !change.enabled)
              .map((change) => change.eventKey),
          },
          createdById: authentication.session.user.id,
        },
      ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/account/appearance");
    // The theme root of the shell resolves the settings in the layout of
    // the app, thus every page below it must render again.
    revalidatePath("/app", "layout");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
