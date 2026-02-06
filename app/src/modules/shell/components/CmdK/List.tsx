import { externalApps } from "@/modules/apps/utils/externalApps";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { cornerstoneImageBrowserItemTypes } from "@/modules/cornerstone-image-browser/utils/config";
import { Command } from "cmdk";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { AiFillAppstore } from "react-icons/ai";
import {
  FaCamera,
  FaChartLine,
  FaHome,
  FaLock,
  FaPiggyBank,
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

enum MenuItemType {
  Link = "link",
  Page = "page",
  Command = "command",
}

interface BaseMenuItem {
  id: string;
  label: string;
  keywords?: string[];
  icon?: ReactElement;
  type: MenuItemType;
  authKey?: string;
}

interface LinkMenuItem extends BaseMenuItem {
  type: MenuItemType.Link;
  href: string;
}

interface PageMenuItem extends BaseMenuItem {
  type: MenuItemType.Page;
  page: string;
}

interface CommandMenuItem extends BaseMenuItem {
  type: MenuItemType.Command;
  onSelect: () => void | Promise<void>;
}

type MenuItem = LinkMenuItem | PageMenuItem | CommandMenuItem;

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
    globalStatisticsRead,
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
    authentication.authorize("globalStatistics", "read"),
  ];
  const careerRead =
    careerSecurityRead ||
    careerEconomicRead ||
    careerManagementRead ||
    careerTeamRead;
  const fleetRead = orgFleetRead || shipManage;
  const iamRead = userRead || roleManage;
  const spynetRead = citizenRead || organizationRead;

  const authMap: Record<string, boolean | Session> = {
    eventRead,
    fleetRead,
    profitDistributionCycleRead,
    iamRead,
    careerRead,
    logAnalyzerRead,
    silcRead,
    spynetRead,
    globalStatisticsRead,
    penaltyEntryCreate,
    taskRead,
  };

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        id: "logout",
        label: "Abmelden",
        keywords: ["Log out"],
        icon: <RiLogoutCircleRLine />,
        type: MenuItemType.Command,
        onSelect: async () => {
          await signOut({ callbackUrl: "/" });
        },
      },
      {
        id: "account",
        label: "Account",
        icon: <FaUser />,
        type: MenuItemType.Link,
        href: "/app/account",
      },
      {
        id: "apps",
        label: "Apps",
        icon: <AiFillAppstore />,
        type: MenuItemType.Link,
        href: "/app/apps",
      },
      {
        id: "avatar-creator",
        label: "Avatar Creator",
        icon: <FaCamera />,
        type: MenuItemType.Link,
        href: "/app/avatar-creator",
      },
      {
        id: "changelog",
        label: "Changelog",
        keywords: ["Changelog", "Updates"],
        icon: <FaCodePullRequest />,
        type: MenuItemType.Link,
        href: "/app/changelog",
      },
      {
        id: "cornerstone-image-browser",
        label: "Cornerstone Image Browser",
        icon: <FaTools />,
        type: MenuItemType.Page,
        page: "cornerstone-image-browser",
      },
      {
        id: "dashboard",
        label: "Dashboard",
        keywords: ["Dashboard", "Startseite", "Homepage"],
        icon: <FaHome />,
        type: MenuItemType.Link,
        href: "/app",
      },
      {
        id: "dogfight-trainer",
        label: "Dogfight Trainer",
        keywords: ["Dogfight Trainer", "Asteroids"],
        icon: <FaTools />,
        type: MenuItemType.Link,
        href: "/app/dogfight-trainer",
      },
      {
        id: "documents",
        label: "Dokumente",
        keywords: ["Dokumente", "Documents", "Dateien"],
        icon: <IoDocuments />,
        type: MenuItemType.Link,
        href: "/app/documents",
      },
      {
        id: "events",
        label: "Events",
        keywords: ["Events", "Veranstaltungen"],
        icon: <MdEvent />,
        type: MenuItemType.Link,
        href: "/app/events",
        authKey: "eventRead",
      },
      {
        id: "fleet",
        label: "Flotte",
        keywords: ["Flotte", "Fleet", "Schiffe", "Ships", "Overview"],
        icon: <MdWorkspaces />,
        type: MenuItemType.Link,
        href: "/app/fleet",
        authKey: "fleetRead",
      },
      {
        id: "sincome",
        label: "SINcome",
        icon: <FaPiggyBank />,
        type: MenuItemType.Link,
        href: "/app/sincome",
        authKey: "profitDistributionCycleRead",
      },
      {
        id: "help",
        label: "Hilfe",
        keywords: ["Hilfe", "Help", "Support"],
        icon: <IoIosHelpCircleOutline />,
        type: MenuItemType.Link,
        href: "/app/help",
      },
      {
        id: "iam",
        label: "IAM",
        icon: <FaLock />,
        type: MenuItemType.Page,
        page: "iam",
        authKey: "iamRead",
      },
      {
        id: "career",
        label: "Karriere",
        keywords: ["Karriere", "Career", "Laufbahn"],
        icon: <TbMilitaryRank />,
        type: MenuItemType.Link,
        href: "/app/career",
        authKey: "careerRead",
      },
      {
        id: "log-analyzer",
        label: "Log Analyzer",
        icon: <FaTools />,
        type: MenuItemType.Link,
        href: "/app/tools/log-analyzer",
        authKey: "logAnalyzerRead",
      },
      {
        id: "silc",
        label: "SILC",
        icon: <FaPiggyBank />,
        type: MenuItemType.Link,
        href: "/app/silc",
        authKey: "silcRead",
      },
      {
        id: "spynet",
        label: "Spynet",
        icon: <RiSpyFill />,
        type: MenuItemType.Page,
        page: "spynet",
        authKey: "spynetRead",
      },
      {
        id: "statistics",
        label: "Statistiken",
        keywords: ["Charts", "Analytics"],
        icon: <FaChartLine />,
        type: MenuItemType.Link,
        href: "/app/statistics",
        authKey: "globalStatisticsRead",
      },
      {
        id: "penalty-points",
        label: "Strafpunkte",
        keywords: ["Strafpunkte", "Penalty Points"],
        icon: <FaScaleBalanced />,
        type: MenuItemType.Link,
        href: "/app/penalty-points",
        authKey: "penaltyEntryCreate",
      },
      {
        id: "tasks",
        label: "Tasks",
        keywords: ["Tasks", "Aufgaben", "Quests"],
        icon: <MdTaskAlt />,
        type: MenuItemType.Link,
        href: "/app/tasks",
        authKey: "taskRead",
      },

      ...externalApps.map(
        (app): LinkMenuItem => ({
          id: `external-${app.slug}`,
          label: app.name,
          icon: app.icon,
          type: MenuItemType.Link,
          href: `/app/external/${app.slug}`,
        }),
      ),
    ],
    [],
  );

  const filteredAndSortedItems = menuItems
    .filter((item) => {
      if (!item.authKey) return true;
      return Boolean(authMap[item.authKey]);
    })
    .sort((a, b) => a.label.localeCompare(b.label, "de"));

  const page = pages[pages.length - 1];

  const renderMenuItem = (item: MenuItem) => {
    switch (item.type) {
      case MenuItemType.Link:
        return (
          <LinkItem
            key={item.id}
            label={item.label}
            keywords={item.keywords}
            icon={item.icon}
            href={item.href}
            setOpen={setOpen}
            setSearch={setSearch}
          />
        );
      case MenuItemType.Page:
        return (
          <PageItem
            key={item.id}
            label={item.label}
            keywords={item.keywords}
            icon={item.icon}
            setPages={() => setPages((pages) => [...pages, item.page])}
            setSearch={setSearch}
          />
        );
      case MenuItemType.Command:
        return (
          <CommandItem
            key={item.id}
            label={item.label}
            keywords={item.keywords}
            icon={item.icon}
            onSelect={item.onSelect}
          />
        );
      default:
        throw new Error(`Unknown item.type: ${item satisfies never}`);
    }
  };

  return (
    <Command.List>
      {!page && <>{filteredAndSortedItems.map(renderMenuItem)}</>}

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
