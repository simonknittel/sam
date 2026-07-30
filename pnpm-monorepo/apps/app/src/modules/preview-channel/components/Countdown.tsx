"use client";

import { useTimeLeft } from "../utils/useTimeLeft";

interface Props {
  date: Date;
}

export const Countdown = ({ date }: Readonly<Props>) => {
  const timeLeft = useTimeLeft(date);

  return (
    <>
      {timeLeft[0].toString().padStart(2, "0")}:
      {timeLeft[1].toString().padStart(2, "0")}:
      {timeLeft[2].toString().padStart(2, "0")}
    </>
  );
};
