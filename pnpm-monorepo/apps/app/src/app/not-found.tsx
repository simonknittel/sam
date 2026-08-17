import { Hero } from "@/modules/common/components/Hero";
import { MainContent } from "@/modules/common/components/layouts/MainContent";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "404 Not Found",
};

export default function NotFound() {
  return (
    <div className="min-h-dvh flex justify-center items-center flex-col py-8 background-primary">
      <MainContent className="w-full max-w-lg">
        <div className="text-center mb-4">
          <Hero text="404" className="text-center mx-auto" withGlitch />
        </div>

        <div className="flex flex-col gap-2 rounded-primary bg-secondary p-8 mx-8 items-center">
          <p>Page not found</p>
        </div>
      </MainContent>

      <Footer className="mt-4" />
    </div>
  );
}
