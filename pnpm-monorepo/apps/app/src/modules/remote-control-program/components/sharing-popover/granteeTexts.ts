import type { ShareGrantGrantee } from "@sam-monorepo/application";
import { DELETED_CITIZEN_LABEL, GranteeKind } from "@sam-monorepo/domain";

/** The grantee of a grant in a sentence, for example "die Rolle Pilot" */
export const getGranteeText = (grantee: ShareGrantGrantee) => {
  switch (grantee.kind) {
    case GranteeKind.citizen:
      return grantee.citizen
        ? (grantee.citizen.handle ?? grantee.citizen.id)
        : DELETED_CITIZEN_LABEL;

    case GranteeKind.role:
      return `die Rolle ${grantee.role.name}`;

    case GranteeKind.everyone:
      return "alle";

    default:
      throw new Error(`Unknown grantee kind: ${grantee satisfies never}`);
  }
};
