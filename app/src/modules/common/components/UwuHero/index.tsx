import clsx from "clsx";
import Image from "next/image";
import image from "./sam-sinister-transparent.png";

interface Props {
  readonly className?: string;
}

export const UwuHero = ({ className }: Props) => {
  return (
    <div className={clsx(className)}>
      <Image src={image} alt="SAM - Sinister Incorporated" width={256} />
    </div>
  );
};
