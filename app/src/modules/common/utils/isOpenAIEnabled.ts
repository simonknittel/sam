import { env } from "@/env";
import { log } from "@/modules/logging";
import { getUnleashFlag } from "./getUnleashFlag";
import { UNLEASH_FLAG } from "./UNLEASH_FLAG";

export const isOpenAIEnabled = async (key: "RoleNameSuggestions") => {
  if (!env.OPENAI_BASE_URL || !env.OPENAI_API_KEY) {
    log.warn("OpenAI is not enabled because of missing configuration");
    return false;
  }

  if (
    key === "RoleNameSuggestions" &&
    (await getUnleashFlag(UNLEASH_FLAG.DisableRoleNameSuggestions))
  )
    return false;

  return true;
};
