"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { FaLock } from "react-icons/fa";
import { useWikiPagePermissionsOpener } from "./WikiPagePermissionsOpener";

/**
 * The lock button of the page action row. Renders nothing where no
 * permissions dialog is available.
 */
export const WikiPagePermissionsButton = () => {
  const openPermissions = useWikiPagePermissionsOpener();
  if (!openPermissions) return null;

  return (
    <Button2
      type="button"
      onClick={openPermissions}
      variant={Button2Variant.IconOnly}
      tooltip="Berechtigungen bearbeiten"
    >
      <FaLock />
    </Button2>
  );
};
