import clsx from "clsx";
import Image from "next/image";

// https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript/21682946#21682946
export function stringToColor(str: string) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  return `hsl(${hash % 360}, 100%, 25%)`;
}

interface Props {
  className?: string;
  name?: string | null;
  image?: string | null;
  size?: number;
}

const Avatar = ({ className, name, image, size }: Readonly<Props>) => {
  const imageSize = size || 64;

  return (
    <span
      className={clsx(
        className,
        "flex items-center justify-center overflow-hidden uppercase",
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
        width: imageSize,
        height: imageSize,
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
  );
};

export default Avatar;
