import { EntryType } from "./PATTERNS";

/**
 * One real log line for each type the Log Analyzer recognizes, with the
 * handles, ids and addresses replaced. The tests use them.
 */
export const SAMPLE_LINES: Record<EntryType, string> = {
  [EntryType.JoinPu]:
    "<2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]",
  [EntryType.OwnDeath]:
    "<2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'Testpilot' [123] ejected from zone 'RSI_Zeus_CL_1' [456] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]",
  [EntryType.BlueprintReceivedNotification]:
    '<2026-05-14T14:45:40.207Z> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.ContractAcceptedNotification]:
    '<2026-05-25T07:45:33.982Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted:  Wikelo Arrive to System: " [4] to queue. New queue size: 1, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.ContractCompleteNotification]:
    '<2026-06-01T10:15:20.123Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Complete:  Wikelo Arrive to System: " [5] to queue. New queue size: 2, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.ContractFailedNotification]:
    '<2026-05-25T18:03:03.012Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Failed: CRITICAL REFUEL REQUEST: Crusader Ares Star Fighter Ion <EM4>[200 Rep] [BP]*</EM4>: " [189] to queue. New queue size: 2, MissionId: [c54aa278-06e1-4c83-86d2-9e795f7691f3], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.ContractSharedNotification]:
    '<2026-05-21T18:32:20.325Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Shared: Tactical Strike Group Needed <EM4>[300 Rep] [BP]</EM4>: " [109] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.ContractWithdrawnNotification]:
    '<2026-05-21T19:02:11.481Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Withdrawn:  A Call to Arms: " [231] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.Disconnection]:
    '<2026-05-25T08:40:17.864Z> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=1.2.3.4:64090 localAddr=0.0.0.0:64090 connection={4, 0} session=abc node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="Testpilot" playerGEID=200123456789 uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]',
  [EntryType.InjuryDetectedNotification]:
    '<2026-08-27T10:22:35.005Z> [Notice] <SHUDEvent_OnNotification> Added notification "Minor Injury Detected - Left arm - Tier 3 Treatment Required : " [20] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.MedBedHeal]:
    "<2026-08-27T11:08:44.651Z> [Notice] <MED BED HEAL> Actor: Testpilot (Non-Authoritative CLIENT: Testpilot) | [CEntityComponentMedBed::HandleComponentEvent:1101] | -> Perform surgery event Success, med bed name: Bed_Single_Medical_Instance_Hospital_SOO003, vehicle name: none, head: true torso: false leftArm: true rightArm: false leftLeg: false rightLeg: false [Team_ActorFeatures][Actor]",
  [EntryType.ShopPurchase]:
    "<2026-08-26T19:26:18.919Z> [Notice] <CEntityComponentShopUIProvider::SendShopBuyRequest> Sending SShopBuyRequest - playerId[200123456789] shopId[783648035105] shopName[SCShop_Orison_KelTo] kioskId[783648035110] client_price[18117.000000] itemClassGUID[90adb28a-049e-4357-8000-a4bb75bb7f6f] itemName[behr_smg_ballistic_01_mag] quantity[61]  [Team_CoreGameplayFeatures][Shops][UI]",
  [EntryType.ArmisticeZoneNotification]:
    '<2026-08-26T18:59:25.029Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Armistice Zone - Combat Prohibited: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.JurisdictionNotification]:
    '<2026-08-26T18:50:32.801Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entered Crusader Industries Jurisdiction: " [1] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.MonitoredSpaceNotification]:
    '<2026-08-27T10:07:25.302Z> [Notice] <SHUDEvent_OnNotification> Added notification "Exited Monitored Space: " [15] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.PrivatePropertyNotification]:
    '<2026-08-26T19:06:02.117Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Private Property: " [4] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.PartyInviteReceivedNotification]:
    '<2026-08-26T18:50:40.373Z> [Notice] <SHUDEvent_OnNotification> Added notification "Testinviter\r\n<2026-08-26T18:50:40.373Z> Party Invite Received: Accept Invitation?: " [2] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.PartyMemberJoinedNotification]:
    '<2026-05-25T16:49:39.043Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Member Joined\r\n<2026-05-25T16:49:39.043Z> Testmember has joined the party.: " [4] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.PartyMemberLeftNotification]:
    '<2026-05-25T18:36:38.835Z> [Notice] <SHUDEvent_OnNotification> Added notification "Member Left\r\n<2026-05-25T18:36:38.835Z> Testmember has left the party.: " [285] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.PartyLeaderChangedNotification]:
    '<2026-05-25T18:39:22.607Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Party Leader\r\n<2026-05-25T18:39:22.607Z> Testleader is now party leader.: " [311] to queue. New queue size: 10, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [EntryType.InstanceEntered]:
    "<2026-08-27T10:05:56.047Z> [Notice] <[Instancing] Player entered instance> [Instancing][CEntityComponentBrokeredInstance::OnPlayerEnterInstance] Player Testpilot[200123456789] entered instance StreamingSOC_inst_dogleg_ht_a_siege_a[788400312747], which is NOT authoritative [Team_CGP5][Code][Instancing]",
  [EntryType.InstanceExited]:
    "<2026-08-27T10:08:16.735Z> [Notice] <[Instancing] Player exited instance> [Instancing][CEntityComponentBrokeredInstance::OnPlayerExitInstance] Player Testpilot[200123456789] left instance StreamingSOC_inst_dogleg_ht_a_siege_a[788400312747], which is NOT authoritative [Team_CGP5][Code][Instancing]",
  [EntryType.GameQuit]:
    "<2026-08-27T12:22:53.922Z> [Notice] <SystemQuit> CSystem::Quit invoked with - cause=30016, reason=Quit via console command, exitCode=0, thread id=2188, main thread id=2188 [Team_Unknown][System]",
  [EntryType.GameCrash]:
    "Exception STATUS_CRYENGINE_OUT_OF_SYSMEM(0x2BADFF61) addr=0x00007FFE2CE13CFA digest=114a1cfe538433f07c4a87c536ae0528",
};

/** The end of a log file of a session which crashed, as the game writes it. */
export const SAMPLE_CRASH_FILE_END = [
  "<2026-09-01T16:15:11.246Z> [Notice] <StatObjLoad 0x800 Format> 'data/objectcontainers/pu/loc/mod/pyro/station/ser/reststop_comms/physicsgrid_objectcontainerpivot.cgf' - File exists [Team_Unknown][Unknown]",
  "",
  "Process Memory Status: 11507MB working set size, 19855MB commit size (19860MB peak), 8MB left to commit",
  "",
  "Cloud Imperium Games public crash handler taking over...",
  "Details for StarCitizen.exe (md5=cbeee95d79239ff9c8b1bbf9f37f1145)...",
  SAMPLE_LINES[EntryType.GameCrash],
  "Is fatal error: No",
  "Is out of system memory: Yes",
].join("\r\n");
