import { CurrentStatusLoader } from "@/modules/preview-channel/components/CurrentStatusLoader";
import { FullScheduleLoader } from "@/modules/preview-channel/components/FullScheduleLoader";
import { schedule } from "@/modules/preview-channel/utils/schedule";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Preview Channel",
};

export default function Page() {
  return (
    <main className="p-2 pt-4 lg:p-8 flex items-center flex-col">
      <h1 className="text-xl font-bold">Preview Channel</h1>

      <CurrentStatusLoader schedule={schedule} />

      <FullScheduleLoader schedule={schedule} />
    </main>
  );
}
