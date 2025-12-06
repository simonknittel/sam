"use client";

// @refresh reset

import { useChannelsContext } from "@/modules/pusher/components/ChannelsContext";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { FaRocket } from "react-icons/fa";
import { Button2 } from "./Button2";

export const NewReleaseToast = () => {
  const { client } = useChannelsContext();

  useEffect(() => {
    const channel = client?.subscribe("releases");

    channel?.bind("new", () => {
      toast.success(
        () => (
          <div className="flex gap-2">
            <p>Eine neue Version vom S.A.M. wurde veröffentlicht.</p>
            <Button2 onClick={() => window.location.reload()}>Neuladen</Button2>
          </div>
        ),
        {
          duration: Infinity,
          icon: <FaRocket className="flex-none" />,
        },
      );
    });

    return () => {
      channel?.unbind("new");
      channel?.unsubscribe();
    };
  }, [client]);

  return null;
};
