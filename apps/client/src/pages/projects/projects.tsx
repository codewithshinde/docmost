import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Progress,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconFolder,
  IconLayoutKanban,
  IconPlus,
  IconTable,
  IconTrash,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { getAppName } from "@/lib/config";
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useUserProjectsQuery,
} from "@/features/chat/queries/project-query";
import {
  useTeamMembersQuery,
  useTeamsQuery,
} from "@/features/chat/queries/team-query";
import { ProjectTasksView } from "@/features/chat/components/team-projects-panel";
import { ITeamProject, ProjectView } from "@/features/chat/types/chat.types";

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { data: projects, isLoading } = useUserProjectsQuery();
  const { data: teams } = useTeamsQuery();
  const deleteProjectMutation = useDeleteProjectMutation();

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  const activeProject = projects?.find((p) => p.id === activeProjectId);
  const { data: members } = useTeamMembersQuery(activeProject?.teamId);

  useEffect(() => {
    if (!activeProjectId && projects?.length) {
      setActiveProjectId(projects[0].id);
    }
    if (
      activeProjectId &&
      projects &&
      !projects.some((p) => p.id === activeProjectId)
    ) {
      setActiveProjectId(projects[0]?.id ?? null);
    }
  }, [activeProjectId, projects]);

  const filteredProjects = useMemo(() => {
    if (!teamFilter) return projects ?? [];
    return (projects ?? []).filter((p) => p.teamId === teamFilter);
  }, [projects, teamFilter]);

  const teamOptions = useMemo(
    () => (teams ?? []).map((team) => ({ value: team.id, label: team.name })),
    [teams],
  );

  const confirmDelete = (project: ITeamProject) => {
    modals.openConfirmModal({
      title: t("Delete project"),
      children: (
        <Text size="sm">
          {t("Delete {{name}} and all of its tasks?", { name: project.name })}
        </Text>
      ),
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () =>
        deleteProjectMutation.mutate({
          teamId: project.teamId,
          projectId: project.id,
        }),
    });
  };

  return (
    <Box style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Helmet>
        <title>
          {t("Projects")} - {getAppName()}
        </title>
      </Helmet>

      {/* Left Sidebar */}
      <Box
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: "1px solid var(--mantine-color-default-border)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Box
          p="md"
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm">
              {t("Projects")}
            </Text>
            <Tooltip label={t("New project")} withArrow>
              <ActionIcon
                size="sm"
                variant="light"
                onClick={() => setCreateModalOpen(true)}
              >
                <IconPlus size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          {teamOptions.length > 1 && (
            <Select
              size="xs"
              placeholder={t("All teams")}
              clearable
              data={teamOptions}
              value={teamFilter}
              onChange={setTeamFilter}
            />
          )}
        </Box>

        <ScrollArea flex={1} p="xs">
          {isLoading && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              {t("Loading...")}
            </Text>
          )}
          {!isLoading && filteredProjects.length === 0 && (
            <Stack align="center" gap="xs" py="xl">
              <ThemeIcon size={40} variant="light" color="gray" radius="xl">
                <IconFolder size={22} />
              </ThemeIcon>
              <Text size="sm" c="dimmed" ta="center">
                {t("No projects yet")}
              </Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={12} />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t("Create project")}
              </Button>
            </Stack>
          )}
          <Stack gap="xs">
            {filteredProjects.map((project) => (
              <ProjectSidebarItem
                key={project.id}
                project={project}
                active={project.id === activeProjectId}
                onSelect={() => setActiveProjectId(project.id)}
                onDelete={() => confirmDelete(project)}
              />
            ))}
          </Stack>
        </ScrollArea>
      </Box>

      {/* Main content */}
      <Box
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeProject ? (
          <ScrollArea h="100%" p="md">
            <Stack gap="md">
              <ProjectTasksView
                teamId={activeProject.teamId}
                project={activeProject}
                members={members}
              />
            </Stack>
          </ScrollArea>
        ) : (
          <Stack align="center" justify="center" h="100%" gap="md">
            <ThemeIcon size={64} variant="light" color="blue" radius="xl">
              <IconLayoutKanban size={36} />
            </ThemeIcon>
            <div style={{ textAlign: "center" }}>
              <Text fw={700} size="xl" mb={4}>
                {t("Select a project")}
              </Text>
              <Text size="sm" c="dimmed">
                {t("Choose a project from the sidebar, or create a new one.")}
              </Text>
            </div>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateModalOpen(true)}
            >
              {t("Create project")}
            </Button>
          </Stack>
        )}
      </Box>

      <CreateProjectModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        teamOptions={teamOptions}
        onCreated={(projectId) => {
          setCreateModalOpen(false);
          setActiveProjectId(projectId);
        }}
      />
    </Box>
  );
}

