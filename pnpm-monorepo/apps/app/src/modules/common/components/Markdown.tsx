import type { Ref } from "react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { MarkdownRenderer } from "./MarkdownRenderer";

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

interface Props {
  readonly className?: string;
  readonly children: string;
  readonly ref?: Ref<HTMLDivElement>;
}

/** Shows the full set of formats of GitHub Flavored Markdown. */
export const Markdown = ({ className, children, ref }: Props) => {
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
