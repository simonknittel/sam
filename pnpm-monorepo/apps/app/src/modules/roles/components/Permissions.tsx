"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import { TabsProvider } from "@/modules/common/components/tabs/TabsContext";
import {
  type ClassificationLevel,
  type NoteType,
  type Role,
} from "@sam-monorepo/database/browser";
import {
  FaBookOpen,
  FaCalendarDay,
  FaCog,
  FaPiggyBank,
  FaSave,
} from "react-icons/fa";
import { FaScaleBalanced } from "react-icons/fa6";
import { IoDocuments } from "react-icons/io5";
import { MdTaskAlt, MdWorkspaces } from "react-icons/md";
import { RiSpyFill } from "react-icons/ri";
import { updateRolePermissions } from "../actions/updateRolePermissions";
import { CitizenTab } from "./tabs/CitizenTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import EventsTab from "./tabs/EventsTab";
import FleetTab from "./tabs/FleetTab";
import { OrganizationsTab } from "./tabs/OrganizationsTab";
import OtherTab from "./tabs/OtherTab";
import { PenaltyPointsTab } from "./tabs/PenaltyPointsTab";
import { SilcTab } from "./tabs/SilcTab";
import { TasksTab } from "./tabs/TasksTab";
import { WikiTab } from "./tabs/WikiTab";

interface Props {
  readonly className?: string;
  readonly role: Role;
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
  readonly allRoles: readonly Pick<Role, "id" | "name">[];
}

export const Permissions = ({
  role,
  noteTypes,
  classificationLevels,
  allRoles,
}: Props) => {
  const { state, formAction, isPending } = useAction(updateRolePermissions, {
    errorToast: false,
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={role.id} />

      <TabsProvider initialActiveTab="citizen">
        <TabList>
          <Tab id="citizen">
            <RiSpyFill /> Citizen
          </Tab>

          <Tab id="documents">
            <IoDocuments /> Dokumente
          </Tab>

          <Tab id="events">
            <FaCalendarDay /> Events
          </Tab>

          <Tab id="fleet">
            <MdWorkspaces /> Flotte
          </Tab>

          <Tab id="organizations">
            <RiSpyFill /> Organisationen
          </Tab>

          <Tab id="silc">
            <FaPiggyBank /> SILC
          </Tab>

          <Tab id="penalty_points">
            <FaScaleBalanced /> Strafpunkte
          </Tab>

          <Tab id="tasks">
            <MdTaskAlt /> Tasks
          </Tab>

          <Tab id="wiki">
            <FaBookOpen /> Wiki
          </Tab>

          <Tab id="other">
            <FaCog /> Sonstiges
          </Tab>
        </TabList>

        <CitizenTab
          noteTypes={noteTypes}
          classificationLevels={classificationLevels}
        />
        <OrganizationsTab />
        <FleetTab />
        <EventsTab />
        <DocumentsTab />
        <SilcTab />
        <PenaltyPointsTab />
        <TasksTab />
        <WikiTab />
        <OtherTab roles={allRoles} />
      </TabsProvider>

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <AsciiSpinner /> : <FaSave />}
        Speichern
      </Button2>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
