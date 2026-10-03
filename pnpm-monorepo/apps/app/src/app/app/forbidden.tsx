import { requireAuthenticationPage } from "@/modules/auth/server";
import { Hero } from "@/modules/common/components/Hero";
import { MainContent } from "@/modules/common/components/layouts/MainContent";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

export default async function Forbidden() {
  await requireAuthenticationPage("/app/forbidden");

  return (
    <MainContent className="flex min-h-dvh flex-col items-center justify-center">
      <div className="mb-4 text-center">
        <Hero text="Redacted" className="mx-auto text-center" withGlitch />
      </div>

      <div className="mx-8 flex flex-col items-center gap-2 rounded-primary bg-neutral-800/50 p-8">
        <p>Du bist nicht berechtigt dies zu sehen.</p>
      </div>
    </MainContent>
  );
}
