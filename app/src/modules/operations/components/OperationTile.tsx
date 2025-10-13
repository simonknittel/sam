import { Link } from "@/modules/common/components/Link";
import { type Operation, type OperationMember } from "@prisma/client";
import clsx from "clsx";
import { FaArrowRight } from "react-icons/fa";

interface Props {
  className?: string;
  operation: Operation & {
    members: OperationMember[];
  };
}

const OperationTile = ({ className, operation }: Readonly<Props>) => {
  return (
    <article
      className={clsx(
        className,
        "block bg-neutral-800/50  rounded-primary overflow-hidden",
      )}
    >
      <div className="flex flex-col lg:flex-row lg:justify-between gap-4 p-4 lg:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-xl">{operation.title}</h2>

          <p>
            <span className="text-neutral-500">Teilnehmer:</span>{" "}
            {operation.members.length}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`/app/operations/${operation.id}`}
            className="flex items-center justify-center gap-4 rounded-secondary uppercase h-11 border text-base border-brand-red-500 text-brand-red-500 hover:border-brand-red-300 active:border-brand-red-300 hover:text-brand-red-300 active:text-brand-red-300 px-6"
          >
            Öffnen <FaArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default OperationTile;
