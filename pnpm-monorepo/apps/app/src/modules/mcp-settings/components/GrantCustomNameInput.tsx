import { TextInput } from "@/modules/common/components/form/TextInput";
import { OAUTH_GRANT_CUSTOM_NAME_MAXIMUM_LENGTH } from "@sam-monorepo/domain";
import type { ComponentProps } from "react";

interface Props extends Pick<
  ComponentProps<"input">,
  "name" | "defaultValue" | "value" | "onChange"
> {
  /** The name that the client gives itself */
  readonly clientName: string;
}

/** The own name of a connected client. The MCP app and the consent page use it. */
export const GrantCustomNameInput = ({ clientName, ...rest }: Props) => {
  return (
    <TextInput
      label="Name"
      placeholder={clientName}
      maxLength={OAUTH_GRANT_CUSTOM_NAME_MAXIMUM_LENGTH}
      autoComplete="off"
      hint={`Zum Beispiel der Name des Geräts. Ohne eigenen Namen zeigt SAM „${clientName}“.`}
      {...rest}
    />
  );
};
