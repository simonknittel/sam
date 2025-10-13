import { ContainerCalculator } from "@/modules/container-calculator/components/ContainerCalculator";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Container Calculator",
};

export default function Page() {
  return <ContainerCalculator />;
}
