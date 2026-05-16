"use client";

import {
  type ClassificationLevel,
  type Flow,
  type NoteType,
  type Role,
} from "@/generated/prisma/browser";
import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import { TabsProvider } from "@/modules/common/components/tabs/TabsContext";
import clsx from "clsx";
import { useActionState } from "react";
import {
  FaCalendarDay,
  FaCog,
  FaHammer,
  FaPiggyBank,
  FaSave,
  FaSpinner,
} from "react-icons/fa";
import { FaScaleBalanced } from "react-icons/fa6";
import { IoDocuments } from "react-icons/io5";
import { MdTaskAlt, MdWorkspaces } from "react-icons/md";
import { RiSpyFill } from "react-icons/ri";
import { updateRolePermissions } from "../actions/updateRolePermissions";
import { BlueprintsTab } from "./tabs/BlueprintsTab";
import { CitizenTab } from "./tabs/CitizenTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import EventsTab from "./tabs/EventsTab";
import FleetTab from "./tabs/FleetTab";
import { OrganizationsTab } from "./tabs/OrganizationsTab";
import OtherTab from "./tabs/OtherTab";
import { PenaltyPointsTab } from "./tabs/PenaltyPointsTab";
import { SilcTab } from "./tabs/SilcTab";
import { TasksTab } from "./tabs/TasksTab";

interface Props {
  readonly className?: string;
  readonly role: Role;
  readonly noteTypes: NoteType[];
  readonly classificationLevels: ClassificationLevel[];
  readonly allRoles: Role[];
  readonly flows: Flow[];
}

export const Permissions = ({
  role,
  noteTypes,
  classificationLevels,
  allRoles,
  flows,
}: Props) => {
  const [state, formAction, isPending] = useActionState(
    updateRolePermissions,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={role.id} />

      <TabsProvider initialActiveTab="citizen">
        <TabList>
          <Tab id="blueprints">
            <FaHammer /> Blueprints
          </Tab>

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

          <Tab id="other">
            <FaCog /> Sonstiges
          </Tab>
        </TabList>

        <BlueprintsTab />
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
        <OtherTab roles={allRoles} flows={flows} />
      </TabsProvider>

      <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
        {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
        Speichern
      </Button2>

      {state && (
        <Note
          type={state.success ? "success" : "error"}
          message={state.success ? state.success : state.error}
          className={clsx("mt-4", {
            "animate-pulse": isPending,
          })}
        />
      )}
    </form>
  );
};
