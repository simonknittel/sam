import { Hero } from "@/modules/common/components/Hero";
import { MainContent } from "@/modules/common/components/layouts/MainContent";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center background-primary py-8">
      <MainContent className="w-full max-w-lg">
        <div className="mb-4 text-center">
          <Hero text="404" className="mx-auto text-center" withGlitch />
        </div>

        <div className="mx-8 flex flex-col items-center gap-2 rounded-primary bg-secondary p-8">
          <p>Page not found</p>
        </div>
      </MainContent>

      <Footer className="mt-4" />
    </div>
  );
}
