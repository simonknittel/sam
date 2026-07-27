import type { Task } from "@/generated/prisma/client";

export const isTaskUpdatable = (task: Task) => {
  if (task.completedAt) return false;
  if (task.deletedAt || task.cancelledAt) return false;
  if (task.expiresAt && task.expiresAt < new Date()) return false;

  return true;
};
