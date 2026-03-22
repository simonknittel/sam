"use client";

// @refresh reset

import { useChannelsContext } from "@/modules/pusher/components/ChannelsContext";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { FaRocket, FaSpinner } from "react-icons/fa";
import { bumpDocumentTitle } from "../utils/title";
import { Button2 } from "./Button2";

const releaseToastId = "release-notification";

export const NewReleaseToast = () => {
  const { client } = useChannelsContext();

  useEffect(() => {
    const channel = client?.subscribe("releases");

    channel?.bind("deploying", () => {
      toast.loading(
        () => (
          <div className="flex gap-2">
            <p>
              In wenigen Minuten wird eine neue Version vom SAM veröffentlicht.
            </p>
          </div>
        ),
        {
          id: releaseToastId,
          duration: Infinity,
          icon: <FaSpinner className="flex-none animate-spin" />,
          className: "gap-2 [&>div[role='status']]:m-0 pointer-events-none",
        },
      );
    });

    channel?.bind("new", () => {
      toast.success(
        () => (
          <div className="flex gap-2">
            <p>Eine neue Version vom SAM wurde veröffentlicht.</p>
            <Button2 onClick={() => window.location.reload()}>Neuladen</Button2>
          </div>
        ),
        {
          id: releaseToastId,
          duration: Infinity,
          icon: <FaRocket className="flex-none" />,
          className: "gap-2 [&>div[role='status']]:m-0",
        },
      );

      bumpDocumentTitle();
    });

    return () => {
      channel?.unbind("deploying");
      channel?.unbind("new");
      channel?.unsubscribe();
    };
  }, [client]);

  return null;
};
