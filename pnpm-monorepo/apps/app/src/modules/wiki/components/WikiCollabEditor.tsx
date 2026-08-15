"use client";

import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";
import type {
  WikiLinkedVariant,
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
import type { WikiImageDimensions } from "../utils/wikiImageRendering";
import { useWikiEditorExtensions } from "./useWikiEditorExtensions";
import { WikiCollabSaveIndicator } from "./WikiCollabSaveIndicator";
import {
  WikiCollabStatusDot,
  type WikiCollabStatus,
  type WikiCollabUser,
} from "./WikiCollabStatusDot";
import { useWikiEditMode } from "./WikiEditModeProvider";
import "./wikiEditor.css";
import { WikiEditorLayout } from "./WikiEditorLayout";
import { WikiEmbedUrlModal } from "./WikiEmbedUrlModal";
import { WikiLinkModal } from "./WikiLinkModal";
import type { WikiPageIndexEntry } from "./WikiPageIndexList";
import type { WikiRoleCitizen } from "./WikiRoleCitizensList";
import { WikiVariantLinkModal } from "./WikiVariantLinkModal";

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly collabUrl: string;
  readonly canEdit: boolean;
  /** Whether the viewer may upload images to the page */
  readonly canUploadImages: boolean;
  /** Whether the viewer may upload file attachments to the page */
  readonly canUploadAttachments: boolean;
  readonly userName: string;
  readonly userColor: string;
  /** Hostnames generic iframes may embed (WikiSetting.iframeAllowlist) */
  readonly iframeAllowlist: readonly string[];
  /** Pages the viewer can see, by id — for internal page links */
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  /** Current handles of the citizens mentioned on the page, by id */
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  /** Current names and manufacturer logos of the variants linked on the page, by id */
  readonly linkedVariants: Readonly<Record<string, WikiLinkedVariant>>;
  /**
   * Server-resolved page lists of the page-index nodes, keyed by
   * `wikiPageIndexConfigKey` — the node views' initial data
   */
  readonly pageIndexes: Readonly<Record<string, WikiPageIndexEntry[]>>;
  /**
   * Server-resolved members of the role-member nodes, keyed by role id —
   * the node views' initial data
   */
  readonly roleCitizens: Readonly<Record<string, WikiRoleCitizen[]>>;
  /**
   * Intrinsic dimensions of the page's uploaded images, by upload id —
   * lets the image node view serve optimized images
   */
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
  /**
   * Server-rendered static content shown until the collab provider has
   * synced, so readers get a fast first paint.
   */
  readonly staticFallback: ReactNode;
}

const noop = () => undefined;

/**
 * Unique connected users (by name) from the provider's awareness states,
 * each with the edit-mode flag its client published — whether they are
 * editing right now, not whether they may: users with edit permission
 * read along like everyone else until they toggle edit mode on. The flag
 * comes from the same awareness state as the name and color, i.e. from
 * the client itself; the connection's real permission is the JWT the
 * collab server verifies, this list is display only.
 */
const getAwarenessUsers = (provider: HocuspocusProvider): WikiCollabUser[] => {
  const states = provider.awareness
    ? [...provider.awareness.getStates().values()]
    : [];

  const usersByName = new Map<string, WikiCollabUser>();
  for (const state of states) {
    const user = (
      state as {
        user?: { name?: unknown; color?: unknown; isEditing?: unknown };
      }
    ).user;
    if (
      !user ||
      typeof user.name !== "string" ||
      typeof user.color !== "string"
    )
      continue;

    const isEditing = user.isEditing === true;
    const existing = usersByName.get(user.name);
    /**
     * Several connections of one user collapse into one entry, and an
     * editing one wins: edit mode is toggled per tab, so one user's tabs
     * genuinely disagree.
     */
    if (!existing)
      usersByName.set(user.name, {
        name: user.name,
        color: user.color,
        isEditing,
      });
    else if (isEditing && !existing.isEditing)
      usersByName.set(user.name, { ...existing, isEditing });
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
  canUploadImages,
  canUploadAttachments,
  userName,
  userColor,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
  linkedVariants,
  pageIndexes,
  roleCitizens,
  imageDimensions,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-you-might-not-need-an-effect/no-external-store-subscription, react-you-might-not-need-an-effect/no-adjust-state-on-prop-change -- The provider is an external resource that must be instantiated post-commit (see above); this effect is its only owner.
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
        canUploadImages={canUploadImages}
        canUploadAttachments={canUploadAttachments}
        editor={null}
        statusSlot={
          <WikiCollabStatusDot
            status={WebSocketStatus.Connecting}
            users={[]}
            className="ml-auto mr-2"
          />
        }
        staticFallback={staticFallback}
        /** No editor yet — the gutter/overlays (the only consumers) are not rendered */
        onRequestEmbed={noop}
        onRequestLink={noop}
        onRequestVariantLink={noop}
      />
    );

  return (
    <ConnectedEditor
      className={className}
      pageId={pageId}
      provider={provider}
      canUploadImages={canUploadImages}
      canUploadAttachments={canUploadAttachments}
      isEditing={isEditing}
      userName={userName}
      userColor={userColor}
      iframeAllowlist={iframeAllowlist}
      linkablePages={linkablePages}
      mentionedCitizens={mentionedCitizens}
      linkedVariants={linkedVariants}
      pageIndexes={pageIndexes}
      roleCitizens={roleCitizens}
      imageDimensions={imageDimensions}
      staticFallback={staticFallback}
    />
  );
};