function ProjectSidebarItem({
  project,
  active,
  onSelect,
  onDelete,
}: {
  project: ITeamProject & { teamName?: string };
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const done = Number(project.doneTaskCount ?? 0);
  const total = Number(project.taskCount ?? 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Paper
      withBorder
      radius="sm"
      p="xs"
      onClick={onSelect}
      style={{
        cursor: "pointer",
        borderColor: active ? "var(--mantine-color-blue-5)" : undefined,
        background: active ? "var(--mantine-color-blue-0)" : undefined,
      }}
    >
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <div style={{ minWidth: 0 }}>
          <Text size="xs" fw={600} truncate>
            {project.name}
          </Text>
          {project.teamName && (
            <Text size="xs" c="dimmed" truncate>
              {project.teamName}
            </Text>
          )}
        </div>
        <Group gap={4} wrap="nowrap">
          <Badge size="xs" variant="light" radius="sm">
            {done}/{total}
          </Badge>
          <ActionIcon
            size="xs"
            variant="subtle"
            color="red"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <IconTrash size={10} />
          </ActionIcon>
        </Group>
      </Group>
      <Progress value={pct} size={3} color={active ? "blue" : "gray"} />
    </Paper>
  );
}

function CreateProjectModal({
  opened,
  onClose,
  teamOptions,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  teamOptions: { value: string; label: string }[];
  onCreated: (projectId: string) => void;
}) {
  const { t } = useTranslation();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [view, setView] = useState<ProjectView>("kanban");
  const createMutation = useCreateProjectMutation();

  useEffect(() => {
    if (!teamId && teamOptions.length === 1) {
      setTeamId(teamOptions[0].value);
    }
  }, [teamId, teamOptions]);

  const handleCreate = async () => {
    if (!teamId || !name.trim()) return;
    const project = await createMutation.mutateAsync({
      teamId,
      name: name.trim(),
      description: description.trim() || undefined,
      view,
    });
    setName("");
    setDescription("");
    setView("kanban");
    onCreated(project.id);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600} size="sm">
          {t("New project")}
        </Text>
      }
      size="md"
    >
      <Stack gap="sm">
        {teamOptions.length > 1 && (
          <Select
            label={t("Team")}
            data={teamOptions}
            value={teamId}
            onChange={setTeamId}
            placeholder={t("Select team")}
            required
            searchable
          />
        )}
        {teamOptions.length === 1 && (
          <Text size="sm" c="dimmed">
            {t("Team")}: <strong>{teamOptions[0]?.label}</strong>
          </Text>
        )}
        <TextInput
          label={t("Project name")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t("e.g. Launch plan")}
          required
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Textarea
          label={t("Description")}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={2}
          autosize
          placeholder={t("Optional description")}
        />
        <Select
          label={t("Default view")}
          value={view}
          onChange={(v) => setView((v as ProjectView) ?? "kanban")}
          data={[
            { value: "kanban", label: t("Board") },
            { value: "table", label: t("Table") },
          ]}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!teamId || !name.trim()}
            loading={createMutation.isPending}
            leftSection={<IconPlus size={14} />}
          >
            {t("Create project")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
