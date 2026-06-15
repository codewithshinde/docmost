import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Alert, Center, Loader } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useSetAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { joinCall, leaveCall } from "../services/call-service";
import { ACTIVE_CALL_KEY } from "../queries/call-query";
import { activeCallChannelIdAtom } from "../atoms/chat-atoms";
import classes from "./call-panel.module.css";

interface CallPanelProps {
  channelId: string;
}

export function CallPanel({ channelId }: CallPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const setActiveCallChannelId = useSetAtom(activeCallChannelIdAtom);

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await joinCall(channelId);
        if (cancelled) return;
        if (!res.token || !res.livekitUrl) {
          setError(t("Calls are not configured on this server."));
          return;
        }
        setToken(res.token);
        setServerUrl(res.livekitUrl);
        setCallId(res.call.id);
        queryClient.invalidateQueries({
          queryKey: [...ACTIVE_CALL_KEY, channelId],
        });
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.message ?? t("Unable to join the call."),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const handleClose = async () => {
    if (callId) {
      try {
        await leaveCall(callId);
      } catch {
        // ignore — server will reconcile when the room empties
      }
      queryClient.invalidateQueries({
        queryKey: [...ACTIVE_CALL_KEY, channelId],
      });
    }
    setActiveCallChannelId(null);
  };

  if (error) {
    return (
      <div className={classes.panel}>
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          title={t("Call unavailable")}
          withCloseButton
          onClose={() => setActiveCallChannelId(null)}
        >
          {error}
        </Alert>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className={classes.panel}>
        <Center style={{ height: "100%" }}>
          <Loader size="sm" />
        </Center>
      </div>
    );
  }

  return (
    <div className={classes.panel}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video
        audio
        data-lk-theme="default"
        className={classes.room}
        onDisconnected={() => {
          handleClose();
        }}
        onError={(err) => {
          notifications.show({ message: err.message, color: "red" });
        }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
