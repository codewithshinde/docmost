import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ActionIcon, Badge, ScrollArea, Text, Tooltip } from "@mantine/core";
import { IconHash, IconLock, IconPlus, IconSettings, IconUsersGroup } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAtom, useAtomValue } from "jotai";
import { useDisclosure } from "@mantine/hooks";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { AvatarWithPresence } from "./presence-indicator";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import { useTeamsQuery } from "../queries/team-query";
import {
  useDirectChannelsQuery,
  useTeamChannelsQuery,
  useUnreadCountsQuery,
} from "../queries/channel-query";
import { activeTeamIdAtom } from "../atoms/chat-atoms";
import { getChannelDisplayName } from "../utils/channel-utils";
import { CreateTeamModal } from "./create-team-modal";
import { CreateChannelModal } from "./create-channel-modal";
import { CreateDmModal } from "./create-dm-modal";
import { TeamSettingsModal } from "./team-settings-modal";
import classes from "./chat-sidebar.module.css";

export function ChatSidebar() {
  const { t } = useTranslation();
  const { channelId } = useParams<{ channelId: string }>();
  const currentUser = useAtomValue(userAtom);
  const [activeTeamId, setActiveTeamId] = useAtom(activeTeamIdAtom);

  const { data: teams } = useTeamsQuery();
  const { data: teamChannels } = useTeamChannelsQuery(activeTeamId);
  const { data: dmChannels } = useDirectChannelsQuery();
  const { data: unreadCounts } = useUnreadCountsQuery();

  const [createTeamOpened, createTeamHandlers] = useDisclosure(false);
  const [createChannelOpened, createChannelHandlers] = useDisclosure(false);
  const [createDmOpened, createDmHandlers] = useDisclosure(false);
  const [teamSettingsOpened, teamSettingsHandlers] = useDisclosure(false);
  const [settingsTeamId, setSettingsTeamId] = useState<string | null>(null);

  const unreadMap = useMemo(() => {
    const map = new Map<string, number>();
    unreadCounts?.forEach((entry) => map.set(entry.channelId, entry.unreadCount));
    return map;
  }, [unreadCounts]);

  useEffect(() => {
    if (!activeTeamId && teams && teams.length > 0) {
      setActiveTeamId(teams[0].id);
    }
  }, [activeTeamId, teams, setActiveTeamId]);

  const activeTeam = teams?.find((team) => team.id === activeTeamId);

  const openTeamSettings = (teamId: string) => {
    setSettingsTeamId(teamId);
    teamSettingsHandlers.open();
  };

  const closeTeamSettings = () => {
    teamSettingsHandlers.close();
    setSettingsTeamId(null);
  };

  return (
    <div className={classes.sidebar}>
      <ScrollArea className={classes.teamRail} type="auto">
        {teams?.map((team) => (
          <Tooltip key={team.id} label={team.name} position="right" withArrow>
            <div
              className={classes.teamRailItem}
              data-active={team.id === activeTeamId}
              onClick={() => setActiveTeamId(team.id)}
            >
              <CustomAvatar name={team.name} size={36} radius="md" />
            </div>
          </Tooltip>
        ))}
        <Tooltip label={t("Create team")} position="right" withArrow>
          <ActionIcon
            className={classes.teamRailAdd}
            variant="light"
            color="gray"
            radius="md"
            size={36}
            onClick={createTeamHandlers.open}
            aria-label={t("Create team")}
          >
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
      </ScrollArea>

      <div className={classes.channelPanel}>
        <div className={classes.panelHeader}>
          <Text className={classes.panelHeaderTitle} title={activeTeam?.name}>
            {activeTeam?.name ?? t("Chat")}
          </Text>
          {activeTeam && (
            <Tooltip label={t("Team settings")} withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => openTeamSettings(activeTeam.id)}
                aria-label={t("Team settings")}
              >
                <IconSettings size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </div>

        <ScrollArea className={classes.scroll}>
          <div className={classes.section}>
            <div className={classes.sectionHeader}>
              <span>{t("Channels")}</span>
              {activeTeam && (
                <Tooltip label={t("Create channel")} withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={createChannelHandlers.open}
                    aria-label={t("Create channel")}
                  >
                    <IconPlus size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
            </div>

            {!activeTeam && (
              <Text className={classes.emptyHint}>
                {t("Create or select a team to see its channels.")}
              </Text>
            )}

            {activeTeam && (!teamChannels || teamChannels.length === 0) && (
              <Text className={classes.emptyHint}>
                {t("No channels yet. Create one to get started.")}
              </Text>
            )}

            {teamChannels?.map((channel) => {
              const unread = unreadMap.get(channel.id) ?? 0;
              return (
                <Link
                  key={channel.id}
                  to={`/chat/${channel.id}`}
                  className={classes.channelItem}
                  data-active={channel.id === channelId || undefined}
                  data-has-unread={unread > 0 || undefined}
                >
                  {channel.type === "private" ? (
                    <IconLock size={16} className={classes.channelIcon} />
                  ) : (
                    <IconHash size={16} className={classes.channelIcon} />
                  )}
                  <span className={classes.channelItemLabel}>
                    {channel.name}
                  </span>
                  {unread > 0 && (
                    <Badge
                      className={classes.unreadBadge}
                      size="sm"
                      circle
                      variant="filled"
                    >
                      {unread > 99 ? "99+" : unread}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          <div className={classes.section}>
            <div className={classes.sectionHeader}>
              <span>{t("Direct messages")}</span>
              <Tooltip label={t("New message")} withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={createDmHandlers.open}
                  aria-label={t("New message")}
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Tooltip>
            </div>

            {(!dmChannels || dmChannels.length === 0) && (
              <Text className={classes.emptyHint}>
                {t("No conversations yet.")}
              </Text>
            )}

            {dmChannels?.map((channel) => {
              const unread = unreadMap.get(channel.id) ?? 0;
              const displayName = getChannelDisplayName(
                channel,
                currentUser?.id,
              );
              const participants = (channel.members ?? []).filter(
                (member) => member.id !== currentUser?.id,
              );
              const avatarUser = participants[0];

              return (
                <Link
                  key={channel.id}
                  to={`/chat/${channel.id}`}
                  className={classes.channelItem}
                  data-active={channel.id === channelId || undefined}
                  data-has-unread={unread > 0 || undefined}
                >
                  {channel.type === "group_dm" ? (
                    <IconUsersGroup size={16} className={classes.channelIcon} />
                  ) : (
                    <AvatarWithPresence
                      user={avatarUser}
                      name={displayName}
                      size={18}
                    />
                  )}
                  <span className={classes.channelItemLabel}>
                    {displayName}
                  </span>
                  {unread > 0 && (
                    <Badge
                      className={classes.unreadBadge}
                      size="sm"
                      circle
                      variant="filled"
                    >
                      {unread > 99 ? "99+" : unread}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <CreateTeamModal
        opened={createTeamOpened}
        onClose={createTeamHandlers.close}
        onCreated={openTeamSettings}
      />
      {activeTeam && (
        <CreateChannelModal
          opened={createChannelOpened}
          onClose={createChannelHandlers.close}
          teamId={activeTeam.id}
        />
      )}
      <CreateDmModal opened={createDmOpened} onClose={createDmHandlers.close} />
      {settingsTeamId && (
        <TeamSettingsModal
          teamId={settingsTeamId}
          opened={teamSettingsOpened}
          onClose={closeTeamSettings}
        />
      )}
    </div>
  );
}