interface ConnectedEditorProps {
  readonly className?: string;
  readonly pageId: string;
  readonly provider: HocuspocusProvider;
  /** Whether the viewer may upload images to the page */
  readonly canUploadImages: boolean;
  /** Whether the viewer may upload file attachments to the page */
  readonly canUploadAttachments: boolean;
  /** Whether the viewer can edit AND has toggled edit mode on */
  readonly isEditing: boolean;
  readonly userName: string;
  readonly userColor: string;
  readonly iframeAllowlist: readonly string[];
  readonly linkablePages: Readonly<Record<string, WikiPageLinkedPage>>;
  readonly mentionedCitizens: Readonly<Record<string, WikiMentionedCitizen>>;
  readonly linkedVariants: Readonly<Record<string, WikiLinkedVariant>>;
  readonly pageIndexes: Readonly<Record<string, WikiPageIndexEntry[]>>;
  readonly roleCitizens: Readonly<Record<string, WikiRoleCitizen[]>>;
  readonly imageDimensions: Readonly<Record<string, WikiImageDimensions>>;
  readonly staticFallback: ReactNode;
}

const ConnectedEditor = ({
  className,
  pageId,
  provider,
  canUploadImages,
  canUploadAttachments,
  isEditing,
  userName,
  userColor,
  iframeAllowlist,
  linkablePages,
  mentionedCitizens,
  linkedVariants,
  pageIndexes,
  roleCitizens,
  imageDimensions,
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

  const websocketStatus = useSyncExternalStore(
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
   * Authentication happens inside the open socket, so the transport status
   * above stays "connected" while the server rejects the session token (or
   * the token mint fails) — the provider only reports that via these
   * events (a failed mint also arrives as "authenticationFailed"). Sticky
   * across the provider's retry loop, which reopens the socket before
   * failing again — gating on the transport status would just flicker.
   * Only a successful authentication clears it. No provider property holds
   * this (isAuthenticated is false while connecting too), so the flag
   * lives in a ref and there is no snapshot to initialize from; a remount
   * during a failure loop shows the transport status until the next retry
   * fails.
   */
  const hasAuthenticationFailedRef = useRef(false);
  const hasAuthenticationFailed = useSyncExternalStore(
    useCallback(
      (onStoreChange: () => void) => {
        const handleFailed = () => {
          hasAuthenticationFailedRef.current = true;
          onStoreChange();
        };
        const handleAuthenticated = () => {
          hasAuthenticationFailedRef.current = false;
          onStoreChange();
        };
        provider.on("authenticationFailed", handleFailed);
        provider.on("authenticated", handleAuthenticated);
        return () => {
          provider.off("authenticationFailed", handleFailed);
          provider.off("authenticated", handleAuthenticated);
        };
      },
      [provider],
    ),
    () => hasAuthenticationFailedRef.current,
    () => false,
  );

  const status: WikiCollabStatus = hasAuthenticationFailed
    ? "authenticationFailed"
    : websocketStatus;

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

  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const requestEmbed = useCallback(() => setIsEmbedModalOpen(true), []);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const requestLink = useCallback(() => setIsLinkModalOpen(true), []);

  const [isVariantLinkModalOpen, setIsVariantLinkModalOpen] = useState(false);
  const requestVariantLink = useCallback(
    () => setIsVariantLinkModalOpen(true),
    [],
  );

  const extensions = useWikiEditorExtensions({
    pageId,
    iframeAllowlist,
    linkablePages,
    mentionedCitizens,
    linkedVariants,
    pageIndexes,
    roleCitizens,
    imageDimensions,
    collaboration: true,
    interactive: isEditing,
    canUploadImages,
    canUploadAttachments,
    onRequestEmbed: requestEmbed,
    onRequestLink: requestLink,
    onRequestVariantLink: requestVariantLink,
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
          /**
           * Published to the other clients as this connection's awareness
           * state — isEditing rides along so their status dot can list
           * who is editing right now (getAwarenessUsers). Toggling edit
           * mode recreates the editor, which republishes the state.
           */
          user: { name: userName, color: userColor, isEditing },
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
    <>
      <WikiEditorLayout
        className={className}
        pageId={pageId}
        isEditing={isEditing}
        canUploadImages={canUploadImages}
        canUploadAttachments={canUploadAttachments}
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
        onRequestEmbed={requestEmbed}
        onRequestLink={requestLink}
        onRequestVariantLink={requestVariantLink}
      />

      {editor && isEmbedModalOpen && (
        <WikiEmbedUrlModal
          editor={editor}
          onRequestClose={() => setIsEmbedModalOpen(false)}
        />
      )}

      {editor && isLinkModalOpen && (
        <WikiLinkModal
          editor={editor}
          onRequestClose={() => setIsLinkModalOpen(false)}
        />
      )}

      {editor && isVariantLinkModalOpen && (
        <WikiVariantLinkModal
          editor={editor}
          onRequestClose={() => setIsVariantLinkModalOpen(false)}
        />
      )}
    </>
  );
};
