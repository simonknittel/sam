import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";

export const getNavigationItems = createNavigationItems(
  async (authentication) =>
    (await authentication.authorize("mcp", "use"))
      ? [
          { title: "Übersicht", url: "/app/ai-agents" },
          { title: "Plugin für Claude", url: "/app/ai-agents/claude-plugin" },
          { title: "Manuell", url: "/app/ai-agents/manual" },
          { title: "Verbundene Clients", url: "/app/ai-agents/clients" },
        ]
      : [],
);
