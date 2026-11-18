import { Fragment } from "react";

/** A part of a text which shows in a weaker color */
interface MutedText {
  readonly muted: string;
}

export const muted = (text: string): MutedText => ({ muted: text });

type TextPart = string | MutedText;

const toPlainText = (part: TextPart) =>
  typeof part === "string" ? part : part.muted;

interface Props {
  /** The text, or its parts, which show with a space between them */
  readonly children: string | readonly TextPart[];
}

/** A single line of text. The full text shows on hover when the line cuts it. */
export const TruncatedText = ({ children }: Props) => {
  const parts = typeof children === "string" ? [children] : children;

  return (
    <span className="truncate" title={parts.map(toPlainText).join(" ")}>
      {parts.map((part, index) => (
        // The parts of a message never change their order
        <Fragment key={index}>
          {index > 0 && " "}
          {typeof part === "string" ? (
            part
          ) : (
            <span className="text-white/40">{part.muted}</span>
          )}
        </Fragment>
      ))}
    </span>
  );
};
