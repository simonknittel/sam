"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  createShareGrantInputSchema,
  createShareGrant as createShareGrantUseCase,
  ShareGrantValidityKind,
} from "@sam-monorepo/application";
import { SHARE_GRANT_ERROR_TEXTS } from "../components/sharing-popover/remoteControlProgramErrorTexts";
import {
  CUSTOM_VALIDITY_CHOICE,
  ShareGrantFormField,
} from "../components/sharing-popover/shareGrantFormFields";

/** The use case reads only the grantee field of the kind */
const parseShareGrantFormData = (formData: FormData) => ({
  grantee: {
    kind: formData.get(ShareGrantFormField.GranteeKind),
    citizen_id: formData.get(ShareGrantFormField.CitizenId) ?? undefined,
    role_id: formData.get(ShareGrantFormField.RoleId) ?? undefined,
  },
  capability_ids: formData.getAll(ShareGrantFormField.CapabilityIds),
  validity:
    formData.get(ShareGrantFormField.Validity) === CUSTOM_VALIDITY_CHOICE
      ? {
          kind: ShareGrantValidityKind.Custom,
          starts_at: formData.get(ShareGrantFormField.StartsAt),
          ends_at: formData.get(ShareGrantFormField.EndsAt) || null,
        }
      : {
          kind: ShareGrantValidityKind.Preset,
          preset: formData.get(ShareGrantFormField.Validity),
        },
});

/** The client fetches the popover again after the action (see `useSharingPopoverAction()`) */
export const createShareGrant = createUseCaseAction({
  name: "createShareGrant",
  schema: createShareGrantInputSchema,
  useCase: createShareGrantUseCase,
  parseFormData: parseShareGrantFormData,
  texts: SHARE_GRANT_ERROR_TEXTS,
  refresh: ActionRefresh.Never,
  success: () => "Freigabe erstellt",
});
