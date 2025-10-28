import EventCreated from "./events/event_created.js";
import EventUpdated from "./events/event_updated.js";
import EventDeleted from "./events/event_deleted.js";

export const Events = {
  [EventCreated.key]: EventCreated.handler,
  [EventUpdated.key]: EventUpdated.handler,
  [EventDeleted.key]: EventDeleted.handler,
} as const;

export const triggerNotification = async <T extends keyof typeof Events>(
  key: T,
  payload: Parameters<(typeof Events)[T]>[0],
) => {
  await Events[key](payload);
}
