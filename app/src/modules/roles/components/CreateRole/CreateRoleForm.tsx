import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";
import { Suggestions } from "../Suggestions";

interface FormValues {
  name: string;
}

interface Props {
  readonly className?: string;
  readonly enableSuggestions?: boolean;
  readonly onSuccess?: () => void;
}

export const CreateRoleForm = ({
  className,
  enableSuggestions = true,
  onSuccess,
}: Props) => {
  // TODO: Re-add "enableSuggestions" -> Unleash: "RoleNameSuggestions"

  const router = useRouter();
  const { register, handleSubmit, reset, setValue } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/role`, {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
        }),
      });

      if (response.ok) {
        router.refresh();
        toast.success("Erfolgreich hinzugefügt");
        reset();
        onSuccess?.();
      } else {
        toast.error("Beim Hinzufügen ist ein Fehler aufgetreten.");
      }
    } catch (error) {
      toast.error("Beim Hinzufügen ist ein Fehler aufgetreten.");
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={clsx(className)}>
      <TextInput
        label="Name"
        className="mt-2"
        {...register("name", { required: true })}
        autoFocus
      />

      {enableSuggestions && (
        <Suggestions
          className="mt-4"
          onClick={(roleName) => setValue("name", roleName)}
        />
      )}

      <div className="flex justify-end mt-8">
        <Button2 type="submit" disabled={isLoading}>
          {isLoading ? <FaSpinner className="animate-spin" /> : <FaSave />}
          Speichern
        </Button2>
      </div>
    </form>
  );
};
