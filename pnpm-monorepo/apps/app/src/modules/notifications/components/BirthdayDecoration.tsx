"use client";

import { TbConfetti } from "react-icons/tb";
import {
  buildConfettiShots,
  NotificationRowDecoration,
} from "./NotificationRowDecoration";

const SHOTS = buildConfettiShots();

export const BirthdayDecoration = () => (
  <NotificationRowDecoration
    surfaceClassName="background-birthday"
    shots={SHOTS}
    staticIcon={<TbConfetti />}
  />
);
