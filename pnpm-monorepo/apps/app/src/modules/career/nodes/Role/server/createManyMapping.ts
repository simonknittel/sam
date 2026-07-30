import type z from "zod";
import type { updateFlowSchema } from "./updateFlowSchema";

export const createManyMapping = (
  node: z.output<typeof updateFlowSchema>,
  flowId: string,
) => {
  return {
    id: node.id,
    flowId,
    type: node.type,
    positionX: node.position.x,
    positionY: node.position.y,
    width: node.width,
    height: node.height,
    roleId: node.data.role.id,
    roleImage: node.data.roleImage,
    backgroundColor: node.data.backgroundColor,
    backgroundTransparency: node.data.backgroundTransparency,
    showUnlocked: node.data.showUnlocked,
  };
};
