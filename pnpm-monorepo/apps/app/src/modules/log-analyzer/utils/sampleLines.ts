import { LogAnalyzerEntryType } from "@sam-monorepo/domain";

/**
 * One real log line for each type the Log Analyzer recognizes, with the
 * handles, ids and addresses replaced. The tests use them.
 */
export const SAMPLE_LINES: Record<LogAnalyzerEntryType, string> = {
  [LogAnalyzerEntryType.JoinPu]:
    "<2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]",
  [LogAnalyzerEntryType.OwnDeath]:
    "<2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'Testpilot' [123] ejected from zone 'RSI_Zeus_CL_1' [456] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]",
  [LogAnalyzerEntryType.BlueprintReceivedNotification]:
    '<2026-05-14T14:45:40.207Z> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.ContractAcceptedNotification]:
    '<2026-05-25T07:45:33.982Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted:  Wikelo Arrive to System: " [4] to queue. New queue size: 1, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.ContractCompleteNotification]:
    '<2026-06-01T10:15:20.123Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Complete:  Wikelo Arrive to System: " [5] to queue. New queue size: 2, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.ContractFailedNotification]:
    '<2026-05-25T18:03:03.012Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Failed: CRITICAL REFUEL REQUEST: Crusader Ares Star Fighter Ion <EM4>[200 Rep] [BP]*</EM4>: " [189] to queue. New queue size: 2, MissionId: [c54aa278-06e1-4c83-86d2-9e795f7691f3], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.ContractSharedNotification]:
    '<2026-05-21T18:32:20.325Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Shared: Tactical Strike Group Needed <EM4>[300 Rep] [BP]</EM4>: " [109] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.ContractWithdrawnNotification]:
    '<2026-05-21T19:02:11.481Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Withdrawn:  A Call to Arms: " [231] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.Disconnection]:
    '<2026-05-25T08:40:17.864Z> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=1.2.3.4:64090 localAddr=0.0.0.0:64090 connection={4, 0} session=abc node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="Testpilot" playerGEID=200123456789 uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]',
  [LogAnalyzerEntryType.InjuryDetectedNotification]:
    '<2026-08-27T10:22:35.005Z> [Notice] <SHUDEvent_OnNotification> Added notification "Minor Injury Detected - Left arm - Tier 3 Treatment Required : " [20] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.MedBedHeal]:
    "<2026-08-27T11:08:44.651Z> [Notice] <MED BED HEAL> Actor: Testpilot (Non-Authoritative CLIENT: Testpilot) | [CEntityComponentMedBed::HandleComponentEvent:1101] | -> Perform surgery event Success, med bed name: Bed_Single_Medical_Instance_Hospital_SOO003, vehicle name: none, head: true torso: false leftArm: true rightArm: false leftLeg: false rightLeg: false [Team_ActorFeatures][Actor]",
  [LogAnalyzerEntryType.ShopPurchase]:
    "<2026-08-26T19:26:18.919Z> [Notice] <CEntityComponentShopUIProvider::SendShopBuyRequest> Sending SShopBuyRequest - playerId[200123456789] shopId[783648035105] shopName[SCShop_Orison_KelTo] kioskId[783648035110] client_price[18117.000000] itemClassGUID[90adb28a-049e-4357-8000-a4bb75bb7f6f] itemName[behr_smg_ballistic_01_mag] quantity[61]  [Team_CoreGameplayFeatures][Shops][UI]",
  [LogAnalyzerEntryType.ArmisticeZoneNotification]:
    '<2026-08-26T18:59:25.029Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Armistice Zone - Combat Prohibited: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.JurisdictionNotification]:
    '<2026-08-26T18:50:32.801Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entered Crusader Industries Jurisdiction: " [1] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.MonitoredSpaceNotification]:
    '<2026-08-27T10:07:25.302Z> [Notice] <SHUDEvent_OnNotification> Added notification "Exited Monitored Space: " [15] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PrivatePropertyNotification]:
    '<2026-08-26T19:06:02.117Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Private Property: " [4] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PartyInviteReceivedNotification]:
    '<2026-08-26T18:50:40.373Z> [Notice] <SHUDEvent_OnNotification> Added notification "Testinviter\r\n<2026-08-26T18:50:40.373Z> Party Invite Received: Accept Invitation?: " [2] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PartyMemberJoinedNotification]:
    '<2026-05-25T16:49:39.043Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Member Joined\r\n<2026-05-25T16:49:39.043Z> Testmember has joined the party.: " [4] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PartyMemberLeftNotification]:
    '<2026-05-25T18:36:38.835Z> [Notice] <SHUDEvent_OnNotification> Added notification "Member Left\r\n<2026-05-25T18:36:38.835Z> Testmember has left the party.: " [285] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PartyLeaderChangedNotification]:
    '<2026-05-25T18:39:22.607Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Party Leader\r\n<2026-05-25T18:39:22.607Z> Testleader is now party leader.: " [311] to queue. New queue size: 10, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.InstanceEntered]:
    "<2026-08-27T10:05:56.047Z> [Notice] <[Instancing] Player entered instance> [Instancing][CEntityComponentBrokeredInstance::OnPlayerEnterInstance] Player Testpilot[200123456789] entered instance StreamingSOC_inst_dogleg_ht_a_siege_a[788400312747], which is NOT authoritative [Team_CGP5][Code][Instancing]",
  [LogAnalyzerEntryType.InstanceExited]:
    "<2026-08-27T10:08:16.735Z> [Notice] <[Instancing] Player exited instance> [Instancing][CEntityComponentBrokeredInstance::OnPlayerExitInstance] Player Testpilot[200123456789] left instance StreamingSOC_inst_dogleg_ht_a_siege_a[788400312747], which is NOT authoritative [Team_CGP5][Code][Instancing]",
  [LogAnalyzerEntryType.GameQuit]:
    "<2026-08-27T12:22:53.922Z> [Notice] <SystemQuit> CSystem::Quit invoked with - cause=30016, reason=Quit via console command, exitCode=0, thread id=2188, main thread id=2188 [Team_Unknown][System]",
  [LogAnalyzerEntryType.GameCrash]:
    "Exception STATUS_CRYENGINE_OUT_OF_SYSMEM(0x2BADFF61) addr=0x00007FFE2CE13CFA digest=114a1cfe538433f07c4a87c536ae0528",
  [LogAnalyzerEntryType.CrimeCommittedNotification]:
    '<2026-02-21T18:56:55.794Z> [Notice] <SHUDEvent_OnNotification> Added notification "Crime Committed: Destruction of Vehicle\r\n<2026-02-21T18:56:55.795Z> against Testvictim: " [387] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.CrimeAgainstYouNotification]:
    "<2026-02-21T16:13:57.594Z> [Notice] <SHUDEvent_OnNotification> Added notification \"Testattacker committed Negligent Homicide against you\r\n<2026-02-21T16:13:57.594Z> Press 'Accept' to report or the crime will be forgiven: \" [60] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]",
  [LogAnalyzerEntryType.CrimeStatIncreasedNotification]:
    '<2026-02-21T18:56:55.824Z> [Notice] <SHUDEvent_OnNotification> Added notification "CrimeStat Rating Increased: " [389] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.FineNotification]:
    '<2026-02-21T21:55:41.872Z> [Notice] <SHUDEvent_OnNotification> Added notification "Fined 80000 UEC: " [4] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.ContractAbandoned]:
    "<2026-10-11T09:41:55.199Z> [Notice] <EndMission> Ending mission for player. MissionId[bf7d2465-cf1e-480b-ae5c-25040d716e5f] Player[Testpilot] PlayerId[200123456789] CompletionType[Abandon] Reason[Player left] [Team_CoreGameplayFeatures][Missions]",
  [LogAnalyzerEntryType.ContractNotAcceptedNotification]:
    '<2026-10-11T08:39:26.063Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Not Accepted: Contract Limit Exceeded: " [207] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.RewardNotification]:
    '<2026-02-06T18:16:51.430Z> [Notice] <SHUDEvent_OnNotification> Added notification "Alliance Aid Defense Rewards - Tier 1\r\n<2026-02-06T18:16:51.430Z> You have been awarded: Silverton Jacket AA Defense: " [177] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.EarnedNotification]:
    "<2026-05-14T15:35:00.920Z> [Notice] <SHUDEvent_OnNotification> Added notification \"You've Earned: MG Scrip\r\n<2026-05-14T15:35:00.920Z> Access It at Your Primary Residence's Inventory",
  [LogAnalyzerEntryType.FundsAwardedNotification]:
    '<2026-02-21T16:27:29.082Z> [Notice] <SHUDEvent_OnNotification> Added notification "Awarded 500 aUEC: " [81] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.RestrictedAreaNotification]:
    '<2026-02-06T17:56:09.370Z> [Notice] <SHUDEvent_OnNotification> Added notification "Restricted Area - Vehicles Will Be Impounded: " [53] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.MonitoredSpaceStatusNotification]:
    '<2026-02-21T19:17:50.107Z> [Notice] <SHUDEvent_OnNotification> Added notification "Monitored Space Down: " [430] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.ErrorPopup]:
    "<2026-02-21T21:53:30.185Z> [Notice] <Error Popup Opened> errorCode=30028 [Team_UI][Disconnection]",
  [LogAnalyzerEntryType.ShipClaimFailed]:
    "<2026-10-30T10:22:41.350Z> [Error] <Claim Failed> Claim failed with error: FAILED_PRECONDITION(9): 'Claim vehicle failed: ItemOnCooldown' [Team_GameServices][ASOP][Entitlement][Insurance]",
  [LogAnalyzerEntryType.ShopRental]:
    "<2026-05-18T14:13:50.508Z> [Notice] <CEntityComponentShoppingProvider::SendRentalRequest> Sending SShopRentalRequest - playerId[200123456789] shopId[783648035105] shopName[SCShop_FW_Rentals] kioskId[783648035110] client_price[0.000000] itemClassGUID[40a1f83b-3623-49e6-8168-ab8223998aa2] itemName[RSI_Perseus] offering[0] currencyType[UEC] [Team_CoreGameplayFeatures][Shops][UI]",
  [LogAnalyzerEntryType.CommodityPurchase]:
    "<2026-05-19T16:31:05.430Z> [Notice] <CEntityComponentCommodityUIProvider::SendCommodityBuyRequest> Sending SShopCommodityBuyRequest - playerId[200123456789] shopId[783648035105] shopName[SCShop_Pyro_RestStop_Rund_Admin] kioskId[783648035110] price[46284.000000] shopPricePerCentiSCU[28.927500] resourceGUID[a789f57a-e12b-4bcd-8132-e0c03d84fc89] autoLoading[1] quantity[1600.000000 cSCU] Cargo Box Data: boxSize[8.000000] | unitAmount[2] [Team_CoreGameplayFeatures][Shops][UI]",
  [LogAnalyzerEntryType.PartyJoinedNotification]:
    '<2026-02-06T17:16:15.996Z> [Notice] <SHUDEvent_OnNotification> Added notification "You have joined\r\n<2026-02-06T17:16:15.996Z> party: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PartyCreatedNotification]:
    '<2026-03-28T12:00:15.996Z> [Notice] <SHUDEvent_OnNotification> Added notification "You have created\r\n<2026-03-28T12:00:15.996Z> party: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PartyLeftNotification]:
    '<2026-02-06T21:23:47.327Z> [Notice] <SHUDEvent_OnNotification> Added notification "You have left the party.\r\n<2026-02-06T21:23:47.327Z> : " [12] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PartyKickedNotification]:
    '<2026-03-28T12:11:56.502Z> [Notice] <SHUDEvent_OnNotification> Added notification "You have been kicked from the party.\r\n<2026-03-28T12:11:56.503Z> : " [74] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.PartyDisbandedNotification]:
    '<2026-03-28T12:59:29.129Z> [Notice] <SHUDEvent_OnNotification> Added notification "Party Disbanded\r\n<2026-03-28T12:59:29.130Z> The party has been disbanded.: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
  [LogAnalyzerEntryType.FriendAddedNotification]:
    '<2026-02-06T17:57:09.982Z> [Notice] <SHUDEvent_OnNotification> Added notification "Friend Added\r\n<2026-02-06T17:57:09.982Z> Testfriend: " [59] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]',
};

/** The end of a log file of a session which crashed, as the game writes it. */
export const SAMPLE_CRASH_FILE_END = [
  "<2026-09-01T16:15:11.246Z> [Notice] <StatObjLoad 0x800 Format> 'data/objectcontainers/pu/loc/mod/pyro/station/ser/reststop_comms/physicsgrid_objectcontainerpivot.cgf' - File exists [Team_Unknown][Unknown]",
  "",
  "Process Memory Status: 11507MB working set size, 19855MB commit size (19860MB peak), 8MB left to commit",
  "",
  "Cloud Imperium Games public crash handler taking over...",
  "Details for StarCitizen.exe (md5=cbeee95d79239ff9c8b1bbf9f37f1145)...",
  SAMPLE_LINES[LogAnalyzerEntryType.GameCrash],
  "Is fatal error: No",
  "Is out of system memory: Yes",
].join("\r\n");
