import { Badge, Text } from "@mantine/core";
import {
  IconCalendar,
  IconFileText,
  IconLayoutKanban,
  IconLayoutGrid,
  IconMail,
  IconMessageCircle2,
  IconSettings,
  IconSparkles,
  IconStar,
  IconTemplate,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import type { CSSProperties } from "react";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";
import { useUnreadCountsQuery } from "@/features/chat/queries/channel-query";
import { useMailUnreadCountQuery } from "@/features/mail-account/queries/mail-account-query";
import { useHasFeature } from "@/ee/hooks/use-feature";
import { Feature } from "@/ee/features";
import classes from "./home-app-tiles.module.css";

type Tile = {
  label: string;
  path: string;
  icon: typeof IconFileText;
  color: string;
  badge?: number;
  enabled?: boolean;
};

export default function HomeAppTiles() {
  const { t } = useTranslation();
  const workspace = useAtomValue(workspaceAtom);
  const hasTemplates = useHasFeature(Feature.TEMPLATES);
  const { data: unreadCounts } = useUnreadCountsQuery();
  const { data: mailUnread } = useMailUnreadCountQuery();

  const chatUnread = (unreadCounts ?? []).reduce(
    (sum, entry) => sum + entry.unreadCount,
    0,
  );
  const aiChatEnabled = workspace?.settings?.ai?.chat === true;

  const tiles: Tile[] = [
    {
      label: "Spaces",
      path: "/spaces",
      icon: IconLayoutGrid,
      color: "var(--mantine-color-teal-6)",
    },
    {
      label: "Teams",
      path: "/teams",
      icon: IconUsersGroup,
      color: "var(--mantine-color-violet-6)",
    },
    {
      label: "Projects",
      path: "/projects",
      icon: IconLayoutKanban,
      color: "var(--mantine-color-pink-6)",
    },
    {
      label: "Chat",
      path: "/chat",
      icon: IconMessageCircle2,
      color: "var(--mantine-color-indigo-6)",
      badge: chatUnread,
    },
    {
      label: "Mail",
      path: "/mail",
      icon: IconMail,
      color: "var(--mantine-color-red-6)",
      badge: mailUnread?.unread,
    },
    {
      label: "Calendar",
      path: "/calendar",
      icon: IconCalendar,
      color: "var(--mantine-color-orange-6)",
    },
    {
      label: "Favorites",
      path: "/favorites",
      icon: IconStar,
      color: "var(--mantine-color-yellow-7)",
    },
    {
      label: "Templates",
      path: "/templates",
      icon: IconTemplate,
      color: "var(--mantine-color-grape-6)",
      enabled: hasTemplates,
    },
    {
      label: "Members",
      path: "/settings/members",
      icon: IconUsers,
      color: "var(--mantine-color-cyan-7)",
    },
    {
      label: "AI",
      path: "/ai",
      icon: IconSparkles,
      color: "var(--mantine-color-indigo-6)",
      enabled: aiChatEnabled,
    },
    {
      label: "Admin",
      path: "/settings",
      icon: IconSettings,
      color: "var(--mantine-color-gray-7)",
    },
  ];

  const visibleTiles = tiles.filter((tile) => tile.enabled !== false);

  return (
    <section className={classes.wrapper} aria-labelledby="home-apps-title">
      <Text id="home-apps-title" component="h1" className={classes.title}>
        {t("Home")}
      </Text>
      <div className={classes.grid}>
        {visibleTiles.map((tile) => (
          <Link key={tile.label} to={tile.path} className={classes.tile}>
            <span
              className={classes.iconBox}
              style={{ "--tile-color": tile.color } as CSSProperties}
            >
              <tile.icon size={24} stroke={1.8} />
              {!!tile.badge && (
                <Badge
                  className={classes.badge}
                  color="red"
                  size="xs"
                  variant="filled"
                >
                  {tile.badge > 99 ? "99+" : tile.badge}
                </Badge>
              )}
            </span>
            <Text className={classes.label}>{t(tile.label)}</Text>
          </Link>
        ))}
      </div>
    </section>
  );
}
