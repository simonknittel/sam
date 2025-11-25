import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { cornerstoneImageBrowserItemTypes } from "@/modules/cornerstone-image-browser/utils/config";
import { Command } from "cmdk";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { AiFillAppstore, AiOutlineForm } from "react-icons/ai";
import {
  FaCamera,
  FaHome,
  FaLock,
  FaPiggyBank,
  FaShoppingBasket,
  FaTools,
  FaUser,
} from "react-icons/fa";
import { FaCodePullRequest, FaScaleBalanced } from "react-icons/fa6";
import { IoIosHelpCircleOutline } from "react-icons/io";
import { IoDocuments } from "react-icons/io5";
import { MdEvent, MdTaskAlt, MdWorkspaces } from "react-icons/md";
import { RiLogoutCircleRLine, RiSpyFill } from "react-icons/ri";
import { TbMilitaryRank } from "react-icons/tb";
import { useCmdKContext } from "./CmdKContext";
import { CommandItem, LinkItem, PageItem } from "./Item";
import { SpynetSearchPage } from "./SpynetSearchPage";

export const List = () => {
  const authentication = useAuthentication();
  if (!authentication || !authentication.session.entity)
    throw new Error("Forbidden");

  const { setOpen, search, setSearch, pages, setPages } = useCmdKContext();

  const [
    citizenRead,
    organizationRead,
    orgFleetRead,
    shipManage,
    userRead,
    roleManage,
    taskRead,
    silcRead,
    profitDistributionCycleRead,
    penaltyEntryCreate,
    logAnalyzerRead,
    eventRead,
    careerSecurityRead,
    careerEconomicRead,
    careerManagementRead,
    careerTeamRead,
  ] = [
    authentication.authorize("citizen", "read"),
    authentication.authorize("organization", "read"),
    authentication.authorize("orgFleet", "read"),
    authentication.authorize("ship", "manage"),
    authentication.authorize("user", "read"),
    authentication.authorize("role", "manage"),
    authentication.authorize("task", "read"),
    authentication.authorize("silcBalanceOfOtherCitizen", "read"),
    authentication.authorize("profitDistributionCycle", "read"),
    authentication.authorize("penaltyEntry", "create"),
    authentication.authorize("logAnalyzer", "read"),
    authentication.authorize("event", "read"),
    authentication.authorize("career", "read", [
      {
        key: "flowId",
        value: "security",
      },
    ]),
    authentication.authorize("career", "read", [
      {
        key: "flowId",
        value: "economic",
      },
    ]),
    authentication.authorize("career", "read", [
      {
        key: "flowId",
        value: "management",
      },
    ]),
    authentication.authorize("career", "read", [
      {
        key: "flowId",
        value: "team",
      },
    ]),
  ];
  const careerRead =
    careerSecurityRead ||
    careerEconomicRead ||
    careerManagementRead ||
    careerTeamRead;
  const fleetRead = orgFleetRead || shipManage;
  const iamRead = userRead || roleManage;
  const spynetRead = citizenRead || organizationRead;

  const page = pages[pages.length - 1];

  return (
    <Command.List>
      {!page && (
        <>
          <CommandItem
            label="Abmelden"
            keywords={["Log out"]}
            icon={<RiLogoutCircleRLine />}
            onSelect={async () => {
              await signOut({
                callbackUrl: "/",
              });
            }}
          />

          <LinkItem
            label="Account"
            icon={<FaUser />}
            href="/app/account"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          <LinkItem
            label="Apps"
            icon={<AiFillAppstore />}
            href="/app/apps"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          <LinkItem
            label="Avatar Creator"
            icon={<FaCamera />}
            href="/app/avatar-creator"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          <LinkItem
            label="Changelog"
            keywords={["Changelog", "Updates"]}
            icon={<FaCodePullRequest />}
            href="/app/changelog"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          <PageItem
            label="Cornerstone Image Browser"
            icon={<FaTools />}
            setPages={() =>
              setPages((pages) => [...pages, "cornerstone-image-browser"])
            }
            setSearch={setSearch}
          />

          <LinkItem
            label="Dashboard"
            keywords={["Dashboard", "Startseite", "Homepage"]}
            icon={<FaHome />}
            href="/app"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          <LinkItem
            label="Dogfight Trainer"
            keywords={["Dogfight Trainer", "Asteroids"]}
            icon={<FaTools />}
            href="/app/dogfight-trainer"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          <LinkItem
            label="Dokumente"
            keywords={["Dokumente", "Documents", "Dateien"]}
            icon={<IoDocuments />}
            href="/app/documents"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          {eventRead && (
            <LinkItem
              label="Events"
              keywords={["Events", "Veranstaltungen"]}
              icon={<MdEvent />}
              href="/app/events"
              setOpen={setOpen}
              setSearch={setSearch}
            />
          )}

          {fleetRead && (
            <LinkItem
              label="Flotte"
              keywords={["Flotte", "Fleet", "Schiffe", "Ships", "Overview"]}
              icon={<MdWorkspaces />}
              href="/app/fleet"
              setOpen={setOpen}
              setSearch={setSearch}
            />
          )}

          {profitDistributionCycleRead && (
            <LinkItem
              label="SINcome"
              icon={<FaPiggyBank />}
              href="/app/sincome"
              setOpen={setOpen}
              setSearch={setSearch}
            />
          )}

          <LinkItem
            label="Hilfe"
            keywords={["Hilfe", "Help", "Support"]}
            icon={<IoIosHelpCircleOutline />}
            href="/app/help"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          {iamRead && (
            <PageItem
              label="IAM"
              icon={<FaLock />}
              setPages={() => setPages((pages) => [...pages, "iam"])}
              setSearch={setSearch}
            />
          )}

          {careerRead && (
            <LinkItem
              label="Karriere"
              keywords={["Karriere", "Career", "Laufbahn"]}
              icon={<TbMilitaryRank />}
              href="/app/career"
              setOpen={setOpen}
              setSearch={setSearch}
            />
          )}

          {logAnalyzerRead && (
            <LinkItem
              label="Log Analyzer"
              icon={<FaTools />}
              href="/app/tools/log-analyzer"
              setOpen={setOpen}
              setSearch={setSearch}
            />
          )}

          {silcRead && (
            <LinkItem
              label="SILC"
              icon={<FaPiggyBank />}
              href="/app/silc"
              setOpen={setOpen}
              setSearch={setSearch}
            />
          )}

          <LinkItem
            label="SILO-Anfrage"
            icon={<AiOutlineForm />}
            href="/app/external/silo-request"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          {spynetRead && (
            <PageItem
              label="Spynet"
              icon={<RiSpyFill />}
              setPages={() => setPages((pages) => [...pages, "spynet"])}
              setSearch={setSearch}
            />
          )}

          {penaltyEntryCreate && (
            <LinkItem
              label="Strafpunkte"
              keywords={["Strafpunkte", "Penalty Points"]}
              icon={<FaScaleBalanced />}
              href="/app/penalty-points"
              setOpen={setOpen}
              setSearch={setSearch}
            />
          )}

          <LinkItem
            label="Scrapper's Codex"
            keywords={["Schwarzmarkt-Ankauf"]}
            icon={<FaShoppingBasket />}
            href="/app/external/scrappers-codex"
            setOpen={setOpen}
            setSearch={setSearch}
          />

          {taskRead && (
            <LinkItem
              label="Tasks"
              keywords={["Tasks", "Aufgaben", "Quests"]}
              icon={<MdTaskAlt />}
              href="/app/tasks"
              setOpen={setOpen}
              setSearch={setSearch}
            />
          )}
        </>
      )}

      {page === "cornerstone-image-browser" && <CornerstoneImageBrowserPage />}

      {page === "iam" && (
        <IAMPage userRead={userRead} roleManage={roleManage} />
      )}

      {page === "spynet" && <SpynetPage />}

      {page === "spynet-search" && (
        <SpynetSearchPage
          search={search}
          onSelect={() => {
            setOpen(false);
            setSearch("");
            setPages([]);
          }}
        />
      )}
    </Command.List>
  );
};

