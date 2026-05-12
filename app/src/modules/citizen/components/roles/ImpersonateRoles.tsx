"use client";

import { type Role } from "@/generated/prisma/browser";
import Button from "@/modules/common/components/Button";
import { useRouter } from "next/navigation";
import { RiSpyFill } from "react-icons/ri";

interface Props {
  roles: Role[];
}

const ImpersonateRoles = ({ roles }: Readonly<Props>) => {
  const router = useRouter();

  const handleClick = () => {
    document.cookie = `impersonate=${roles
      .map((role) => role.id)
      .join(",")}; path=/; max-age=3600;`;
    router.refresh();
  };

  return (
    <Button
      title="Rollen simulieren"
      onClick={() => handleClick()}
      variant="tertiary"
    >
      <RiSpyFill /> Simulieren
    </Button>
  );
};

export default ImpersonateRoles;
