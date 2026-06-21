import { Avatar, Badge, Button, Text, Tooltip } from "@mantine/core";
import {
  IconArchive,
  IconInbox,
  IconPencilPlus,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMailAccountQuery } from "../queries/mail-account-query";
import { useMailUnreadCountQuery } from "../queries/mail-account-query";
import classes from "../styles/inbox.module.css";

type FolderKey = "inbox" | "sent" | "archive" | "trash";

interface MailSidebarProps {
  folder: FolderKey;
  onFolderChange: (folder: FolderKey) => void;
  onCompose: () => void;
}

const FOLDERS: { key: FolderKey; icon: React.FC<any>; label: string }[] = [
  { key: "inbox", icon: IconInbox, label: "Inbox" },
  { key: "sent", icon: IconSend, label: "Sent" },
  { key: "archive", icon: IconArchive, label: "Archive" },
  { key: "trash", icon: IconTrash, label: "Trash" },
];

function avatarColor(email: string): string {
  const colors = ["#1c7ed6", "#2f9e44", "#e03131", "#9c36b5", "#e8590c", "#099268"];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(emailOrName: string): string {
  const parts = emailOrName.replace(/<[^>]+>/, "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export { avatarColor, initials };

export function MailSidebar({ folder, onFolderChange, onCompose }: MailSidebarProps) {
  const { t } = useTranslation();
  const { data: account } = useMailAccountQuery();
  const { data: unreadData } = useMailUnreadCountQuery(!!account?.configured);

  const unreadCount = unreadData?.unread ?? 0;
  const email = account?.emailAddress ?? "";
  const displayName = email.split("@")[0] ?? "Mail";

  return (
    <div className={classes.sidebarPane}>
      <div className={classes.sidebarHeader}>
        <div className={classes.sidebarAccount}>
          <Avatar
            size={32}
            radius="xl"
            style={{ background: avatarColor(email), color: "white", fontWeight: 600, fontSize: 13 }}
          >
            {initials(displayName)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} truncate>
              {displayName}
            </Text>
            <Tooltip label={email} openDelay={400} withArrow>
              <Text size="xs" c="dimmed" truncate style={{ maxWidth: 140 }}>
                {email}
              </Text>
            </Tooltip>
          </div>
        </div>
      </div>

      <div style={{ padding: "10px var(--mantine-spacing-md) 8px" }}>
        <Button
          variant="filled"
          size="xs"
          leftSection={<IconPencilPlus size={14} />}
          onClick={onCompose}
          fullWidth
        >
          {t("Compose")}
        </Button>
      </div>

      <nav className={classes.sidebarNav}>
        <div className={classes.sidebarSection}>{t("Folders")}</div>
        {FOLDERS.map(({ key, icon: Icon, label }) => (
          <div
            key={key}
            className={classes.sidebarItem}
            data-active={folder === key || undefined}
            onClick={() => onFolderChange(key)}
          >
            <Icon size={16} />
            <span className={classes.sidebarItemLabel}>{t(label)}</span>
            {key === "inbox" && unreadCount > 0 && (
              <Badge size="xs" variant="filled" circle={false} style={{ minWidth: 22, height: 18 }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
