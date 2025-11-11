"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import type { Entity } from "@prisma/client";
import clsx from "clsx";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  readonly citizen?: Pick<Entity, "id" | "handle"> | null;
  readonly page?: string;
}

export const CitizenLink = ({ className, citizen, page = "" }: Props) => {
  const authentication = useAuthentication();
  const isCitizenCurrentUser =
    authentication && authentication.session.entity && citizen
      ? citizen.id === authentication.session.entity.id
      : false;

  if (!citizen) return <span className="text-neutral-500">Unbekannt</span>;

  return (
    <Link
      href={`/app/spynet/citizen/${citizen.id}${page}`}
      className={clsx(
        "hover:underline",
        {
          "text-me": isCitizenCurrentUser,
          "text-interaction-500": !isCitizenCurrentUser,
        },
        className,
      )}
      prefetch={false}
    >
      {citizen.handle || citizen.id}
    </Link>
  );
};
