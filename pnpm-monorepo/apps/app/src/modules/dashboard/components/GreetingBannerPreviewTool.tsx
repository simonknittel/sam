"use client";

import { runActionAndReload } from "@/modules/actions/utils/runActionAndReload";
import { useTransition, type ChangeEvent } from "react";
import { setGreetingBannerPreview } from "../actions/setGreetingBannerPreview";
import {
  GREETING_BANNER_PREVIEW_LABELS,
  GreetingBannerPreview,
} from "../utils/GreetingBannerPreview";

const AUTO_VALUE = "";

interface Props {
  readonly preview: GreetingBannerPreview | null;
}

export const GreetingBannerPreviewTool = ({ preview }: Props) => {
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const formData = new FormData();
    formData.set("preview", event.target.value);

    startTransition(() =>
      runActionAndReload(setGreetingBannerPreview, formData),
    );
  };

  return (
    <select
      aria-label="Greeting banner preview"
      defaultValue={preview ?? AUTO_VALUE}
      onChange={handleChange}
      disabled={isPending}
      className="w-full rounded-secondary bg-neutral-900 px-2 py-1 text-sm hover:bg-neutral-800 focus:outline-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/25 active:bg-neutral-800 enabled:cursor-pointer disabled:opacity-50"
    >
      <option value={AUTO_VALUE}>Auto</option>

      {Object.values(GreetingBannerPreview).map((value) => (
        <option key={value} value={value}>
          {GREETING_BANNER_PREVIEW_LABELS[value]}
        </option>
      ))}
    </select>
  );
};
