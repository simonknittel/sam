"use client";

import { TbSparkles } from "react-icons/tb";
import {
  buildConfettiShots,
  NotificationRowDecoration,
} from "./NotificationRowDecoration";

/** The gold, orange and yellow of `background-new-year` */
const SHOTS = buildConfettiShots({
  colors: ["#fbbf24", "#f97316", "#fde047"],
  shapes: ["star"],
});

export const NewYearDecoration = () => (
  <NotificationRowDecoration
    surfaceClassName="background-new-year"
    shots={SHOTS}
    staticIcon={<TbSparkles />}
  />
);
