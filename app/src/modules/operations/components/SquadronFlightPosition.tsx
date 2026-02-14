import f7hornetImage from "@/assets/ships/f7-hornet.png";
import {
  type OperationMember,
  type OperationUnit,
  type Ship,
  type User,
  type Variant,
} from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";

interface Props {
  type:
    | "squadron-flight-1-leader"
    | "squadron-flight-1-wingman"
    | "squadron-flight-2"
    | "squadron-flight-2-wingman";
  member: OperationMember & {
    user: User;
    ship: Ship & {
      variant: Variant;
    };
  };
  unit: OperationUnit;
  status: "green" | "yellow" | "red";
}

const positions = {
  "squadron-flight-1-leader": "Flight Leader",
  "squadron-flight-1-wingman": "1 Wingman",
  "squadron-flight-2": "2",
  "squadron-flight-2-wingman": "2 Wingman",
};

const SquadronFlightPosition = ({
  type,
  member,
  unit,
  status = "green",
}: Readonly<Props>) => {
  return (
    <li className="text-center">
      <p className="truncate" title={`${unit.title}-${positions[type]}`}>
        {unit.title}-{positions[type]}
      </p>

      <p
        className="text-neutral-500 text-sm truncate"
        title={member.user.name || member.userId}
      >
        {member.user.name}
      </p>

      <div className="aspect-square rounded-secondary mt-2 flex flex-col items-center justify-center gap-4 relative">
        <Image src={f7hornetImage} alt="" className="rotate-90 sepia" />

        <div
          className={clsx("absolute inset-0 backdrop-saturate-[1]", {
            "backdrop-hue-rotate-[60deg]": status === "green",
            "backdrop-hue-rotate-[30deg]": status === "yellow",
            "backdrop-hue-rotate-[0deg]": status === "red",
          })}
        />
      </div>

      <p
        className="text-neutral-500 text-sm truncate mt-2"
        title={member.ship.variant.name}
      >
        {member.ship.variant.name}
      </p>
    </li>
  );
};

export default SquadronFlightPosition;
