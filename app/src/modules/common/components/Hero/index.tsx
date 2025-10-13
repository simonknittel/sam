import clsx from "clsx";
import styles from "./Hero.module.css";

interface Props {
  readonly className?: string;
  readonly text: string;
  readonly size?: "sm" | "md" | "lg";
  readonly withGlitch?: boolean;
  readonly asSpan?: boolean;
}

export const Hero = ({
  className,
  text,
  size = "lg",
  withGlitch = false,
  asSpan = false,
}: Props) => {
  if (asSpan)
    return (
      <span
        className={clsx(
          className,
          "inline-block uppercase font-extrabold bg-clip-text text-transparent bg-brand-text-gradient relative z-[1] whitespace-nowrap",
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
        <span>{text}</span>
      </span>
    );

  return (
    <h1
      className={clsx(
        className,
        "inline-block uppercase font-extrabold bg-clip-text text-transparent bg-brand-text-gradient relative z-[1] whitespace-nowrap",
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
      <span>{text}</span>
    </h1>
  );
};
