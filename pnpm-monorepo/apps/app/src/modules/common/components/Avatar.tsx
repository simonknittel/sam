import clsx from "clsx";
import Image from "next/image";
import { BirthdayHat } from "./BirthdayHat";

// https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript/21682946#21682946
function stringToColor(str: string) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  return `hsl(${hash % 360}, 100%, 25%)`;
}

/** A mark on the corner of the avatar, outside of the clipped image */
export enum AvatarDecoration {
  BirthdayHat = "birthday-hat",
}

interface Props {
  readonly className?: string;
  readonly name?: string | null;
  readonly image?: string | null;
  readonly size?: number;
  readonly decoration?: AvatarDecoration;
}

const Avatar = ({ className, name, image, size, decoration }: Props) => {
  const imageSize = size || 64;

  return (
    /* The outer element carries the size and does not clip, thus a
    decoration can extend past the corner of the image. */
    <span
      className={clsx(className, "relative block")}
      style={{
        width: imageSize,
        height: imageSize,
      }}
    >
      <span
        className={clsx(
          "flex size-full items-center justify-center overflow-hidden uppercase",
          {
            "text-sm": size === 32,
            "text-2xl": !size || size === 64,
            "text-3xl": size === 128,
            "rounded-primary": size === 128,
            rounded: size !== 128,
          },
        )}
        style={{
          backgroundColor: image
            ? undefined
            : name
              ? stringToColor(name)
              : "#dedfe0",
        }}
      >
        {image ? (
          <Image
            src={`${image}?size=${imageSize}`}
            alt={name ? `Image of ${name}` : ""}
            width={imageSize}
            height={imageSize}
            loading="lazy"
          />
        ) : name ? (
          name.replace(/\s/g, "").substring(0, 2)
        ) : null}
      </span>

      {decoration === AvatarDecoration.BirthdayHat && (
        <BirthdayHat className="pointer-events-none absolute -top-[16%] -right-[8%] size-[45%] rotate-[20deg]" />
      )}
    </span>
  );
};

export default Avatar;
