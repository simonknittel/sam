import Note from "@/modules/common/components/Note";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";

/**
 * The pages of the app stay available while the kill switch is on: they only
 * manage the settings and give the files
 */
export const McpServerDisabledNote = async () => {
  if (!(await isMcpServerDisabled())) return null;

  return (
    <Note
      type="warning"
      message="Der MCP-Server ist zurzeit abgeschaltet. Verbundene Clients können SAM nicht nutzen, und neue Clients können sich nicht verbinden. Deine Einstellungen bleiben erhalten."
    />
  );
};
