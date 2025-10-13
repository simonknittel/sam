import { requireAuthenticationPage } from "@/modules/auth/server";
import { redirect } from "next/navigation";

export default async function Page() {
  await requireAuthenticationPage("/app");

  redirect("/app/dashboard");
}
