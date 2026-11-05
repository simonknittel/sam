/**
 * The patterns of the Log Analyzer. The client parser (a browser worker)
 * and the upload validation of the server use the same expressions, thus
 * this file imports nothing from Node.js.
 */

/**
 * A new log pattern needs a value here and an entry in
 * `LOG_ANALYZER_ENTRY_PATTERNS` below, and its title, icon and category in
 * `PATTERNS` of the app. Nothing else: the database keeps the value of this
 * enum verbatim, thus a new type needs no migration.
 */
export enum LogAnalyzerEntryType {
  JoinPu = "joinPu",
  OwnDeath = "ownDeath",
  BlueprintReceivedNotification = "blueprintReceivedNotification",
  ContractAcceptedNotification = "contractAcceptedNotification",
  ContractCompleteNotification = "contractCompleteNotification",
  ContractFailedNotification = "contractFailedNotification",
  ContractSharedNotification = "contractSharedNotification",
  ContractWithdrawnNotification = "contractWithdrawnNotification",
  Disconnection = "disconnection",
  InjuryDetectedNotification = "injuryDetectedNotification",
  MedBedHeal = "medBedHeal",
  ShopPurchase = "shopPurchase",
  ArmisticeZoneNotification = "armisticeZoneNotification",
  JurisdictionNotification = "jurisdictionNotification",
  MonitoredSpaceNotification = "monitoredSpaceNotification",
  PrivatePropertyNotification = "privatePropertyNotification",
  PartyInviteReceivedNotification = "partyInviteReceivedNotification",
  PartyMemberJoinedNotification = "partyMemberJoinedNotification",
  PartyMemberLeftNotification = "partyMemberLeftNotification",
  PartyLeaderChangedNotification = "partyLeaderChangedNotification",
  InstanceEntered = "instanceEntered",
  InstanceExited = "instanceExited",
  GameQuit = "gameQuit",
  GameCrash = "gameCrash",
  CrimeCommittedNotification = "crimeCommittedNotification",
  CrimeAgainstYouNotification = "crimeAgainstYouNotification",
  CrimeStatIncreasedNotification = "crimeStatIncreasedNotification",
  FineNotification = "fineNotification",
  ContractAbandoned = "contractAbandoned",
  ContractNotAcceptedNotification = "contractNotAcceptedNotification",
  RewardNotification = "rewardNotification",
  EarnedNotification = "earnedNotification",
  FundsAwardedNotification = "fundsAwardedNotification",
  RestrictedAreaNotification = "restrictedAreaNotification",
  MonitoredSpaceStatusNotification = "monitoredSpaceStatusNotification",
  ErrorPopup = "errorPopup",
  ShipClaimFailed = "shipClaimFailed",
  ShopRental = "shopRental",
  CommodityPurchase = "commodityPurchase",
  PartyJoinedNotification = "partyJoinedNotification",
  PartyCreatedNotification = "partyCreatedNotification",
  PartyLeftNotification = "partyLeftNotification",
  PartyKickedNotification = "partyKickedNotification",
  PartyDisbandedNotification = "partyDisbandedNotification",
  FriendAddedNotification = "friendAddedNotification",
}

interface LogAnalyzerEntryPattern {
  /**
   * Fixed text in the first line of each match. The reader of the app finds
   * the lines with this text and runs `regex` only on them, thus a new
   * pattern with a marker of an existing pattern costs no additional scan of
   * the text. A wrong marker removes all matches of the type.
   */
  readonly marker: string;
  /**
   * The expression carries the global and the multiline flag, so that it can
   * scan a whole log file. It has an `isoDate` group, which gives the time of
   * the event, unless `takesTimeOfPrecedingLine` is set.
   *
   * A match spans two lines at most, because a read of a file which grew
   * starts one line before the new lines (see `createLogFileReader` in the
   * app).
   *
   * The server runs the expression on the raw lines that a client sends,
   * thus it must not backtrack without a limit. A gap up to the tag of the
   * line is `[^<]*`. A gap up to a later marker is a tempered token
   * (`(?:(?!marker).)*marker`): it stops at the first marker, thus the engine
   * does not try each combination of the positions of two gaps.
   */
  readonly regex: RegExp;
  /**
   * The game writes some blocks without a timestamp, for example the crash
   * report. The parser then takes the time of the last timestamped line
   * before the match, and the upload sends that time along, because the
   * server cannot read it from the raw line.
   */
  readonly takesTimeOfPrecedingLine?: true;
}

