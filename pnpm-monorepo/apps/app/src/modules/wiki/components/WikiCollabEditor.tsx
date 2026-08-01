"use client";

import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";
import type {
  WikiMentionedCitizen,
  WikiPageLinkedPage,
} from "@sam-monorepo/wiki-editor";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { useEditor } from "@tiptap/react";
import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createWikiCollabToken } from "../actions/createWikiCollabToken";
import { useWikiEditorExtensions } from "./useWikiEditorExtensions";
import { WikiCollabSaveIndicator } from "./WikiCollabSaveIndicator";
import {
  WikiCollabStatusDot,
  type WikiCollabUser,
} from "./WikiCollabStatusDot";
import { useWikiEditMode } from "./WikiEditModeProvider";
import "./wikiEditor.css";
import { WikiEditorLayout } from "./WikiEditorLayout";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly collabUrl: string;
  readonly canEdit: boolean;
  readonly userName: string;
  readonly userColor: string;
  /** Hostnames generic iframes may embed (WikiSetting.iframeAllowlist) */
  readonly iframeAllowlist: readonly string[];
  /** Pages the viewer can see, by id — for internal page links */
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  /** Current handles of the citizens mentioned on the page, by id */
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  /**
   * Server-rendered static content shown until the collab provider has
   * synced, so readers get a fast first paint.
   */
  readonly staticFallback: ReactNode;
}

/**
 * Unique connected users (by name) from the provider's awareness states.
 */
const getAwarenessUsers = (provider: HocuspocusProvider): WikiCollabUser[] => {
  const states = provider.awareness
    ? [...provider.awareness.getStates().values()]
    : [];

  const usersByName = new Map<string, WikiCollabUser>();
  for (const state of states) {
    const user = (state as { user?: { name?: unknown; color?: unknown } }).user;
    if (
      user &&
      typeof user.name === "string" &&
      typeof user.color === "string" &&
      !usersByName.has(user.name)
    )
      usersByName.set(user.name, { name: user.name, color: user.color });
  }

  return [...usersByName.values()].toSorted((a, b) =>
    a.name.localeCompare(b.name, "de"),
  );
};

/**
 * Collaborative editor backed by the Hocuspocus server (apps/collab).
 * Everyone who can see the page connects — users with edit permission
 * read-write, everyone else via a read-only connection with live updates.
 * Editors additionally start in the read-only view and only get the
 * editing chrome while they have toggled edit mode on (WikiEditModeToggle).
 * The provider fetches a fresh short-lived JWT from the app on every
 * (re)connect. Mounted with key={pageId} so every page gets its own
 * provider.
 */
export const WikiCollabEditor = ({
  className,
  pageId,
  collabUrl,
  canEdit,
  userName,
  userColor,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
  staticFallback,
}: Props) => {
  const { isEditMode } = useWikiEditMode();
  const isEditing = canEdit && isEditMode;

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  /**
   * The provider opens a websocket, so it must be created after commit —
   * React discards and replays render attempts (Suspense streaming, Strict
   * Mode), and a provider created during render leaks a connected socket
   * for every discarded attempt.
   */
  useEffect(() => {
    const createdProvider = new HocuspocusProvider({
      url: collabUrl,
      name: pageId,
      token: async () => {
        const formData = new FormData();
        formData.set("id", pageId);
        const response = await createWikiCollabToken(formData);
        if ("token" in response) return response.token;
        throw new Error(
          "error" in response ? response.error : "Ungültige Antwort",
        );
      },
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The provider is an external resource that must be instantiated post-commit (see above); this effect is its only owner.
    setProvider(createdProvider);

    return () => {
      createdProvider.destroy();
    };
  }, [collabUrl, pageId]);

  if (!provider)
    return (
      <WikiEditorLayout
        className={className}
        pageId={pageId}
        isEditing={isEditing}
        editor={null}
        statusSlot={
          <WikiCollabStatusDot
            status={WebSocketStatus.Connecting}
            users={[]}
            className="ml-auto mr-2"
          />
        }
        staticFallback={staticFallback}
      />
    );

  return (
    <ConnectedEditor
      className={className}
      pageId={pageId}
      provider={provider}
      isEditing={isEditing}
      userName={userName}
      userColor={userColor}
      iframeAllowlist={iframeAllowlist}
      linkablePages={linkablePages}
      mentionedCitizens={mentionedCitizens}
      staticFallback={staticFallback}
    />
  );
};

interface ConnectedEditorProps {
  readonly className?: string;
  readonly pageId: string;
  readonly provider: HocuspocusProvider;
  /** Whether the viewer can edit AND has toggled edit mode on */
  readonly isEditing: boolean;
  readonly userName: string;
  readonly userColor: string;
  readonly iframeAllowlist: readonly string[];
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  readonly staticFallback: ReactNode;
}

const ConnectedEditor = ({
  className,
  pageId,
  provider,
  isEditing,
  userName,
  userColor,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
  staticFallback,
}: ConnectedEditorProps) => {
  /**
   * Read as snapshots of the provider's current state instead of only
   * listening for events — events may have fired before this component
   * subscribed.
   */
  const isSynced = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        provider.on("synced", onStoreChange);
        return () => provider.off("synced", onStoreChange);
      },
      [provider],
    ),
    () => provider.synced,
    () => false,
  );

  const status = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        provider.on("status", onStoreChange);
        return () => provider.off("status", onStoreChange);
      },
      [provider],
    ),
    () => provider.configuration.websocketProvider.status,
    () => WebSocketStatus.Connecting,
  );

  /**
   * Connected users from the provider's awareness states (the caret
   * extension publishes each user's name/color there). The snapshot is
   * cached by value so unrelated awareness updates (caret moves) don't
   * re-render.
   */
  const usersCache = useRef<{ key: string; users: WikiCollabUser[] }>({
    key: "[]",
    users: [],
  });
  const collabUsers = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        provider.on("awarenessUpdate", onStoreChange);
        return () => provider.off("awarenessUpdate", onStoreChange);
      },
      [provider],
    ),
    () => {
      const users = getAwarenessUsers(provider);
      const key = JSON.stringify(users);
      if (usersCache.current.key !== key) usersCache.current = { key, users };
      return usersCache.current.users;
    },
    () => usersCache.current.users,
  );

  const extensions = useWikiEditorExtensions({
    pageId,
    iframeAllowlist,
    linkablePages,
    mentionedCitizens,
    collaboration: true,
    interactive: isEditing,
  });

  /**
   * Toggling edit mode recreates the editor (the deps array) — the
   * interactive extensions can't be added or removed at runtime. The Y.Doc
   * lives on the provider, so the content carries over.
   */
  const editor = useEditor(
    {
      extensions: [
        ...extensions,
        Collaboration.configure({ document: provider.document }),
        CollaborationCaret.configure({
          provider,
          user: { name: userName, color: userColor },
        }),
      ],
      editable: isEditing,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          /** pl-12 is the gutter column (WikiGutter), editors only */
          class: clsx("prose prose-invert max-w-none focus:outline-hidden", {
            "min-h-[50vh] pl-12": isEditing,
          }),
        },
      },
    },
    [isEditing],
  );

  const showEditor = editor !== null && isSynced;

  return (
    <WikiEditorLayout
      className={className}
      pageId={pageId}
      isEditing={isEditing}
      editor={showEditor ? editor : null}
      statusSlot={
        <>
          <WikiCollabSaveIndicator
            provider={provider}
            status={status}
            className="ml-auto"
          />
          <WikiCollabStatusDot
            status={status}
            users={collabUsers}
            className="mr-2"
          />
        </>
      }
      staticFallback={staticFallback}
    />
  );
};
