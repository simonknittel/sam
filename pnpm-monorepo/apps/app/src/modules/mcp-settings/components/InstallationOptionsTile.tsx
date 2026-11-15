import { Link } from "@/modules/common/components/Link";
import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly className?: string;
}

export const InstallationOptionsTile = ({ className }: Props) => {
  return (
    <Tile
      className={className}
      heading="Installation"
      childrenClassName="flex flex-col gap-6"
    >
      <ul className="flex flex-col gap-4">
        <InstallationOption
          href="/app/ai-agents/claude-plugin"
          title="Plugin für Claude"
        >
          Der MCP-Server und die Skills in einem Schritt, für Claude Code,
          Claude Desktop und Claude.ai.
        </InstallationOption>

        <InstallationOption href="/app/ai-agents/manual" title="Manuell">
          Der MCP-Server und die Skills einzeln, für jeden Client, zum Beispiel
          auch ChatGPT und Codex.
        </InstallationOption>
      </ul>

      <p className="text-sm text-neutral-500">
        Unter{" "}
        <PageLink href="/app/ai-agents/clients">Verbundene Clients</PageLink>{" "}
        benennst und trennst du deine Clients und wählst ihre Tools.
      </p>
    </Tile>
  );
};

interface InstallationOptionProps {
  readonly href: string;
  readonly title: string;
  readonly children: ReactNode;
}

const InstallationOption = ({
  href,
  title,
  children,
}: InstallationOptionProps) => {
  return (
    <li>
      <PageLink href={href} className="font-bold">
        {title}
      </PageLink>
      <p className="mt-1 text-sm">{children}</p>
    </li>
  );
};

interface PageLinkProps {
  readonly href: string;
  readonly className?: string;
  readonly children: ReactNode;
}

const PageLink = ({ href, className, children }: PageLinkProps) => {
  return (
    <Link
      href={href}
      className={clsx(
        "text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-700",
        className,
      )}
    >
      {children}
    </Link>
  );
};