/** The tag of all notifications which the game shows on the screen */
const NOTIFICATION_MARKER = "<SHUDEvent_OnNotification>";

export const LOG_ANALYZER_ENTRY_PATTERNS: Record<
  LogAnalyzerEntryType,
  LogAnalyzerEntryPattern
> = {
  [LogAnalyzerEntryType.JoinPu]: {
    marker: "<Join PU>",
    // <2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]+<Join PU>(?:(?!shard\[).)+shard\[(?<shard>[\d\w_]+)\].+$/gm,
  },

  [LogAnalyzerEntryType.OwnDeath]: {
    marker: "<[ActorState] Dead>",
    /**
     * The game writes this line only for a death inside a vehicle which was
     * destroyed with a detached interior. A death on foot leaves no line.
     */
    // <2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor '...' [...] ejected from zone 'RSI_Zeus_CL_...' [...] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<\[ActorState\] Dead>(?:(?!ejected from zone ').)*ejected from zone '(?<vehicle>[^']+)' \[\d+\] to zone '(?<zone>[^']+)'.*$/gm,
  },

  [LogAnalyzerEntryType.BlueprintReceivedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-05-14T14:45:40.207Z> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    // <2026-05-25T17:28:05.820Z> [Notice] <SHUDEvent_OnNotification> Added notification "<EM4>Received Blueprint: Arbor MH1 Mining Laser [BP]</EM4>: " [15] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?:(?!Received Blueprint: ).)*Received Blueprint: (?<blueprint>.+): ".*$/gm,
  },

  [LogAnalyzerEntryType.ContractAcceptedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-05-25T07:45:33.982Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted:  Wikelo Arrive to System: " [4] to queue. New queue size: 1, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?:(?!Contract Accepted: ).)*Contract Accepted: (?<contract>.+): "(?:(?:(?!MissionId: \[).)*MissionId: \[(?<missionId>[0-9a-f-]+)\])?.*$/gm,
  },

  [LogAnalyzerEntryType.ContractCompleteNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-06-01T10:15:20.123Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Complete:  Wikelo Arrive to System: " [5] to queue. New queue size: 2, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?:(?!Contract Complete: ).)*Contract Complete: (?<contract>.+): ".*$/gm,
  },

  [LogAnalyzerEntryType.ContractFailedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-05-25T18:03:03.012Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Failed: CRITICAL REFUEL REQUEST: Crusader Ares Star Fighter Ion <EM4>[200 Rep] [BP]*</EM4>: " [189] to queue. New queue size: 2, MissionId: [c54aa278-06e1-4c83-86d2-9e795f7691f3], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?:(?!Contract Failed: ).)*Contract Failed: (?<contract>.+): ".*$/gm,
  },

  [LogAnalyzerEntryType.ContractSharedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-05-21T18:32:20.325Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Shared: Tactical Strike Group Needed <EM4>[300 Rep] [BP]</EM4>: " [109] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?:(?!Contract Shared: ).)*Contract Shared: (?<contract>.+): ".*$/gm,
  },

  [LogAnalyzerEntryType.ContractWithdrawnNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-05-21T19:02:11.481Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Withdrawn:  A Call to Arms: " [231] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?:(?!Contract Withdrawn: ).)*Contract Withdrawn: (?<contract>.+): ".*$/gm,
  },

  [LogAnalyzerEntryType.Disconnection]: {
    marker: "<Channel Disconnected>",
    /**
     * The other reason the game writes is "Nub destroyed", an internal
     * teardown on every server change, which is no event of the player.
     */
    // <2026-05-25T08:40:17.864Z> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=... localAddr=0.0.0.0:64090 connection={4, 0} session=... node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="..." playerGEID=... uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]
    // <2026-08-27T12:22:18.548Z> [Notice] <Channel Disconnected> cause=30016 reason="DisconnectCmd: disconnect light ExitToMenu" frame=514507 isRemote=0 viewState=eCVS_InGame map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=... localAddr=0.0.0.0:64090 connection={3, 0} session=... node_id=f948a738-a221-5666-983e-234f5e500ebd nickname="..." playerGEID=... uptime_secs=9010.198242 [Team_Network][Network][Gateway][Disconnection]
    // <2026-05-21T08:14:17.230Z> [Notice] <Channel Disconnected> cause=30028 reason="Remote Disconnect - player inactive" frame=544285 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=... localAddr=0.0.0.0:64090 connection={3, 0} session=... node_id=cc47831e-36ce-e906-8355-3bba619e5182 nickname="..." playerGEID=... uptime_secs=6326.005371 [Team_Network][Network][Gateway][Disconnection]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)> \[Notice\] \<Channel Disconnected\> cause=\d+ reason="(?<reason>Remote Disconnect - Player requested disconnect|DisconnectCmd: disconnect light ExitToMenu|Remote Disconnect - player inactive)".*uptime_secs=(?<uptimeSeconds>[\d.]+).*$/gm,
  },

  [LogAnalyzerEntryType.InjuryDetectedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-08-27T10:22:35.005Z> [Notice] <SHUDEvent_OnNotification> Added notification "Minor Injury Detected - Left arm - Tier 3 Treatment Required : " [20] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?<severity>\w+) Injury Detected - (?<bodyPart>[^-]+) - Tier (?<tier>\d+) Treatment Required ?: ".*$/gm,
  },

  [LogAnalyzerEntryType.MedBedHeal]: {
    marker: "<MED BED HEAL>",
    // <2026-08-27T11:08:44.651Z> [Notice] <MED BED HEAL> Actor: ... (Non-Authoritative CLIENT: ...) | [CEntityComponentMedBed::HandleComponentEvent:1101] | -> Perform surgery event Success, med bed name: Bed_Single_Medical_Instance_Hospital_SOO003, vehicle name: none, head: true torso: false leftArm: true rightArm: false leftLeg: false rightLeg: false [Team_ActorFeatures][Actor]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<MED BED HEAL>(?:(?!-> Perform surgery event ).)*-> Perform surgery event (?<result>\w+), med bed name: (?<medBed>[^,]+), vehicle name: (?<vehicle>[^,]+), head: (?<head>\w+) torso: (?<torso>\w+) leftArm: (?<leftArm>\w+) rightArm: (?<rightArm>\w+) leftLeg: (?<leftLeg>\w+) rightLeg: (?<rightLeg>\w+).*$/gm,
  },

  [LogAnalyzerEntryType.ShopPurchase]: {
    /** A ship from a kiosk has the same line under a different tag */
    marker: "Sending SShopBuyRequest",
    /**
     * The line is the request of the client. The answer of the server,
     * `<CEntityComponentShopUIProvider::RmShopFlowResponse>`, names neither
     * the item nor the price, thus the request is the entry.
     */
    // <2026-08-26T19:26:18.919Z> [Notice] <CEntityComponentShopUIProvider::SendShopBuyRequest> Sending SShopBuyRequest - playerId[...] shopId[783648035105] shopName[SCShop_Orison_KelTo] kioskId[783648035110] client_price[18117.000000] itemClassGUID[90adb28a-049e-4357-8000-a4bb75bb7f6f] itemName[behr_smg_ballistic_01_mag] quantity[61]  [Team_CoreGameplayFeatures][Shops][UI]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<(?:CEntityComponentShopUIProvider::SendShopBuyRequest|CEntityComponentShoppingProvider::SendStandardItemBuyRequest)>(?:(?!shopName\[).)*shopName\[(?<shop>[^\]]+)\](?:(?!client_price\[).)*client_price\[(?<price>[\d.]+)\](?:(?!itemName\[).)*itemName\[(?<item>[^\]]+)\] quantity\[(?<quantity>\d+)\].*$/gm,
  },

  [LogAnalyzerEntryType.ArmisticeZoneNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-08-26T18:59:25.029Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Armistice Zone - Combat Prohibited: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    // <2026-08-26T19:34:51.380Z> [Notice] <SHUDEvent_OnNotification> Added notification "Leaving Armistice Zone - Caution Advised: " [6] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?<direction>Entering|Leaving) Armistice Zone[^"]*".*$/gm,
  },

  [LogAnalyzerEntryType.JurisdictionNotification]: {
    marker: NOTIFICATION_MARKER,
    /** The game writes no line for leaving a jurisdiction */
    // <2026-08-26T18:50:32.801Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entered Crusader Industries Jurisdiction: " [1] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Entered (?<jurisdiction>.+) Jurisdiction: ".*$/gm,
  },

  [LogAnalyzerEntryType.MonitoredSpaceNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-08-27T10:07:25.302Z> [Notice] <SHUDEvent_OnNotification> Added notification "Exited Monitored Space: " [15] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?<direction>Entered|Exited) Monitored Space: ".*$/gm,
  },

  [LogAnalyzerEntryType.PrivatePropertyNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-08-26T19:06:02.117Z> [Notice] <SHUDEvent_OnNotification> Added notification "Entering Private Property: " [4] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?<direction>Entering|Leaving) Private Property: ".*$/gm,
  },

  /**
   * The party notifications span two log lines: the headline of the
   * notification, then its text with the handle. The game writes the files
   * with CRLF line ends.
   */
  [LogAnalyzerEntryType.PartyInviteReceivedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-08-26T18:50:40.373Z> [Notice] <SHUDEvent_OnNotification> Added notification "SomeHandle
    // <2026-08-26T18:50:40.373Z> Party Invite Received: Accept Invitation?: " [2] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?<handle>[^"\r\n]+)\r?\n<[\d\-T:.Z]+> Party Invite Received: Accept Invitation\?: ".*$/gm,
  },

  [LogAnalyzerEntryType.PartyMemberJoinedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-05-25T16:49:39.043Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Member Joined
    // <2026-05-25T16:49:39.043Z> SomeHandle has joined the party.: " [4] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "New Member Joined\r?\n<[\d\-T:.Z]+> (?<handle>.+?) has joined the party\.: ".*$/gm,
  },

  [LogAnalyzerEntryType.PartyMemberLeftNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-05-25T18:36:38.835Z> [Notice] <SHUDEvent_OnNotification> Added notification "Member Left
    // <2026-05-25T18:36:38.835Z> SomeHandle has left the party.: " [285] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Member Left\r?\n<[\d\-T:.Z]+> (?<handle>.+?) has left the party\.: ".*$/gm,
  },

  [LogAnalyzerEntryType.PartyLeaderChangedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-05-25T18:39:22.607Z> [Notice] <SHUDEvent_OnNotification> Added notification "New Party Leader
    // <2026-05-25T18:39:22.607Z> SomeHandle is now party leader.: " [311] to queue. New queue size: 10, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "New Party Leader\r?\n<[\d\-T:.Z]+> (?<handle>.+?) is now party leader\.: ".*$/gm,
  },

  [LogAnalyzerEntryType.InstanceEntered]: {
    marker: "<[Instancing] Player entered instance>",
    // <2026-08-27T10:05:56.047Z> [Notice] <[Instancing] Player entered instance> [Instancing][CEntityComponentBrokeredInstance::OnPlayerEnterInstance] Player SomeHandle[...] entered instance StreamingSOC_inst_dogleg_ht_a_siege_a[788400312747], which is NOT authoritative [Team_CGP5][Code][Instancing]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<\[Instancing\] Player entered instance> (?:(?!Player ).)*Player (?<handle>.+?)\[\d+\] entered instance (?<instance>[^\[]+)\[(?<instanceId>\d+)\].*$/gm,
  },

  [LogAnalyzerEntryType.InstanceExited]: {
    marker: "<[Instancing] Player exited instance>",
    // <2026-08-27T10:08:16.735Z> [Notice] <[Instancing] Player exited instance> [Instancing][CEntityComponentBrokeredInstance::OnPlayerExitInstance] Player SomeHandle[...] left instance StreamingSOC_inst_dogleg_ht_a_siege_a[788400312747], which is NOT authoritative [Team_CGP5][Code][Instancing]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<\[Instancing\] Player exited instance> (?:(?!Player ).)*Player (?<handle>.+?)\[\d+\] left instance (?<instance>[^\[]+)\[(?<instanceId>\d+)\].*$/gm,
  },

  [LogAnalyzerEntryType.GameQuit]: {
    marker: "<SystemQuit>",
    /** A session which crashed has no such line, see `gameCrash` */
    // <2026-08-27T12:22:53.922Z> [Notice] <SystemQuit> CSystem::Quit invoked with - cause=30016, reason=Quit via console command, exitCode=0, thread id=2188, main thread id=2188 [Team_Unknown][System]
    regex: /^<(?<isoDate>[\d\-T:.Z]+)> \[Notice\] \<SystemQuit\>.*$/gm,
  },

  [LogAnalyzerEntryType.GameCrash]: {
    marker: "Exception STATUS_",
    /**
     * The crash report at the end of a log file carries no timestamps. The
     * exception line names the kind of the crash.
     */
    // Cloud Imperium Games public crash handler taking over...
    // ...
    // Exception STATUS_CRYENGINE_OUT_OF_SYSMEM(0x2BADFF61) addr=0x00007FFE2CE13CFA digest=114a1cfe538433f07c4a87c536ae0528
    regex: /^Exception (?<exception>STATUS_\w+)\(0x[0-9A-Fa-f]+\).*$/gm,
    takesTimeOfPrecedingLine: true,
  },

  [LogAnalyzerEntryType.CrimeCommittedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-21T18:56:55.794Z> [Notice] <SHUDEvent_OnNotification> Added notification "Crime Committed: Destruction of Vehicle
    // <2026-02-21T18:56:55.795Z> against SomeHandle: " [387] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Crime Committed: (?<crime>[^"\r\n]+)\r?\n<[\d\-T:.Z]+> against (?<handle>[^:"\r\n]+): ".*$/gm,
  },

  [LogAnalyzerEntryType.CrimeAgainstYouNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-21T16:13:57.594Z> [Notice] <SHUDEvent_OnNotification> Added notification "SomeHandle committed Destruction of Vehicle against you
    // <2026-02-21T16:13:57.594Z> Press 'Accept' to report or the crime will be forgiven: " [60] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?<handle>[^ "\r\n]+) committed (?<crime>[^"\r\n]+) against you\r?\n<[\d\-T:.Z]+> Press '[^'\r\n]+' to report[^"\r\n]*: ".*$/gm,
  },

  [LogAnalyzerEntryType.CrimeStatIncreasedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-21T18:56:55.824Z> [Notice] <SHUDEvent_OnNotification> Added notification "CrimeStat Rating Increased: " [389] to queue. New queue size: 4, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "CrimeStat Rating Increased: ".*$/gm,
  },

  [LogAnalyzerEntryType.FineNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-21T21:55:41.872Z> [Notice] <SHUDEvent_OnNotification> Added notification "Fined 80000 UEC: " [4] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Fined (?<amount>\d+) UEC: ".*$/gm,
  },

  [LogAnalyzerEntryType.ContractAbandoned]: {
    /**
     * The line names only the mission. The accepted contract with the same
     * mission id gives the name, see `contractAcceptedNotification`.
     */
    marker: "<EndMission>",
    // <2026-10-11T09:41:55.199Z> [Notice] <EndMission> Ending mission for player. MissionId[af2bbdcc-2afb-4b51-91cb-04e2b6df725c] Player[...] PlayerId[...] CompletionType[Abandon] Reason[Player left] [Team_CoreGameplayFeatures][Missions]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<EndMission>(?:(?!MissionId\[).)*MissionId\[(?<missionId>[0-9a-f-]+)\](?:(?!CompletionType\[).)*CompletionType\[Abandon\].*$/gm,
  },

  [LogAnalyzerEntryType.ContractNotAcceptedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-10-11T08:39:26.063Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Not Accepted: Contract Limit Exceeded: " [207] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Contract Not Accepted: (?<reason>[^"\r\n]+): ".*$/gm,
  },

  [LogAnalyzerEntryType.RewardNotification]: {
    marker: NOTIFICATION_MARKER,
    /**
     * An item name can hold quotes, for example `S-38 "SecondWind" Pistol`.
     * After a long list of items the game writes the end of the notification
     * on a third line, which a match does not need.
     */
    // <2026-02-06T18:16:51.430Z> [Notice] <SHUDEvent_OnNotification> Added notification "Alliance Aid Defense Rewards - Tier 1
    // <2026-02-06T18:16:51.430Z> You have been awarded: Silverton Jacket AA Defense: " [177] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?<reward>[^"\r\n]+ (?:Rewards - Tier \d+|Tier \d+ Reward))\r?\n<[\d\-T:.Z]+> You(?: have|'ve) been awarded: (?<items>(?:(?!: ").)+)(?:: ".*)?$/gm,
  },

  [LogAnalyzerEntryType.EarnedNotification]: {
    marker: NOTIFICATION_MARKER,
    /** The game writes a third line, which a match does not need */
    // <2026-05-14T15:35:00.920Z> [Notice] <SHUDEvent_OnNotification> Added notification "You've Earned: MG Scrip
    // <2026-05-14T15:35:00.920Z> Access It at Your Primary Residence's Inventory
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "You've Earned: (?<reward>[^"\r\n]+)\r?\n<[\d\-T:.Z]+> Access (?:It|Them) at [^"\r\n]*$/gm,
  },

  [LogAnalyzerEntryType.FundsAwardedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-21T16:27:29.082Z> [Notice] <SHUDEvent_OnNotification> Added notification "Awarded 500 aUEC: " [81] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Awarded (?<amount>\d+) aUEC: ".*$/gm,
  },

  [LogAnalyzerEntryType.RestrictedAreaNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-06T17:56:09.370Z> [Notice] <SHUDEvent_OnNotification> Added notification "Restricted Area - Vehicles Will Be Impounded: " [53] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    // <2026-02-06T18:01:12.100Z> [Notice] <SHUDEvent_OnNotification> Added notification "Leaving Restricted Area: " [54] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    // <2026-02-06T18:02:12.100Z> [Notice] <SHUDEvent_OnNotification> Added notification "Restricted Area
    // <2026-02-06T18:02:12.100Z> For your safety, you've been relocated.: " [55] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "(?<event>Restricted Area - Vehicles Will Be Impounded|Leaving Restricted Area|Restricted Area\r?\n<[\d\-T:.Z]+> For your safety, you've been relocated\.): ".*$/gm,
  },

  [LogAnalyzerEntryType.MonitoredSpaceStatusNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-21T19:17:50.107Z> [Notice] <SHUDEvent_OnNotification> Added notification "Monitored Space Down: " [430] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Monitored Space (?<status>Down|Restored): ".*$/gm,
  },

  [LogAnalyzerEntryType.ErrorPopup]: {
    marker: "<Error Popup Opened>",
    // <2026-02-21T21:53:30.185Z> [Notice] <Error Popup Opened> errorCode=30028 [Team_UI][Disconnection]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<Error Popup Opened> errorCode=(?<errorCode>\d+).*$/gm,
  },

  [LogAnalyzerEntryType.ShipClaimFailed]: {
    marker: "<Claim Failed>",
    // <2026-10-30T10:22:41.350Z> [Error] <Claim Failed> Claim failed with error: FAILED_PRECONDITION(9): 'Claim vehicle failed: ItemOnCooldown' [Team_GameServices][ASOP][Entitlement][Insurance]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<Claim Failed>(?:(?!Claim vehicle failed: ).)*Claim vehicle failed: (?<reason>[^'\r\n]+)'.*$/gm,
  },

  [LogAnalyzerEntryType.ShopRental]: {
    marker: "<CEntityComponentShoppingProvider::SendRentalRequest>",
    // <2026-05-18T14:13:50.508Z> [Notice] <CEntityComponentShoppingProvider::SendRentalRequest> Sending SShopRentalRequest - playerId[...] shopId[...] shopName[SCShop_FW_Rentals] kioskId[...] client_price[0.000000] itemClassGUID[40a1f83b-3623-49e6-8168-ab8223998aa2] itemName[RSI_Perseus] offering[0] currencyType[UEC]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<CEntityComponentShoppingProvider::SendRentalRequest>(?:(?!shopName\[).)*shopName\[(?<shop>[^\]]+)\](?:(?!client_price\[).)*client_price\[(?<price>[\d.]+)\](?:(?!itemName\[).)*itemName\[(?<item>[^\]]+)\].*$/gm,
  },

  [LogAnalyzerEntryType.CommodityPurchase]: {
    /** The line has only a GUID for the commodity, thus no entry can name it */
    marker: "<CEntityComponentCommodityUIProvider::SendCommodityBuyRequest>",
    // <2026-05-19T16:31:05.430Z> [Notice] <CEntityComponentCommodityUIProvider::SendCommodityBuyRequest> Sending SShopCommodityBuyRequest - playerId[...] shopId[...] shopName[SCShop_Pyro_RestStop_Rund_Admin] kioskId[...] price[46284.000000] shopPricePerCentiSCU[28.927500] resourceGUID[a789f57a-e12b-4bcd-8132-e0c03d84fc89] autoLoading[1] quantity[1600.000000 cSCU] Cargo Box Data: boxSize[8.000000] | unitAmount[2]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<CEntityComponentCommodityUIProvider::SendCommodityBuyRequest>(?:(?!shopName\[).)*shopName\[(?<shop>[^\]]+)\](?:(?! price\[).)* price\[(?<price>[\d.]+)\](?:(?!quantity\[).)*quantity\[(?<centiScu>[\d.]+) cSCU\].*$/gm,
  },

  [LogAnalyzerEntryType.PartyJoinedNotification]: {
    marker: NOTIFICATION_MARKER,
    /** The game also writes this headline for a group, which is no party */
    // <2026-02-06T17:16:15.996Z> [Notice] <SHUDEvent_OnNotification> Added notification "You have joined
    // <2026-02-06T17:16:15.996Z> party: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "You have joined\r?\n<[\d\-T:.Z]+> party: ".*$/gm,
  },

  [LogAnalyzerEntryType.PartyCreatedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-03-28T12:00:15.996Z> [Notice] <SHUDEvent_OnNotification> Added notification "You have created
    // <2026-03-28T12:00:15.996Z> party: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "You have created\r?\n<[\d\-T:.Z]+> party: ".*$/gm,
  },

  [LogAnalyzerEntryType.PartyLeftNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-06T21:23:47.327Z> [Notice] <SHUDEvent_OnNotification> Added notification "You have left the party.
    // <2026-02-06T21:23:47.327Z> : " [12] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "You have left the party\.\r?\n<[\d\-T:.Z]+> : ".*$/gm,
  },

  [LogAnalyzerEntryType.PartyKickedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-03-28T12:11:56.502Z> [Notice] <SHUDEvent_OnNotification> Added notification "You have been kicked from the party.
    // <2026-03-28T12:11:56.503Z> : " [74] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "You have been kicked from the party\.\r?\n<[\d\-T:.Z]+> : ".*$/gm,
  },

  [LogAnalyzerEntryType.PartyDisbandedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-03-28T12:59:29.129Z> [Notice] <SHUDEvent_OnNotification> Added notification "Party Disbanded
    // <2026-03-28T12:59:29.130Z> The party has been disbanded.: " [3] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Party Disbanded\r?\n<[\d\-T:.Z]+> The party has been disbanded\.: ".*$/gm,
  },

  [LogAnalyzerEntryType.FriendAddedNotification]: {
    marker: NOTIFICATION_MARKER,
    // <2026-02-06T17:57:09.982Z> [Notice] <SHUDEvent_OnNotification> Added notification "Friend Added
    // <2026-02-06T17:57:09.982Z> SomeHandle: " [59] to queue. New queue size: 1, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>[^<]*<SHUDEvent_OnNotification> Added notification "Friend Added\r?\n<[\d\-T:.Z]+> (?<handle>[^:"\r\n]+): ".*$/gm,
  },
};

