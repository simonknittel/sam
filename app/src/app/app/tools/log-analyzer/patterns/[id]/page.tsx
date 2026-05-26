import { prisma } from "@/db";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { DeleteLogAnalyzerPattern } from "@/modules/log-analyzer/components/DeleteLogAnalyzerPattern";
import { LogAnalyzerPatternForm } from "@/modules/log-analyzer/components/LogAnalyzerPatternForm";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/app/tools/log-analyzer/patterns/[id]">): Promise<Metadata> {
  const patternId = (await params).id;
  const pattern = await prisma.logAnalyzerPattern.findFirst({
    where: { id: patternId, deletedAt: null },
    select: { title: true },
  });

  return {
    title: pattern ? `Muster: ${pattern.title}` : "Muster",
  };
}

export default async function Page({
  params,
}: PageProps<"/app/tools/log-analyzer/patterns/[id]">) {
  const authentication = await requireAuthenticationPage(
    "/app/log-analyzer/patterns/[id]",
  );
  await authentication.authorizePage("logAnalyzerPattern", "manage");

  const patternId = (await params).id;
  const pattern = await prisma.logAnalyzerPattern.findFirst({
    where: {
      id: patternId,
      deletedAt: null,
    },
  });

  if (!pattern) notFound();

  return (
    <div className="flex flex-col gap-4">
      <LogAnalyzerPatternForm pattern={pattern} />
      <DeleteLogAnalyzerPattern pattern={pattern} />
    </div>
  );
}
