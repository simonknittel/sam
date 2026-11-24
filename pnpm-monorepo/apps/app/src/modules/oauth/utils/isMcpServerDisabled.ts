import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";

/** The kill switch of the MCP server (see docs/mcp-server.md) */
export const isMcpServerDisabled = () =>
  getUnleashFlag(UNLEASH_FLAG.DisableMcpServer);
