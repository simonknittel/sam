"use client";

import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { OrganizationMembershipSection } from "./components/OrganizationMembershipSection";
import { OrganizationSection } from "./components/OrganizationSection";

export const OrganizationsTab = () => {
  return (
    <TabPanel id="organizations">
      <OrganizationSection />

      <OrganizationMembershipSection className="mt-4" />
    </TabPanel>
  );
};
