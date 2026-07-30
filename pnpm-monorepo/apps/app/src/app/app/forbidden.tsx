import { requireAuthenticationPage } from "@/modules/auth/server";
import { Hero } from "@/modules/common/components/Hero";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Forbidden",
};

export default async function Forbidden() {
  await requireAuthenticationPage("/app/forbidden");

  return (
    <main className="min-h-dvh flex flex-col justify-center items-center">
      <div className="text-center mb-4">
        <Hero text="Redacted" className="text-center mx-auto" withGlitch />
      </div>

      <div className="flex flex-col gap-2 rounded-primary bg-neutral-800/50 p-8 mx-8 items-center">
        <p>Du bist nicht berechtigt dies zu sehen.</p>
      </div>
    </main>
  );
}
