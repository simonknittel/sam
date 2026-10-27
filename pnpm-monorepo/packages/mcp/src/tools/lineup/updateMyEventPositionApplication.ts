import {
  applyForEventPosition,
  applyForEventPositionInputSchema,
  withdrawEventPositionApplication,
} from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  isLineupToolVisible,
  lineupPositionSchema,
} from "./lineupOutputSchemas.js";

export enum MyEventPositionApplicationAction {
  Apply = "apply",
  Withdraw = "withdraw",
}

export const updateMyEventPositionApplicationTool = defineTool({
  name: "update_my_event_position_application",
  group: ToolGroup.Lineup,
  title: "Apply for a position of an event or withdraw the application",
  description:
    "Applies the own citizen for a position (position id from get_event_lineup), or withdraws the own application. The lineup must be enabled, and the event must not have ended. apply needs a sign-up of the user for the event (update_my_event_participation); a manager of the positions confirms the application with the assignment, and a repeated application changes nothing. withdraw without an application gives a conflict. Gives the position.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  // The two use cases have the same input
  inputSchema: applyForEventPositionInputSchema.extend({
    action: z.enum(MyEventPositionApplicationAction),
  }),
  outputSchema: lineupPositionSchema,
  isVisible: isLineupToolVisible,
  handler: async (context, actor, { action, ...input }) => {
    switch (action) {
      case MyEventPositionApplicationAction.Apply:
        return applyForEventPosition(context, actor, input);

      case MyEventPositionApplicationAction.Withdraw:
        return withdrawEventPositionApplication(context, actor, input);

      default:
        throw new Error(
          `Unknown position application action: ${action satisfies never}`,
        );
    }
  },
});
