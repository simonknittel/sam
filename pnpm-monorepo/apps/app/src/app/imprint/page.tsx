import { Wip } from "@/modules/common/components/Wip";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function Page() {
  return (
    <div className="min-h-dvh background-primary">
      <div className="p-2 pt-4 lg:p-8">
        <main className="flex items-center flex-col">
          <h1 className="text-xl font-bold">Impressum</h1>

          <div className="mt-4 w-full max-w-xl p-4 lg:p-8 rounded-primary bg-neutral-800/50 ">
            <Wip />
          </div>
        </main>

        <Footer className="mt-4" />
      </div>
    </div>
  );
}
