"use client";

import { TbSparkles } from "react-icons/tb";
import {
  buildConfettiShots,
  NotificationRowDecoration,
} from "./NotificationRowDecoration";

/** Stars in the gold, orange and yellow of the surface */
const SHOTS = buildConfettiShots({
  colors: ["#fbbf24", "#f97316", "#fde047"],
  shapes: ["star"],
});

/** The row of a New Year greeting, see `NotificationRowDecoration` */
export const NewYearDecoration = () => (
  <NotificationRowDecoration
    name="new-year"
    surfaceClassName="background-new-year"
    shots={SHOTS}
    staticIcon={<TbSparkles />}
  />
);
