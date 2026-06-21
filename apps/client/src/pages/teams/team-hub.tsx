import type React from "react";
import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Progress,
  RingProgress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconActivity,
  IconBook,
  IconCheck,
  IconChevronRight,
  IconFolderFilled,
  IconLayoutKanban,
  IconMessageCircle2,
  IconPlus,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useDisclosure } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { getAppName, getSpaceUrl } from "@/lib/config";
import {
  useAddTeamGroupMutation,
  useAddTeamMemberMutation,
  useTeamMembersQuery,
  useTeamGroupsQuery,
  useTeamQuery,
} from "@/features/chat/queries/team-query";
import { useTeamChannelsQuery } from "@/features/chat/queries/channel-query";
import { useTeamProjectsQuery } from "@/features/chat/queries/project-query";
import { useTeamSpacesQuery } from "@/features/space/queries/space-query";
import CreateSpaceModal from "@/features/space/components/create-space-modal";
import { TeamSettingsModal } from "@/features/chat/components/team-settings-modal";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { MultiUserSelect } from "@/features/group/components/multi-user-select";
import { getGroups } from "@/features/group/services/group-service";
import { useQuery } from "@tanstack/react-query";
import { ITeamProject } from "@/features/chat/types/chat.types";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TeamHubTab = "overview" | "members" | "spaces" | "projects";