export const CornerstoneImageBrowserPage = () => {
  const { setOpen, setSearch } = useCmdKContext();

  return (
    <Command.Group
      heading={
        <div className="flex items-baseline gap-2">
          Cornerstone Image Browser
        </div>
      }
    >
      {cornerstoneImageBrowserItemTypes.map((item) => (
        <LinkItem
          key={item.page}
          label={item.title}
          hideIconPlaceholder
          href={`/app/tools/cornerstone-image-browser/${item.page}`}
          setOpen={setOpen}
          setSearch={setSearch}
        />
      ))}
    </Command.Group>
  );
};

interface IAMPageProps {
  readonly userRead: boolean | Session;
  readonly roleManage: boolean | Session;
}

export const IAMPage = ({ userRead, roleManage }: IAMPageProps) => {
  const { setOpen, setSearch } = useCmdKContext();

  return (
    <Command.Group
      heading={<div className="flex items-baseline gap-2">IAM</div>}
    >
      {userRead && (
        <LinkItem
          label="Benutzer"
          keywords={["Users"]}
          icon={<FaLock />}
          href="/app/iam/users"
          setOpen={setOpen}
          setSearch={setSearch}
        />
      )}

      {roleManage && (
        <LinkItem
          label="Berechtigungsmatrix"
          keywords={["Berechtigungen", "Permissions"]}
          icon={<FaLock />}
          href="/app/iam/permission-matrix"
          setOpen={setOpen}
          setSearch={setSearch}
        />
      )}

      {roleManage && (
        <LinkItem
          label="Rollen"
          keywords={["Berechtigungen", "Permissions"]}
          icon={<FaLock />}
          href="/app/iam/roles"
          setOpen={setOpen}
          setSearch={setSearch}
        />
      )}
    </Command.Group>
  );
};

export const SpynetPage = () => {
  const { setOpen, setSearch, setPages, disableAlgolia } = useCmdKContext();

  const authentication = useAuthentication();

  return (
    <Command.Group
      heading={<div className="flex items-baseline gap-2">Spynet</div>}
    >
      {authentication && authentication.session.entity && (
        <LinkItem
          label="Mein Profil"
          icon={<RiSpyFill />}
          section="Spynet"
          href={`/app/spynet/citizen/${authentication.session.entity.id}`}
          setOpen={setOpen}
          setSearch={setSearch}
        />
      )}

      {!disableAlgolia && (
        <PageItem
          label="Profil suchen"
          icon={<RiSpyFill />}
          section="Spynet"
          setPages={() => setPages((pages) => [...pages, "spynet-search"])}
          setSearch={setSearch}
        />
      )}
    </Command.Group>
  );
};
