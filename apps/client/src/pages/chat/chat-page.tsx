import { useParams } from "react-router-dom";
import { Text } from "@mantine/core";
import { IconMessageCircle2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { ChannelView } from "@/features/chat/components/channel-view";
import classes from "@/features/chat/styles/chat.module.css";

export default function ChatPage() {
  const { t } = useTranslation();
  const { channelId } = useParams<{ channelId: string }>();

  return (
    <div className={classes.page}>
      <Helmet>
        <title>{t("Chat")}</title>
      </Helmet>

      {channelId ? (
        <ChannelView key={channelId} channelId={channelId} />
      ) : (
        <div className={classes.placeholder}>
          <IconMessageCircle2 size={40} stroke={1.5} />
          <Text fw={600}>{t("Select a channel")}</Text>
          <Text size="sm">
            {t("Choose a channel or direct message from the sidebar to start chatting.")}
          </Text>
        </div>
      )}
    </div>
  );
}
