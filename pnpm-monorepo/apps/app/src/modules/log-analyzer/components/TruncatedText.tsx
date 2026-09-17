interface Props {
  readonly children: string;
}

/** A single line of text. The full text shows on hover when the line cuts it. */
export const TruncatedText = ({ children }: Props) => {
  return (
    <span className="truncate" title={children}>
      {children}
    </span>
  );
};
