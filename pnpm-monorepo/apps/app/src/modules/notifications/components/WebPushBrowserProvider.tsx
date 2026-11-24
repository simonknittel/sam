"use client";

import { env } from "@/env";
import { runAction } from "@/modules/actions/utils/runAction";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import { deleteWebPushSubscription } from "../actions/deleteWebPushSubscription";
import { subscribeWebPush } from "../actions/subscribeWebPush";

export enum WebPushBrowserStatus {
  Checking = "checking",
  /** For example Safari on iOS outside of a web app */
  Unsupported = "unsupported",
  /** The app has no VAPID key */
  Unavailable = "unavailable",
  Blocked = "blocked",
  PermissionRequired = "permission_required",
  /** The permission is given, but the citizen has no subscription of the browser */
  Inactive = "inactive",
  Active = "active",
}

interface BrowserState {
  readonly isSupported: boolean;
  readonly permission: NotificationPermission;
  readonly endpoint: string | null;
}

const UNSUPPORTED_BROWSER_STATE: BrowserState = {
  isSupported: false,
  permission: "default",
  endpoint: null,
};

const isPushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const getBrowserSubscription = async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
};

const readBrowserState = async (): Promise<BrowserState> => {
  if (!isPushSupported()) return UNSUPPORTED_BROWSER_STATE;

  let endpoint = null;
  try {
    endpoint = (await getBrowserSubscription())?.endpoint ?? null;
  } catch (error) {
    console.error(error);
  }

  return { isSupported: true, permission: Notification.permission, endpoint };
};

/**
 * Best effort: without the stored subscription, the server sends no push
 * notifications to the browser anyway
 */
const removeBrowserPushSubscription = async () => {
  try {
    await (await getBrowserSubscription())?.unsubscribe();
  } catch (error) {
    console.error(error);
  }
};

const activateWebPush = async (vapidKey: string): Promise<BrowserState> => {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    toast.error("Die Benachrichtigungen wurden nicht genehmigt.");
    return { isSupported: true, permission, endpoint: null };
  }

  let subscription;
  try {
    await navigator.serviceWorker.register("/service-worker.js");
    /**
     * A new registration has no active worker yet, but subscribe() needs
     * one. ready waits for it.
     */
    const registration = await navigator.serviceWorker.ready;

    await (await registration.pushManager.getSubscription())?.unsubscribe();

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
  } catch (error) {
    toast.error(
      "Es gab einen Fehler beim Aktivieren der Benachrichtigungen. Bitte probiere es später erneut.",
    );
    console.error(error);
    return readBrowserState();
  }

  const formData = new FormData();
  formData.append("subscription", JSON.stringify(subscription));
  const succeeded = await runAction(subscribeWebPush, formData, {
    successToast: false,
  });
  if (succeeded)
    toast.success("Die Benachrichtigungen wurden erfolgreich aktiviert.");

  return { isSupported: true, permission, endpoint: subscription.endpoint };
};

const deactivateWebPush = async (subscriptionId: string) => {
  const formData = new FormData();
  formData.append("id", subscriptionId);
  const succeeded = await runAction(deleteWebPushSubscription, formData, {
    successToast: false,
  });
  if (!succeeded) return false;

  await removeBrowserPushSubscription();
  toast.success("Die Benachrichtigungen wurden in diesem Browser deaktiviert.");
  return true;
};

const getStatus = (
  browserState: BrowserState | null,
  currentSubscriptionId: string | null,
) => {
  if (!browserState) return WebPushBrowserStatus.Checking;
  if (!browserState.isSupported) return WebPushBrowserStatus.Unsupported;
  if (!env.NEXT_PUBLIC_VAPID_KEY) return WebPushBrowserStatus.Unavailable;
  if (browserState.permission === "denied") return WebPushBrowserStatus.Blocked;
  if (browserState.permission === "default")
    return WebPushBrowserStatus.PermissionRequired;
  if (!currentSubscriptionId) return WebPushBrowserStatus.Inactive;
  return WebPushBrowserStatus.Active;
};

interface WebPushBrowserContext {
  readonly status: WebPushBrowserStatus;
  readonly currentSubscriptionId: string | null;
  readonly isPending: boolean;
  readonly subscribe: () => Promise<void>;
  readonly unsubscribe: () => Promise<void>;
  /** But not the stored subscription */
  readonly removeBrowserSubscription: () => Promise<void>;
}

const WebPushBrowserContext = createContext<WebPushBrowserContext | null>(null);

interface StoredSubscription {
  readonly id: string;
  readonly endpoint: string;
}

interface Props {
  readonly subscriptions: readonly StoredSubscription[];
  readonly children: ReactNode;
}

export const WebPushBrowserProvider = ({ subscriptions, children }: Props) => {
  const [browserState, setBrowserState] = useState<BrowserState | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    const update = () => {
      void readBrowserState().then((state) => {
        if (!isCancelled) setBrowserState(state);
      });
    };

    update();

    /**
     * A change in the site settings of the browser shows without a reload.
     * Not each browser can query the permission of the notifications.
     */
    if ("permissions" in navigator)
      navigator.permissions
        .query({ name: "notifications" })
        .then((status) => {
          if (isCancelled) return;
          permissionStatus = status;
          status.addEventListener("change", update);
        })
        .catch(() => undefined);

    return () => {
      isCancelled = true;
      permissionStatus?.removeEventListener("change", update);
    };
  }, []);

  const browserEndpoint = browserState?.endpoint ?? null;
  const currentSubscriptionId =
    subscriptions.find(
      (subscription) =>
        browserEndpoint !== null && subscription.endpoint === browserEndpoint,
    )?.id ?? null;

  const forgetBrowserEndpoint = () =>
    setBrowserState((state) => state && { ...state, endpoint: null });

  const subscribe = async () => {
    if (!env.NEXT_PUBLIC_VAPID_KEY) return;

    setIsPending(true);
    setBrowserState(await activateWebPush(env.NEXT_PUBLIC_VAPID_KEY));
    setIsPending(false);
  };

  const unsubscribe = async () => {
    if (!currentSubscriptionId) return;

    setIsPending(true);
    if (await deactivateWebPush(currentSubscriptionId)) forgetBrowserEndpoint();
    setIsPending(false);
  };

  const removeBrowserSubscription = async () => {
    await removeBrowserPushSubscription();
    forgetBrowserEndpoint();
  };

  return (
    <WebPushBrowserContext
      value={{
        status: getStatus(browserState, currentSubscriptionId),
        currentSubscriptionId,
        isPending,
        subscribe,
        unsubscribe,
        removeBrowserSubscription,
      }}
    >
      {children}
    </WebPushBrowserContext>
  );
};

export const useWebPushBrowser = () => {
  const context = useContext(WebPushBrowserContext);
  if (!context) throw new Error("[WebPushBrowserProvider] Provider is missing");
  return context;
};
