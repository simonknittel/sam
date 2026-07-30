"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import Note from "@/modules/common/components/Note";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { usePermissionsContext } from "../PermissionsContext";

export const DocumentsTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="documents">
      <Note
        type="info"
        message="Diese Berechtigungen verhindert nicht, dass sich Benutzer die Dateien
        herunterladen und selbstständig weiterverbreiten."
      />

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Onboarding</h4>
        <YesNoCheckbox {...register("documentOnboarding;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Alliance</h4>
        <YesNoCheckbox {...register("documentAlliance;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">A1</h4>
        <YesNoCheckbox {...register("documentA1;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">A2</h4>
        <YesNoCheckbox {...register("documentA2;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">A3</h4>
        <YesNoCheckbox {...register("documentA3;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Member</h4>
        <YesNoCheckbox {...register("documentMember;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Recon</h4>
        <YesNoCheckbox {...register("documentRecon;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Dogfight</h4>
        <YesNoCheckbox {...register("documentDogfight;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Advanced Dogfight</h4>
        <YesNoCheckbox {...register("documentAdvancedDogfight;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Hands On Deck</h4>
        <YesNoCheckbox {...register("documentHandsOnDeck;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Engineering</h4>
        <YesNoCheckbox {...register("documentEngineering;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Boots On The Ground</h4>
        <YesNoCheckbox {...register("documentBootsOnTheGround;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Captain On The Bridge</h4>
        <YesNoCheckbox {...register("documentCaptainOnTheBridge;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Missiles</h4>
        <YesNoCheckbox {...register("documentMissiles;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Bombardment</h4>
        <YesNoCheckbox {...register("documentBombardment;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Interdict and Disable</h4>
        <YesNoCheckbox {...register("documentInterdictAndDisable;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Leadership</h4>
        <YesNoCheckbox {...register("documentLeadership;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Tech and Tactic</h4>
        <YesNoCheckbox {...register("documentTechAndTactic;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Frontline</h4>
        <YesNoCheckbox {...register("documentFrontline;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Lead The Pack</h4>
        <YesNoCheckbox {...register("documentLeadThePack;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Supervisor</h4>
        <YesNoCheckbox {...register("documentSupervisor;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Manager</h4>
        <YesNoCheckbox {...register("documentManager;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Salvage</h4>
        <YesNoCheckbox {...register("documentSalvage;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Mining</h4>
        <YesNoCheckbox {...register("documentMining;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Trade And Transport</h4>
        <YesNoCheckbox {...register("documentTradeAndTransport;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Scavenger</h4>
        <YesNoCheckbox {...register("documentScavenger;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Marketeer</h4>
        <YesNoCheckbox {...register("documentMarketeer;read")} />
      </div>

      <div className="py-2 flex justify-between items-center mt-2">
        <h4 className="font-bold">Polaris</h4>
        <YesNoCheckbox {...register("documentPolaris;read")} />
      </div>
    </TabPanel>
  );
};
