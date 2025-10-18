import { requireAuthenticationPage } from "@/modules/auth/server";
import { SubNavigation } from "@/modules/common/components/SubNavigation";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getRoleById } from "@/modules/roles/queries";
import { notFound } from "next/navigation";
import { FaHome, FaLock, FaUsers } from "react-icons/fa";
import { TbHierarchy3 } from "react-icons/tb";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const role = await getRoleById((await props.params).id);
    if (!role) notFound();

    return {
      title: {
        template: `%s - ${role.name}`,
        default: role.name,
      },
    };
  },
);

export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/roles/[id]">) {
  const authentication = await requireAuthenticationPage(
    "/app/roles/[id]/inheritance",
  );
  await authentication.authorizePage("role", "manage");

  const roleId = (await params).id;
  const role = await getRoleById(roleId);
  if (!role) notFound();

  const pages = [
    {
      name: "Übersicht",
      icon: <FaHome />,
      path: `/app/roles/${role.id}`,
    },
    {
      name: "Berechtigungen",
      icon: <FaLock />,
      path: `/app/roles/${role.id}/permissions`,
    },
    {
      name: `Vererbungen (${role.inherits.length})`,
      icon: <TbHierarchy3 />,
      path: `/app/roles/${role.id}/inheritance`,
    },
    {
      name: "Citizen",
      icon: <FaUsers />,
      path: `/app/spynet/citizen?filters=role-${role.id}`,
    },
  ];

  return (
    <>
      <div className="flex gap-2 font-bold text-xl">
        <span className="text-neutral-500">Rolle /</span>
        <p>{role?.name}</p>
      </div>

      <SubNavigation pages={pages} className="flex flex-wrap my-4" />

      {children}
    </>
  );
}
