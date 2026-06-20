import { useEffect } from "react";
import {
  ActionIcon,
  Badge,
  Center,
  Group,
  Loader,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconHash,
  IconLock,
  IconPhoneFilled,
  IconSettings,
  IconUsersGroup,
  IconVideo,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAtom, useAtomValue } from "jotai";
import { useDisclosure } from "@mantine/hooks";
import { AvatarWithPresence } from "./presence-indicator";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import { useChannelQuery, useChannelMembersQuery } from "../queries/channel-query";
import {
  useActiveCallQuery,
  useCallConfigQuery,
} from "../queries/call-query";
import {
  activeCallChannelIdAtom,
  activeThreadRootIdAtom,
} from "../atoms/chat-atoms";
import { getChannelDisplayName } from "../utils/channel-utils";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";
import { TypingIndicator } from "./typing-indicator";
import { ThreadPanel } from "./thread-panel";
import { ChannelSettingsModal } from "./channel-settings-modal";
import { CallPanel } from "./call-panel";
import classes from "./channel-view.module.css";

interface ChannelViewProps {
  channelId: string;
}

export function ChannelView({ channelId }: ChannelViewProps) {
  const { t } = useTranslation();
  const currentUser = useAtomValue(userAtom);
  const [activeThreadRootId, setActiveThreadRootId] = useAtom(activeThreadRootIdAtom);

  const { data: channel, isLoading } = useChannelQuery(channelId);
  const { data: members } = useChannelMembersQuery(channelId);
  const { data: callConfig } = useCallConfigQuery();
  const { data: activeCall } = useActiveCallQuery(channelId);
  const [activeCallChannelId, setActiveCallChannelId] = useAtom(
    activeCallChannelIdAtom,
  );
  const [settingsOpened, settingsHandlers] = useDisclosure(false);

  useEffect(() => {
    setActiveThreadRootId(null);
  }, [channelId, setActiveThreadRootId]);

  if (isLoading || !channel) {
    return (
      <Center style={{ height: "100%" }}>
        <Loader size="sm" />
      </Center>
    );
  }

  const memberUsers = (members ?? [])
    .map((member) => member.user)
    .filter((user) => !!user);

  const currentMember = (members ?? []).find(
    (member) => member.userId === currentUser?.id,
  );

  const displayName = getChannelDisplayName(channel, currentUser?.id, memberUsers);
  const isDm = channel.type === "dm" || channel.type === "group_dm";
  const otherParticipant = isDm
    ? memberUsers.find((user) => user.id !== currentUser?.id)
    : undefined;

  return (
    <div className={classes.view}>
      <div className={classes.header}>
        {channel.type === "public" && <IconHash size={18} className={classes.headerIcon} />}
        {channel.type === "private" && <IconLock size={18} className={classes.headerIcon} />}
        {channel.type === "group_dm" && (
          <IconUsersGroup size={18} className={classes.headerIcon} />
        )}
        {channel.type === "dm" && (
          <AvatarWithPresence
            user={otherParticipant}
            name={displayName}
            size={20}
          />
        )}
        <Text className={classes.headerTitle}>{displayName}</Text>
        {channel.topic && <div className={classes.headerTopic}>{channel.topic}</div>}
        <div className={classes.headerActions}>
          {!isDm && members && (
            <Tooltip label={t("{{count}} members", { count: members.length })} withArrow>
              <Group gap={4}>
                <IconUsersGroup size={16} className={classes.headerIcon} />
                <Text size="xs" c="dimmed">
                  {members.length}
                </Text>
              </Group>
            </Tooltip>
          )}
          {callConfig?.enabled && (
            <Tooltip
              label={
                activeCall
                  ? t("Join call")
                  : t("Start call")
              }
              withArrow
            >
              <ActionIcon
                variant={activeCall ? "filled" : "subtle"}
                color={activeCall ? "green" : "gray"}
                onClick={() => setActiveCallChannelId(channelId)}
                aria-label={activeCall ? t("Join call") : t("Start call")}
              >
                {activeCall ? (
                  <IconPhoneFilled size={16} />
                ) : (
                  <IconVideo size={16} />
                )}
              </ActionIcon>
            </Tooltip>
          )}
          {callConfig?.enabled &&
            activeCall &&
            (activeCall.participants?.length ?? 0) > 0 &&
            activeCallChannelId !== channelId && (
              <Badge size="sm" variant="light" color="green">
                {activeCall.participants?.length}
              </Badge>
            )}
          {(channel.type === "public" || channel.type === "private") && (
            <Tooltip label={t("Channel settings")} withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={settingsHandlers.open}
                aria-label={t("Channel settings")}
              >
                <IconSettings size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </div>
      </div>

      <div className={classes.content}>
        <div className={classes.body}>
          {callConfig?.enabled && activeCallChannelId === channelId && (
            <CallPanel channelId={channelId} />
          )}
          <MessageList
            channelId={channelId}
            currentUserId={currentUser?.id}
            initialLastReadMessageId={currentMember?.lastReadMessageId}
          />
          <TypingIndicator channelId={channelId} currentUserId={currentUser?.id} />
          <MessageComposer channelId={channelId} />
        </div>

        {activeThreadRootId && (
          <ThreadPanel
            channelId={channelId}
            currentUserId={currentUser?.id}
            rootId={activeThreadRootId}
          />
        )}
      </div>

      {(channel.type === "public" || channel.type === "private") && (
        <ChannelSettingsModal
          channelId={channelId}
          opened={settingsOpened}
          onClose={settingsHandlers.close}
        />
      )}
    </div>
  );
}