/** See `LogAnalyzerEntryPattern.takesTimeOfPrecedingLine` */
export const takesTimeOfPrecedingLine = (type: LogAnalyzerEntryType) =>
  LOG_ANALYZER_ENTRY_PATTERNS[type].takesTimeOfPrecedingLine === true;

const ENTRY_TYPES_BY_VALUE = new Map<string, LogAnalyzerEntryType>(
  Object.values(LogAnalyzerEntryType).map((type) => [type, type]),
);

/**
 * Reads a type back which the database keeps as text. Returns undefined for a
 * value which no longer belongs to a pattern, thus a removed pattern leaves
 * its shared entries in place without breaking the table.
 */
export const toLogAnalyzerEntryType = (value: string) =>
  ENTRY_TYPES_BY_VALUE.get(value);

/**
 * The expressions of `LOG_ANALYZER_ENTRY_PATTERNS` without the global and
 * the multiline flag. Without the global flag, an expression has no
 * `lastIndex`, thus a single match never changes the state of a shared
 * expression. Without the multiline flag, `^` and `$` anchor the whole raw
 * line, thus the engine tries the match only at the start of the line.
 * Compiled once: `matchLogAnalyzerEntryLine` runs for each shared entry of a
 * response.
 */
const SINGLE_LINE_REGEXES = Object.fromEntries(
  Object.values(LogAnalyzerEntryType).map((type) => {
    const { regex } = LOG_ANALYZER_ENTRY_PATTERNS[type];
    return [
      type,
      new RegExp(regex.source, regex.flags.replaceAll(/[gm]/g, "")),
    ];
  }),
) as Record<LogAnalyzerEntryType, RegExp>;

