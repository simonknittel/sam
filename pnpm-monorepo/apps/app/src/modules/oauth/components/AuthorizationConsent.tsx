import { Tile } from "@/modules/common/components/Tile";
import { listGrantToolGroups } from "@/modules/mcp-settings/utils/listGrantToolGroups";
import {
  OAuthResource,
  type Actor,
  type AuthorizationRequestValidation,
  type AuthorizationRequestValidationKind,
} from "@sam-monorepo/application";
import { getRedirectTarget, toConsentFormParameters } from "../utils/consent";
import { ConsentDecision } from "./ConsentDecision";
import { DesktopCompanionConsentDecision } from "./DesktopCompanionConsentDecision";

interface Props {
  readonly validation: Extract<
    AuthorizationRequestValidation,
    { kind: AuthorizationRequestValidationKind.Valid }
  >;
  readonly actor: Actor;
}

/**
 * The host of the client id is the only trusted identity of the client: the
 * client gives its name itself. Only the name of the desktop companion comes
 * from the app.
 */
export const AuthorizationConsent = ({ validation, actor }: Props) => {
  const parameters = toConsentFormParameters(validation);

  return (
    <Tile heading="Zugriff erlauben" childrenClassName="flex flex-col gap-4">
      <div>
        <p className="text-sm text-neutral-500">
          {validation.oauthResource === OAuthResource.RemoteControlProgram
            ? "Dieses Programm möchte sich mit deinem Account bei SAM anmelden:"
            : "Diese Anwendung möchte in deinem Namen auf SAM zugreifen:"}
        </p>
        <p className="mt-1 text-2xl font-bold wrap-break-word">
          {validation.client.clientName}
        </p>
        <p className="break-all">{new URL(validation.client.clientId).host}</p>
      </div>

      <ResourceDecision
        validation={validation}
        actor={actor}
        parameters={parameters}
      />

      <p className="text-right text-sm break-all text-neutral-500">
        Du wirst weitergeleitet zu {getRedirectTarget(validation.redirectUri)}
      </p>
    </Tile>
  );
};

interface ResourceDecisionProps extends Props {
  readonly parameters: Readonly<Record<string, string>>;
}

const ResourceDecision = ({
  validation,
  actor,
  parameters,
}: ResourceDecisionProps) => {
  switch (validation.oauthResource) {
    case OAuthResource.Mcp:
      return (
        <ConsentDecision
          parameters={parameters}
          clientName={validation.client.clientName}
          // A new grant starts without admin mode
          toolGroups={listGrantToolGroups(actor, false)}
        />
      );

    case OAuthResource.RemoteControlProgram:
      return <DesktopCompanionConsentDecision parameters={parameters} />;

    default:
      throw new Error(
        `Unknown resource: ${validation.oauthResource satisfies never}`,
      );
  }
};
