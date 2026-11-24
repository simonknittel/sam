import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { MarkdownRenderer } from "./MarkdownRenderer";

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

interface Props {
  readonly className?: string;
  readonly children: string;
}

export const Markdown = ({ className, children }: Props) => {
  return (
    <MarkdownRenderer className={className} remarkPlugins={REMARK_PLUGINS}>
      {children}
    </MarkdownRenderer>
  );
};
