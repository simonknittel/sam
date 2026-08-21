import type { EmbedAuthentication } from "@/modules/embed-authentication/utils/types";
import type { StaticImageData } from "next/image";
import type { ReactElement } from "react";

interface BaseApp {
  name: string;
  description: string;
  imageSrc?: StaticImageData;
  tags?: string[];
}

export interface IntegratedApp extends BaseApp {
  href: string;
  slug: string;
  /**
   * Either of these permission strings must be permitted in order to access the app.
   */
  permissionStrings?: string[];
  /**
   * Access check for apps whose permission is not expressible as a permission
   * string, e.g. the career app, whose per-flow access lives in a table and is
   * answered by a resolver. Evaluated in addition to `permissionStrings`, so
   * an app declaring both needs both. Server-only: `getAppLinks` strips it
   * before the app reaches a client component.
   */
  hasAccess?: () => Promise<boolean>;
}

interface DefaultPageIframe {
  iframeUrl: string;
}

interface DefaultPageExternal {
  externalUrl: string;
}

interface CreateLink {
  title: string;
  slug: string;
}

interface TeamMember {
  handle: string;
}

export interface ExternalApp extends BaseApp {
  id: string;
  slug: string;
  defaultPage: DefaultPageIframe | DefaultPageExternal;
  pages?: (
    | {
        title: string;
        slug: string;
        iframeUrl: string;
      }
    | {
        title: string;
        externalUrl: string;
      }
    | {
        title: string;
        slug: string;
      }
  )[];
  createLinks?: CreateLink[];

  team: TeamMember[];
  iframeSandbox?: string;
  icon: ReactElement;
  /**
   * Set only for apps that can verify our tokens and that we control. All
   * iframe URLs of the app receive one.
   */
  embedAuthentication?: EmbedAuthentication;
}

export type RedactedApp = Pick<BaseApp, "name" | "tags"> & {
  redacted: boolean;
};

export type App = IntegratedApp | ExternalApp | RedactedApp;
