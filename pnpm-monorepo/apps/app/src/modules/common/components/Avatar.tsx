import clsx from "clsx";
import Image from "next/image";
import { BirthdayHat } from "./BirthdayHat";
import { ConfettiCanvas } from "./ConfettiCanvas";

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

/** Milliseconds between two bursts while the avatar is in view */
const CONFETTI_INTERVAL = 1000;

/**
 * An avatar is small, thus the particles are small as well and they travel
 * slowly. The smallest avatar the app shows is 32 pixels wide, which the
 * values below still fill.
 */
const CONFETTI_SHOT = {
  particleCount: 4,
  spread: 55,
  startVelocity: 5,
  gravity: 0.3,
  decay: 0.9,
  scalar: 0.4,
  ticks: 110,
};

/** One shot from each lower corner, both towards the middle of the avatar */
const CONFETTI_SHOTS = [
  { ...CONFETTI_SHOT, angle: 60, origin: { x: 0, y: 1 } },
  { ...CONFETTI_SHOT, angle: 120, origin: { x: 1, y: 1 } },
];

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
          "relative flex size-full items-center justify-center overflow-hidden uppercase",
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

        {/* Inside the clipped element, thus the confetti follows the
        rounded corners of the avatar and stays over its image. */}
        {decoration === AvatarDecoration.BirthdayHat && (
          <ConfettiCanvas
            shots={CONFETTI_SHOTS}
            intervalMilliseconds={CONFETTI_INTERVAL}
            className="absolute inset-0 size-full"
          />
        )}
      </span>

      {decoration === AvatarDecoration.BirthdayHat && (
        <BirthdayHat className="pointer-events-none absolute -top-[16%] -right-[8%] size-[45%] rotate-[20deg]" />
      )}
    </span>
  );
};

export default Avatar;
