"use client";

import { TbConfetti } from "react-icons/tb";
import { NotificationDecoration } from "../utils/renderOnSiteNotification";
import {
  buildConfettiShots,
  NotificationRowDecoration,
} from "./NotificationRowDecoration";

/** The greeting keeps the colours and shapes of the library */
const SHOTS = buildConfettiShots();

/** The row of a birthday greeting, see `NotificationRowDecoration` */
export const BirthdayDecoration = () => (
  <NotificationRowDecoration
    decoration={NotificationDecoration.Birthday}
    surfaceClassName="background-birthday"
    shots={SHOTS}
    staticIcon={<TbConfetti />}
  />
);
