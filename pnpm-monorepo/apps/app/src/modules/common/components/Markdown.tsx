import clsx from "clsx";
import type { Ref } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  readonly children: string;
  readonly ref?: Ref<HTMLDivElement>;
}

export const Markdown = ({ className, children, ref }: Props) => {
  return (
    <div
      ref={ref}
      className={clsx("prose prose-invert max-w-none", className)}
      style={{
        overflowWrap: "anywhere",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a: ({ href, node, ...props }) => {
            if (!href) return null;

            const isExternal = /^https?:\/\//.test(href);

            if (isExternal)
              return (
                <a href={href} target="_blank" rel="noreferrer" {...props} />
              );

            return <Link href={href} {...props} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