/**
 * Matches one raw line against the pattern of the given type. Returns null
 * when the line is not of that type.
 */
export const matchLogAnalyzerEntryLine = (
  type: LogAnalyzerEntryType,
  rawLine: string,
) => SINGLE_LINE_REGEXES[type].exec(rawLine);

/**
 * The value of `LogAnalyzerEntry.hash`. Together with the uploading citizen
 * it stops the same line from being stored twice. No type holds a line break,
 * thus the first line break is always the separator and two different entries
 * cannot collide, even though a raw line can span two log lines.
 *
 * The Web Crypto API serves the server and the browser alike, so that the
 * client compares against the very hashes the server stores.
 */
export const createLogAnalyzerEntryHash = async (
  type: LogAnalyzerEntryType,
  rawLine: string,
) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${type}\n${rawLine}`),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

/** The shape of `createLogAnalyzerEntryHash`, for the input of the dedup query. */
export const LOG_ANALYZER_ENTRY_HASH_PATTERN = /^[0-9a-f]{64}$/;

/**
 * How many entries one upload request carries. The client splits a larger
 * backfill into more requests.
 */
export const MAXIMUM_LOG_ANALYZER_UPLOAD_ENTRIES = 100;

/**
 * About twice the longest known log line, which is a disconnection line of
 * about 500 characters. The limit also bounds the work of the patterns on a
 * line that a client sends.
 */
export const MAXIMUM_LOG_ANALYZER_RAW_LINE_LENGTH = 1_000;

/**
 * The longest rolling window the shared entries query accepts, well above the
 * 14 days the Log Analyzer reads by default. The client keeps its own
 * `daysToLoad` setting inside this limit. A date range uses its own query,
 * which has no such limit.
 */
export const MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD = 365;

/** The `daysToLoad` setting of the client, kept inside the accepted range. */
export const clampLogAnalyzerDaysToLoad = (daysToLoad: number) =>
  Math.min(Math.max(daysToLoad, 0), MAXIMUM_LOG_ANALYZER_DAYS_TO_LOAD);