const TABS: { key: TeamHubTab; label: string; icon: typeof IconUsers }[] = [
  { key: "overview", label: "Overview", icon: IconActivity },
  { key: "members", label: "Members", icon: IconUsers },
  { key: "spaces", label: "Spaces", icon: IconBook },
  { key: "projects", label: "Projects", icon: IconLayoutKanban },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamHubPage() {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data: team } = useTeamQuery(teamId);
  const { data: members } = useTeamMembersQuery(teamId);
  const { data: teamGroups } = useTeamGroupsQuery(teamId);
  const { data: spaces } = useTeamSpacesQuery(teamId);
  const { data: projects } = useTeamProjectsQuery(teamId);
  const { data: channels } = useTeamChannelsQuery(teamId);
  const [settingsOpened, settingsHandlers] = useDisclosure(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TeamHubTab>("overview");
  const addMemberMutation = useAddTeamMemberMutation();
  const addGroupMutation = useAddTeamGroupMutation();
  const { data: groups } = useQuery({
    queryKey: ["groups", "team-picker"],
    queryFn: () => getGroups({ limit: 100 }),
  });

  if (!teamId || !team) return null;

  const firstChannel = channels?.[0];
  const totalProjects = projects?.length ?? 0;
  const totalMembers = members?.length ?? 0;
  const totalSpaces = spaces?.length ?? 0;
  const totalChannels = channels?.length ?? 0;

  return (
    <Box style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Helmet>
        <title>{team.name} - {getAppName()}</title>
      </Helmet>

      {/* Left sidebar nav */}
      <Box
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--mantine-color-default-border)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
        }}
      >
        {/* Team identity */}
        <Group gap="sm" mb="lg" wrap="nowrap">
          <CustomAvatar name={team.name} size={40} radius="md" />
          <Box style={{ minWidth: 0 }}>
            <Text fw={700} size="sm" truncate>{team.name}</Text>
            <Text size="xs" c="dimmed" truncate>{team.description || t("Team hub")}</Text>
          </Box>
        </Group>

        {/* Stats chips */}
        <Group gap={4} mb="lg" wrap="wrap">
          <Badge variant="light" size="xs">{totalMembers} members</Badge>
          <Badge variant="light" size="xs">{totalProjects} projects</Badge>
        </Group>

        <Divider mb="sm" />

        {/* Tab navigation */}
        <Stack gap={2} flex={1}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <UnstyledButton
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: active ? "var(--mantine-color-blue-0)" : "transparent",
                  color: active ? "var(--mantine-color-blue-7)" : "var(--mantine-color-text)",
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  transition: "background 0.1s",
                }}
              >
                <Icon size={15} />
                {t(tab.label)}
              </UnstyledButton>
            );
          })}
        </Stack>

        <Divider my="sm" />

        {/* Quick actions */}
        <Stack gap="xs">
          {firstChannel && (
            <Button
              component={Link}
              to={`/chat/${firstChannel.id}`}
              variant="subtle"
              size="xs"
              leftSection={<IconMessageCircle2 size={13} />}
              fullWidth
              justify="flex-start"
            >
              {t("Team chat")}
            </Button>
          )}
          <Button
            component={Link}
            to="/projects"
            variant="subtle"
            size="xs"
            leftSection={<IconLayoutKanban size={13} />}
            fullWidth
            justify="flex-start"
          >
            {t("All projects")}
          </Button>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconSettings size={13} />}
            onClick={settingsHandlers.open}
            fullWidth
            justify="flex-start"
          >
            {t("Team settings")}
          </Button>
        </Stack>
      </Box>

      {/* Main content */}
      <ScrollArea flex={1} p="xl">
        {activeTab === "overview" && (
          <TeamOverview
            teamId={teamId}
            projects={projects ?? []}
            members={members ?? []}
            spaces={spaces ?? []}
            channels={channels ?? []}
            totalMembers={totalMembers}
            totalProjects={totalProjects}
            totalSpaces={totalSpaces}
            totalChannels={totalChannels}
          />
        )}

        {activeTab === "members" && (
          <MembersTab
            teamId={teamId}
            members={members ?? []}
            teamGroups={teamGroups ?? []}
            groups={groups}
            memberIds={memberIds}
            groupId={groupId}
            onMemberIdsChange={setMemberIds}
            onGroupIdChange={setGroupId}
            addMemberMutation={addMemberMutation}
            addGroupMutation={addGroupMutation}
          />
        )}

        {activeTab === "spaces" && (
          <SpacesTab teamId={teamId} spaces={spaces ?? []} />
        )}

        {activeTab === "projects" && (
          <ProjectsTab projects={projects ?? []} />
        )}
      </ScrollArea>

      <TeamSettingsModal
        teamId={teamId}
        opened={settingsOpened}
        onClose={settingsHandlers.close}
      />
    </Box>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function TeamOverview({
  teamId,
  projects,
  members,
  spaces,
  channels,
  totalMembers,
  totalProjects,
  totalSpaces,
  totalChannels,
}: {
  teamId: string;
  projects: ITeamProject[];
  members: any[];
  spaces: any[];
  channels: any[];
  totalMembers: number;
  totalProjects: number;
  totalSpaces: number;
  totalChannels: number;
}) {
  const { t } = useTranslation();

  // Aggregate task stats across all projects
  const totalTasks = projects.reduce((s, p) => s + Number(p.taskCount ?? 0), 0);
  const doneTasks = projects.reduce((s, p) => s + Number(p.doneTaskCount ?? 0), 0);
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const projectsByCompletion = [...projects]
    .sort((a, b) => {
      const pa = Number(a.taskCount ?? 0) > 0 ? Number(a.doneTaskCount ?? 0) / Number(a.taskCount ?? 0) : 0;
      const pb = Number(b.taskCount ?? 0) > 0 ? Number(b.doneTaskCount ?? 0) / Number(b.taskCount ?? 0) : 0;
      return pb - pa;
    })
    .slice(0, 5);

  return (
    <Stack gap="xl" maw={1000}>
      {/* Summary KPI row */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <KpiCard icon={<IconUsers size={20} />} label={t("Members")} value={totalMembers} color="blue" />
        <KpiCard icon={<IconLayoutKanban size={20} />} label={t("Projects")} value={totalProjects} color="violet" />
        <KpiCard icon={<IconCheck size={20} />} label={t("Tasks done")} value={doneTasks} color="green" />
        <KpiCard icon={<IconBook size={20} />} label={t("Spaces")} value={totalSpaces} color="teal" />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Overall progress */}
        <Paper withBorder radius="md" p="lg">
          <Group justify="space-between" mb="md">
            <div>
              <Text fw={700} size="sm">{t("Team Progress")}</Text>
              <Text size="xs" c="dimmed">{doneTasks} of {totalTasks} tasks completed</Text>
            </div>
            <RingProgress
              size={64}
              thickness={6}
              roundCaps
              sections={[{ value: progressPct, color: "blue" }]}
              label={
                <Text ta="center" size="xs" fw={700} c="blue">{progressPct}%</Text>
              }
            />
          </Group>
          <Progress value={progressPct} size="md" radius="xl" color="blue" />
        </Paper>

        {/* Project health */}
        <Paper withBorder radius="md" p="lg">
          <Text fw={700} size="sm" mb="md">{t("Project Health")}</Text>
          <Stack gap="xs">
            {projectsByCompletion.map((p) => {
              const total = Number(p.taskCount ?? 0);
              const done = Number(p.doneTaskCount ?? 0);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Box key={p.id}>
                  <Group justify="space-between" mb={3}>
                    <Group gap={6}>
                      <ThemeIcon size={16} variant="light" color="blue" radius="sm">
                        <IconFolderFilled size={10} />
                      </ThemeIcon>
                      <Text size="xs" fw={500} truncate style={{ maxWidth: 160 }}>{p.name}</Text>
                    </Group>
                    <Text size="xs" c="dimmed">{done}/{total}</Text>
                  </Group>
                  <Progress value={pct} size="xs" color={pct === 100 ? "green" : "blue"} radius="xl" />
                </Box>
              );
            })}
            {projects.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="sm">{t("No projects yet.")}</Text>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* Recent members */}
      <Paper withBorder radius="md" p="lg">
        <Group justify="space-between" mb="md">
          <Text fw={700} size="sm">{t("Team Members")}</Text>
          <Badge variant="light">{totalMembers}</Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {members.slice(0, 6).map((member) => (
            <Group key={member.id} gap="sm" wrap="nowrap" p="xs"
              style={{ borderRadius: 6, border: "1px solid var(--mantine-color-default-border)" }}>
              <CustomAvatar size={32} name={member.user?.name} avatarUrl={member.user?.avatarUrl} />
              <Box style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} truncate>{member.user?.name ?? member.user?.email}</Text>
                <Badge size="xs" variant="light" color={member.role === "owner" ? "blue" : "gray"}>{t(member.role)}</Badge>
              </Box>
            </Group>
          ))}
        </SimpleGrid>
        {members.length > 6 && (
          <Text size="xs" c="dimmed" mt="sm">+{members.length - 6} more members</Text>
        )}
      </Paper>

      {/* Spaces preview */}
      {spaces.length > 0 && (
        <Paper withBorder radius="md" p="lg">
          <Group justify="space-between" mb="md">
            <Text fw={700} size="sm">{t("Team Spaces")}</Text>
            <Badge variant="light">{totalSpaces}</Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {spaces.slice(0, 4).map((space) => (
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
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={28} variant="light" color="teal" radius="md">
                      <IconBook size={16} />
                    </ThemeIcon>
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>{space.name}</Text>
                      <Text size="xs" c="dimmed">{space.memberCount ?? 0} members</Text>
                    </div>
                  </Group>
                  <IconChevronRight size={14} color="var(--mantine-color-dimmed)" />
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Paper>
      )}
    </Stack>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: 0.5 }}>{label}</Text>
          <Text size="2xl" fw={800} c={color} style={{ fontSize: 28, lineHeight: 1 }}>{value}</Text>
        </Stack>
        <ThemeIcon size={40} variant="light" color={color} radius="xl">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({
  teamId,
  members,
  teamGroups,
  groups,
  memberIds,
  groupId,
  onMemberIdsChange,
  onGroupIdChange,
  addMemberMutation,
  addGroupMutation,
}: any) {
  const { t } = useTranslation();

  return (
    <Stack gap="lg" maw={900}>
      <Text fw={700} size="lg">{t("Members")}</Text>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Add member */}
        <Paper withBorder radius="md" p="lg">
          <Text fw={600} size="sm" mb="xs">{t("Add members")}</Text>
          <Text size="xs" c="dimmed" mb="md">
            {t("People added here receive this team's spaces, chat, and projects.")}
          </Text>
          <Group align="flex-end" mb="md" wrap="nowrap">
            <div style={{ flex: 1 }}>
              <MultiUserSelect
                onChange={onMemberIdsChange}
                excludeUserIds={(members ?? []).map((m: any) => m.userId)}
              />
            </div>
            <Button
              leftSection={<IconPlus size={14} />}
              disabled={memberIds.length === 0}
              loading={addMemberMutation.isPending}
              onClick={async () => {
                await Promise.all(
                  memberIds.map((userId: string) => addMemberMutation.mutateAsync({ teamId, userId })),
                );
                onMemberIdsChange([]);
              }}
            >
              {t("Add")}
            </Button>
          </Group>

          <Stack gap="xs">
            {members.map((member: any) => (
              <Paper key={member.id} withBorder radius="sm" p="sm">
                <Group gap="sm" wrap="nowrap">
                  <CustomAvatar size={36} name={member.user?.name} avatarUrl={member.user?.avatarUrl} />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>{member.user?.name ?? member.user?.email}</Text>
                    <Text size="xs" c="dimmed">{member.user?.email}</Text>
                  </Box>
                  <Badge variant="light" color={member.role === "owner" ? "blue" : "gray"} size="sm">
                    {t(member.role)}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Paper>

        {/* Groups */}
        <Paper withBorder radius="md" p="lg">
          <Text fw={600} size="sm" mb="xs">{t("Groups")}</Text>
          <Text size="xs" c="dimmed" mb="md">{t("Connect workspace groups to this team.")}</Text>
          <Group align="flex-end" mb="md" wrap="nowrap">
            <Select
              label={t("Group")}
              data={(groups?.items ?? []).map((g: any) => ({ value: g.id, label: g.name }))}
              value={groupId}
              onChange={(v) => onGroupIdChange(v)}
              searchable
              style={{ flex: 1 }}
            />
            <Button
              leftSection={<IconPlus size={14} />}
              disabled={!groupId}
              loading={addGroupMutation.isPending}
              onClick={async () => {
                if (!groupId) return;
                await addGroupMutation.mutateAsync({ teamId, groupId });
                onGroupIdChange(null);
              }}
            >
              {t("Connect")}
            </Button>
          </Group>
          <Stack gap="xs">
            {teamGroups.map((group: any) => (
              <Paper key={group.id} withBorder radius="sm" p="sm">
                <Group justify="space-between" wrap="nowrap">
                  <div>
                    <Text size="sm" fw={600}>{group.name}</Text>
                    <Text size="xs" c="dimmed">{group.description || t("Workspace group")}</Text>
                  </div>
                  <Badge variant="light">{t(group.role)}</Badge>
                </Group>
              </Paper>
            ))}
            {teamGroups.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="md">{t("No groups connected.")}</Text>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}

// ─── Spaces Tab ───────────────────────────────────────────────────────────────

function SpacesTab({ teamId, spaces }: { teamId: string; spaces: any[] }) {
  const { t } = useTranslation();

  return (
    <Stack gap="lg" maw={900}>
      <Group justify="space-between">
        <Text fw={700} size="lg">{t("Team Spaces")}</Text>
        <CreateSpaceModal teamId={teamId} />
      </Group>

      {spaces.length === 0 ? (
        <Paper withBorder radius="md" p="xl" ta="center">
          <ThemeIcon size={48} variant="light" color="teal" radius="xl" mx="auto" mb="md">
            <IconBook size={26} />
          </ThemeIcon>
          <Text fw={600} mb="xs">{t("No spaces yet")}</Text>
          <Text size="sm" c="dimmed" mb="md">{t("Create a space to store team knowledge.")}</Text>
          <CreateSpaceModal teamId={teamId} />
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {spaces.map((space) => (
            <Paper
              key={space.id}
              component={Link}
              to={getSpaceUrl(space.slug)}
              withBorder
              radius="md"
              p="lg"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size={40} variant="light" color="teal" radius="md">
                    <IconBook size={22} />
                  </ThemeIcon>
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700} size="sm" truncate>{space.name}</Text>
                    <Text size="xs" c="dimmed" truncate>{space.description || t("No description")}</Text>
                    <Badge size="xs" variant="light" mt={4}>{space.memberCount ?? 0} members</Badge>
                  </div>
                </Group>
                <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────

function ProjectsTab({ projects }: { projects: ITeamProject[] }) {
  const { t } = useTranslation();

  return (
    <Stack gap="lg" maw={900}>
      <Group justify="space-between">
        <Text fw={700} size="lg">{t("Projects")}</Text>
        <Button
          component={Link}
          to="/projects"
          variant="light"
          leftSection={<IconLayoutKanban size={14} />}
          size="sm"
        >
          {t("Open projects")}
        </Button>
      </Group>

      {projects.length === 0 ? (
        <Paper withBorder radius="md" p="xl" ta="center">
          <ThemeIcon size={48} variant="light" color="blue" radius="xl" mx="auto" mb="md">
            <IconLayoutKanban size={26} />
          </ThemeIcon>
          <Text fw={600} mb="xs">{t("No projects yet")}</Text>
          <Text size="sm" c="dimmed" mb="md">{t("Create a project to start tracking work.")}</Text>
          <Button component={Link} to="/projects" variant="light">
            {t("Go to Projects")}
          </Button>
        </Paper>
      ) : (
        <Stack gap="md">
          {projects.map((project) => {
            const total = Number(project.taskCount ?? 0);
            const done = Number(project.doneTaskCount ?? 0);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <Paper
                key={project.id}
                withBorder
                radius="md"
                p="lg"
                component={Link}
                to="/projects"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Group justify="space-between" wrap="nowrap" mb="md">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={36} variant="light" color="blue" radius="md">
                      <IconFolderFilled size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700} size="sm">{project.name}</Text>
                      {project.description && (
                        <Text size="xs" c="dimmed" truncate style={{ maxWidth: 400 }}>{project.description}</Text>
                      )}
                    </div>
                  </Group>
                  <Group gap="sm">
                    <Badge variant="light" color={pct === 100 ? "green" : "blue"}>
                      {done}/{total} done
                    </Badge>
                    <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                  </Group>
                </Group>
                <Progress value={pct} size="sm" radius="xl" color={pct === 100 ? "green" : "blue"} />
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
