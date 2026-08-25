import { prisma } from "@/db";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { ProfileForm } from "@/modules/citizen/components/ProfileForm";
import { getSupportedTimezones } from "@/modules/citizen/utils/timezones";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/account/profile",
  );
  if (!authentication.session.entity) notFound();

  const citizen = await prisma.entity.findUniqueOrThrow({
    where: { id: authentication.session.entity.id },
    select: { timezone: true, birthdayDay: true, birthdayMonth: true },
  });

  return (
    <ProfileForm
      timezones={getSupportedTimezones()}
      timezone={citizen.timezone}
      birthdayDay={citizen.birthdayDay}
      birthdayMonth={citizen.birthdayMonth}
    />
  );
}
