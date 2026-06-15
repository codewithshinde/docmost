import type React from "react";
import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconFolderPlus,
  IconLayoutKanban,
  IconMessageCircle2,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { getAppName, getSpaceUrl } from "@/lib/config";
import {
  useTeamMembersQuery,
  useTeamQuery,
} from "@/features/chat/queries/team-query";
import { useTeamChannelsQuery } from "@/features/chat/queries/channel-query";
import { useTeamProjectsQuery } from "@/features/chat/queries/project-query";
import { useTeamSpacesQuery } from "@/features/space/queries/space-query";
import CreateSpaceModal from "@/features/space/components/create-space-modal";
import { TeamSettingsModal } from "@/features/chat/components/team-settings-modal";
import { TeamProjectsPanel } from "@/features/chat/components/team-projects-panel";
import { CustomAvatar } from "@/components/ui/custom-avatar";

export default function TeamHubPage() {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const { data: team } = useTeamQuery(teamId);
  const { data: members } = useTeamMembersQuery(teamId);
  const { data: spaces } = useTeamSpacesQuery(teamId);
  const { data: projects } = useTeamProjectsQuery(teamId);
  const { data: channels } = useTeamChannelsQuery(teamId);
  const [settingsOpened, settingsHandlers] = useDisclosure(false);

  if (!teamId || !team) {
    return null;
  }

  const firstChannel = channels?.[0];

  return (
    <Container size="1200" py="xl">
      <Helmet>
        <title>
          {team.name} - {getAppName()}
        </title>
      </Helmet>

      <Group justify="space-between" align="flex-start" mb="lg">
        <Group gap="md" wrap="nowrap">
          <CustomAvatar name={team.name} size={54} radius="md" />
          <div>
            <Text component="h1" fw={750} size="xl">
              {team.name}
            </Text>
            <Text size="sm" c="dimmed">
              {team.description || t("Team hub")}
            </Text>
            <Group gap={6} mt={6}>
              <Badge variant="light">
                {t("{{count}} members", { count: members?.length ?? 0 })}
              </Badge>
              <Badge variant="light">
                {t("{{count}} spaces", { count: spaces?.length ?? 0 })}
              </Badge>
              <Badge variant="light">
                {t("{{count}} projects", { count: projects?.length ?? 0 })}
              </Badge>
            </Group>
          </div>
        </Group>

        <Group gap="xs">
          <Button
            component={Link}
            to={firstChannel ? `/chat/${firstChannel.id}` : "/chat"}
            variant="light"
            leftSection={<IconMessageCircle2 size={16} />}
          >
            {t("Team chat")}
          </Button>
          <Button
            variant="default"
            leftSection={<IconSettings size={16} />}
            onClick={settingsHandlers.open}
          >
            {t("Team settings")}
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="lg">
        <HubTile
          icon={<IconUsers size={22} />}
          label={t("Members")}
          value={String(members?.length ?? 0)}
        />
        <HubTile
          icon={<IconLayoutKanban size={22} />}
          label={t("Projects")}
          value={String(projects?.length ?? 0)}
        />
        <HubTile
          icon={<IconMessageCircle2 size={22} />}
          label={t("Channels")}
          value={String(channels?.length ?? 0)}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Paper withBorder radius="sm" p="md">
          <Group justify="space-between" mb="md">
            <div>
              <Text fw={650}>{t("Team spaces")}</Text>
              <Text size="xs" c="dimmed">
                {t("Knowledge spaces connected to this team.")}
              </Text>
            </div>
            <CreateSpaceModal teamId={teamId} />
          </Group>

          <Stack gap="xs">
            {(spaces ?? []).map((space) => (
              <Paper
                key={space.id}
                component={Link}
                to={getSpaceUrl(space.slug)}
                withBorder
                radius="sm"
                p="sm"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate>
                      {space.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {space.description || t("No description")}
                    </Text>
                  </div>
                  <Badge variant="light">
                    {t("{{count}} members", { count: space.memberCount ?? 0 })}
                  </Badge>
                </Group>
              </Paper>
            ))}
            {(!spaces || spaces.length === 0) && (
              <Text size="sm" c="dimmed">
                {t("No team spaces yet.")}
              </Text>
            )}
          </Stack>
        </Paper>

        <Paper withBorder radius="sm" p="md">
          <TeamProjectsPanel teamId={teamId} members={members} />
        </Paper>
      </SimpleGrid>

      <TeamSettingsModal
        teamId={teamId}
        opened={settingsOpened}
        onClose={settingsHandlers.close}
      />
    </Container>
  );
}

function HubTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Paper withBorder radius="sm" p="md">
      <Group justify="space-between">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={600}>
            {label}
          </Text>
          <Text size="xl" fw={750}>
            {value}
          </Text>
        </Stack>
        {icon}
      </Group>
    </Paper>
  );
}
