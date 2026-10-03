import clsx from "clsx";
import { Link } from "../../common/components/Link";

interface Props {
  className?: string;
}

export const Footer = ({ className }: Readonly<Props>) => {
  return (
    <footer className={clsx("text-center text-xs text-neutral-500", className)}>
      <div>
        <Link href="/privacy" className="underline">
          Datenschutzerklärung
        </Link>{" "}
        •{" "}
        <Link href="/imprint" className="underline">
          Impressum
        </Link>
      </div>
      Sinister Incorporated
    </footer>
  );
};
