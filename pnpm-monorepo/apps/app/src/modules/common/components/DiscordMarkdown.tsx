import { remarkDiscordFormatting } from "@/modules/discord/utils/remarkDiscordFormatting";
import type { Ref } from "react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { MarkdownRenderer } from "./MarkdownRenderer";

/**
 * `remarkDiscordFormatting` runs before `remarkBreaks`, so that a construct
 * that keeps its original characters also keeps its line breaks.
 */
const REMARK_PLUGINS = [remarkGfm, remarkDiscordFormatting, remarkBreaks];

interface Props {
  readonly className?: string;
  readonly children: string;
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Shows the set of formats of Discord. Use it for text that a user writes for
 * both the app and Discord, for example the description of an event.
 */
export const DiscordMarkdown = ({ className, children, ref }: Props) => {
  return (
    <MarkdownRenderer
      className={className}
      ref={ref}
      remarkPlugins={REMARK_PLUGINS}
    >
      {children}
    </MarkdownRenderer>
  );
};
