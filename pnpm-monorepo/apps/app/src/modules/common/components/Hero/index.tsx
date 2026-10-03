import clsx from "clsx";
import { ScrambleIn } from "../ScrambleIn";
import styles from "./Hero.module.css";

interface Props {
  readonly className?: string;
  readonly text: string;
  readonly size?: "sm" | "md" | "lg";
  readonly withGlitch?: boolean;
}

export const Hero = ({
  className,
  text,
  size = "lg",
  withGlitch = false,
}: Props) => {
  return (
    <h1
      className={clsx(
        className,
        "relative z-1 inline-block bg-brand-text-gradient bg-clip-text font-hero font-extrabold whitespace-nowrap text-transparent uppercase",
        {
          "text-5xl lg:text-6xl": size === "lg",
          [styles.layers]: withGlitch,
          [styles.glitch]: withGlitch,
          "text-3xl lg:text-4xl": size === "md",
          "text-xl lg:text-2xl": size === "sm",
        },
      )}
      data-text={text}
    >
      <span>
        <ScrambleIn text={text} repeatInterval={5000} />
      </span>
    </h1>
  );
};
