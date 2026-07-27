import { Button2 } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";

interface FormValues {
  spectrumId: string;
  name: string;
}

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreateOrganizationForm = ({ className, onSuccess }: Props) => {
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);
  const spectrumIdInputId = useId();
  const nameInputId = useId();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/spynet/organization`, {
        method: "POST",
        body: JSON.stringify({
          spectrumId: data.spectrumId,
          name: data.name,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { id: string };
        router.push(`/app/spynet/organization/${data.id}`);
        reset();
        onSuccess?.();
      } else {
        toast.error("Beim Anlegen ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Anlegen ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={clsx(className)}>
      <label className="block" htmlFor={spectrumIdInputId}>
        Spectrum ID
      </label>

      <input
        className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
        id={spectrumIdInputId}
        {...register("spectrumId", { required: true })}
        autoFocus
      />

      <label className="mt-4 block" htmlFor={nameInputId}>
        Name
      </label>

      <input
        className="p-2 rounded-secondary bg-neutral-900 w-full mt-2"
        id={nameInputId}
        {...register("name", { required: true })}
      />

      <div className="flex justify-end mt-8">
        <Button2 type="submit" disabled={isLoading}>
          {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
          Anlegen
        </Button2>
      </div>
    </form>
  );
};
