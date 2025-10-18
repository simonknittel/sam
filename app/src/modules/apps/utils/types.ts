import type { StaticImageData } from "next/image";

export interface BaseApp {
  name: string;
  description: string;
  imageSrc?: StaticImageData;
  tags?: string[];
}

export interface IntegratedApp extends BaseApp {
  href: string;
  /**
   * Either of these permission strings must be permitted in order to access the app.
   */
  permissionStrings?: string[];
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
}

export type RedactedApp = Pick<BaseApp, "name" | "tags"> & {
  redacted: boolean;
};

export type App = IntegratedApp | ExternalApp | RedactedApp;
