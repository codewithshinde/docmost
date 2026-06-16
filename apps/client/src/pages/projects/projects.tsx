import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  ColorSwatch,
  Divider,
  Group,
  Modal,
  MultiSelect,
  Paper,
  Progress,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCircleFilled,
  IconFolderFilled,
  IconLayoutKanban,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getAppName } from "@/lib/config";
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useUpdateProjectMutation,
  useUserProjectsQuery,
} from "@/features/chat/queries/project-query";
import {
  useTeamMembersQuery,
  useTeamsQuery,
} from "@/features/chat/queries/team-query";
import { ProjectTasksView } from "@/features/chat/components/team-projects-panel";
import {
  DEFAULT_PROJECT_STATUSES,
  IProjectStatus,
  ISprint,
  ITeamProject,
  ProjectView,
} from "@/features/chat/types/chat.types";

const STATUS_COLORS = [
  "gray",
  "blue",
  "red",
  "green",
  "yellow",
  "orange",
  "violet",
  "teal",
  "pink",
  "cyan",
];

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: projects, isLoading } = useUserProjectsQuery();
  const { data: teams } = useTeamsQuery();
  const deleteProjectMutation = useDeleteProjectMutation();

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
    let result = projects ?? [];
    if (teamFilter) result = result.filter((p) => p.teamId === teamFilter);
    if (searchQuery.trim())
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return result;
  }, [projects, teamFilter, searchQuery]);

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
          width: sidebarCollapsed ? 48 : 260,
          flexShrink: 0,
          borderRight: "1px solid var(--mantine-color-default-border)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          transition: "width 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Sidebar header */}
        <Box
          px={sidebarCollapsed ? "xs" : "md"}
          py="sm"
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
            flexShrink: 0,
          }}
        >
          {sidebarCollapsed ? (
            <Stack gap="xs" align="center">
              <Tooltip label={t("Expand sidebar")} position="right" withArrow>
                <ActionIcon
                  variant="subtle"
                  onClick={() => setSidebarCollapsed(false)}
                  size="sm"
                >
                  <IconChevronRight size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t("New project")} position="right" withArrow>
                <ActionIcon
                  size="sm"
                  variant="light"
                  color="blue"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Tooltip>
            </Stack>
          ) : (
            <>
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="sm">
                  {t("Projects")}
                </Text>
                <Group gap={4}>
                  <Tooltip label={t("New project")} withArrow>
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="blue"
                      onClick={() => setCreateModalOpen(true)}
                    >
                      <IconPlus size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t("Collapse")} withArrow>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => setSidebarCollapsed(true)}
                    >
                      <IconChevronLeft size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
              <TextInput
                size="xs"
                placeholder={t("Search projects...")}
                leftSection={<IconSearch size={12} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                mb={teamOptions.length > 1 ? "xs" : 0}
                rightSection={
                  searchQuery ? (
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      onClick={() => setSearchQuery("")}
                    >
                      <IconX size={10} />
                    </ActionIcon>
                  ) : null
                }
              />
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
            </>
          )}
        </Box>

        {/* Project list */}
        {!sidebarCollapsed && (
          <ScrollArea flex={1} py="xs">
            {isLoading && (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {t("Loading...")}
              </Text>
            )}
            {!isLoading && filteredProjects.length === 0 && (
              <Stack align="center" gap="xs" py="xl" px="md">
                <ThemeIcon size={40} variant="light" color="gray" radius="xl">
                  <IconFolderFilled size={22} />
                </ThemeIcon>
                <Text size="sm" c="dimmed" ta="center">
                  {searchQuery
                    ? t("No projects match your search")
                    : t("No projects yet")}
                </Text>
                {!searchQuery && (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => setCreateModalOpen(true)}
                  >
                    {t("Create project")}
                  </Button>
                )}
              </Stack>
            )}
            <Stack gap={2} px="xs">
              {filteredProjects.map((project) => (
                <ProjectSidebarItem
                  key={project.id}
                  project={project}
                  active={project.id === activeProjectId}
                  onSelect={() => setActiveProjectId(project.id)}
                  onDelete={() => confirmDelete(project)}
                  onSettings={() => {
                    setActiveProjectId(project.id);
                    setSettingsOpen(true);
                  }}
                />
              ))}
            </Stack>
          </ScrollArea>
        )}

        {/* Collapsed icons for active projects */}
        {sidebarCollapsed && (
          <ScrollArea flex={1} py="xs">
            <Stack gap={4} align="center" px={4}>
              {filteredProjects.map((project) => (
                <Tooltip
                  key={project.id}
                  label={project.name}
                  position="right"
                  withArrow
                >
                  <UnstyledButton
                    onClick={() => setActiveProjectId(project.id)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        project.id === activeProjectId
                          ? "var(--mantine-color-blue-1)"
                          : "transparent",
                      border:
                        project.id === activeProjectId
                          ? "1px solid var(--mantine-color-blue-4)"
                          : "1px solid transparent",
                    }}
                  >
                    <Text size="xs" fw={700} c={project.id === activeProjectId ? "blue" : "dimmed"}>
                      {project.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </UnstyledButton>
                </Tooltip>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Box>

      {/* Main content */}
      <Box
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {activeProject ? (
          <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Project header */}
            <Box
              px="lg"
              py="sm"
              style={{
                borderBottom: "1px solid var(--mantine-color-default-border)",
                flexShrink: 0,
                background: "var(--mantine-color-body)",
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <ThemeIcon
                    size={36}
                    radius="md"
                    variant="light"
                    color="blue"
                  >
                    <IconFolderFilled size={20} />
                  </ThemeIcon>
                  <Box style={{ minWidth: 0 }}>
                    <Group gap={6} wrap="nowrap">
                      <Text fw={700} size="md" truncate>
                        {activeProject.name}
                      </Text>
                      {activeProject.teamName && (
                        <Badge size="xs" variant="outline" radius="sm">
                          {activeProject.teamName}
                        </Badge>
                      )}
                    </Group>
                    {activeProject.description && (
                      <Text size="xs" c="dimmed" truncate>
                        {activeProject.description}
                      </Text>
                    )}
                  </Box>
                </Group>
                <Tooltip label={t("Project settings")} withArrow>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <IconSettings size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Box>

            {/* Project content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
              <ProjectTasksView
                teamId={activeProject.teamId}
                project={activeProject}
                members={members}
              />
            </Box>
          </Box>
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

      {activeProject && (
        <ProjectSettingsModal
          project={activeProject}
          opened={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onDeleted={() => {
            setSettingsOpen(false);
            confirmDelete(activeProject);
          }}
        />
      )}
    </Box>
  );
}

// ─── Sidebar Item ─────────────────────────────────────────────────────────────

function ProjectSidebarItem({
  project,
  active,
  onSelect,
  onDelete,
  onSettings,
}: {
  project: ITeamProject & { teamName?: string };
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSettings: () => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const done = Number(project.doneTaskCount ?? 0);
  const total = Number(project.taskCount ?? 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <UnstyledButton
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 6,
        padding: "6px 8px",
        background: active
          ? "var(--mantine-color-blue-0)"
          : hovered
            ? "var(--mantine-color-default-hover)"
            : "transparent",
        border: active
          ? "1px solid var(--mantine-color-blue-3)"
          : "1px solid transparent",
        width: "100%",
      }}
    >
      <Group gap="xs" wrap="nowrap" mb={4}>
        <ThemeIcon size={22} variant="light" color="blue" radius="sm">
          <IconFolderFilled size={12} />
        </ThemeIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={600} truncate>
            {project.name}
          </Text>
          {project.teamName && (
            <Text size="xs" c="dimmed" truncate style={{ fontSize: 10 }}>
              {project.teamName}
            </Text>
          )}
        </Box>
        {(hovered || active) && (
          <Group gap={2} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
            <Tooltip label={t("Settings")} withArrow>
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettings();
                }}
              >
                <IconSettings size={10} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("Delete")} withArrow>
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
            </Tooltip>
          </Group>
        )}
      </Group>
      <Group gap="xs" wrap="nowrap">
        <Progress
          value={pct}
          size={3}
          color={active ? "blue" : "gray"}
          style={{ flex: 1 }}
        />
        <Text size="xs" c="dimmed" style={{ fontSize: 10, flexShrink: 0 }}>
          {done}/{total}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

// ─── Create Project Modal ─────────────────────────────────────────────────────

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
        <Text fw={700} size="sm">
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

// ─── Project Settings Modal ───────────────────────────────────────────────────

function ProjectSettingsModal({
  project,
  opened,
  onClose,
  onDeleted,
}: {
  project: ITeamProject;
  opened: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const updateMutation = useUpdateProjectMutation();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [activeTab, setActiveTab] = useState<
    "general" | "statuses" | "sprints" | "tags"
  >("general");

  const [statuses, setStatuses] = useState<IProjectStatus[]>(
    project.statuses?.length ? project.statuses : DEFAULT_PROJECT_STATUSES,
  );
  const [sprints, setSprints] = useState<ISprint[]>(project.sprints ?? []);
  const [projectTags, setProjectTags] = useState<string[]>(
    project.projectTags ?? [],
  );

  // Sprint form
  const [sprintName, setSprintName] = useState("");
  const [sprintStart, setSprintStart] = useState("");
  const [sprintEnd, setSprintEnd] = useState("");

  // Status form
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("blue");
  const [newStatusIsDone, setNewStatusIsDone] = useState(false);

  useEffect(() => {
    if (opened) {
      setName(project.name);
      setDescription(project.description ?? "");
      setStatuses(
        project.statuses?.length ? project.statuses : DEFAULT_PROJECT_STATUSES,
      );
      setSprints(project.sprints ?? []);
      setProjectTags(project.projectTags ?? []);
    }
  }, [opened, project]);

  const handleSaveGeneral = () => {
    updateMutation.mutate({
      teamId: project.teamId,
      projectId: project.id,
      name: name.trim() || project.name,
      description: description.trim() || undefined,
    });
  };

  const handleSaveStatuses = () => {
    updateMutation.mutate({
      teamId: project.teamId,
      projectId: project.id,
      statuses,
    });
  };

  const handleSaveSprints = () => {
    updateMutation.mutate({
      teamId: project.teamId,
      projectId: project.id,
      sprints,
    });
  };

  const handleSaveTags = () => {
    updateMutation.mutate({
      teamId: project.teamId,
      projectId: project.id,
      projectTags,
    });
  };

  const addSprint = () => {
    if (!sprintName.trim()) return;
    const newSprint: ISprint = {
      id: `sprint_${Date.now()}`,
      name: sprintName.trim(),
      startDate: sprintStart || undefined,
      endDate: sprintEnd || undefined,
      active: false,
    };
    setSprints((prev) => [...prev, newSprint]);
    setSprintName("");
    setSprintStart("");
    setSprintEnd("");
  };

  const removeSprint = (id: string) => {
    setSprints((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleSprintActive = (id: string) => {
    setSprints((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
    );
  };

  const addStatus = () => {
    if (!newStatusLabel.trim()) return;
    const newStatus: IProjectStatus = {
      id: `status_${Date.now()}`,
      label: newStatusLabel.trim(),
      color: newStatusColor,
      isDone: newStatusIsDone,
    };
    setStatuses((prev) => [...prev, newStatus]);
    setNewStatusLabel("");
    setNewStatusColor("blue");
    setNewStatusIsDone(false);
  };

  const removeStatus = (id: string) => {
    setStatuses((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStatusLabel = (id: string, label: string) => {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
  };

  const updateStatusColor = (id: string, color: string) => {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)));
  };

  const updateStatusIsDone = (id: string, isDone: boolean) => {
    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isDone } : s)),
    );
  };

  const TABS = [
    { key: "general", label: t("General") },
    { key: "statuses", label: t("Statuses") },
    { key: "sprints", label: t("Sprints") },
    { key: "tags", label: t("Tags") },
  ] as const;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSettings size={16} />
          <Text fw={700} size="sm">
            {t("Project settings")} — {project.name}
          </Text>
        </Group>
      }
      size="lg"
    >
      {/* Tab navigation */}
      <Group gap={0} mb="md" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        {TABS.map((tab) => (
          <UnstyledButton
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            px="sm"
            py="xs"
            style={{
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              borderBottom:
                activeTab === tab.key
                  ? "2px solid var(--mantine-color-blue-5)"
                  : "2px solid transparent",
              color:
                activeTab === tab.key
                  ? "var(--mantine-color-blue-6)"
                  : "var(--mantine-color-dimmed)",
            }}
          >
            {tab.label}
          </UnstyledButton>
        ))}
      </Group>

      {/* General */}
      {activeTab === "general" && (
        <Stack gap="sm">
          <TextInput
            label={t("Project name")}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
          <Textarea
            label={t("Description")}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={3}
            autosize
            placeholder={t("Describe this project...")}
          />
          <Group justify="space-between" mt="xs">
            <Button
              variant="subtle"
              color="red"
              size="xs"
              leftSection={<IconTrash size={12} />}
              onClick={onDeleted}
            >
              {t("Delete project")}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveGeneral}
              loading={updateMutation.isPending}
            >
              {t("Save")}
            </Button>
          </Group>
        </Stack>
      )}

      {/* Statuses */}
      {activeTab === "statuses" && (
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            {t(
              "Customize the columns shown in the Kanban board. Tasks will use these statuses.",
            )}
          </Text>

          <Stack gap="xs">
            {statuses.map((status) => (
              <Paper key={status.id} withBorder radius="sm" p="xs">
                <Group gap="xs" wrap="nowrap">
                  <Select
                    size="xs"
                    w={100}
                    data={STATUS_COLORS.map((c) => ({ value: c, label: c }))}
                    value={status.color}
                    onChange={(v) => updateStatusColor(status.id, v ?? "gray")}
                    leftSection={
                      <ColorSwatch
                        color={`var(--mantine-color-${status.color}-5)`}
                        size={12}
                      />
                    }
                  />
                  <TextInput
                    size="xs"
                    value={status.label}
                    onChange={(e) =>
                      updateStatusLabel(status.id, e.currentTarget.value)
                    }
                    style={{ flex: 1 }}
                  />
                  <Tooltip label={t("Mark as done")} withArrow>
                    <Switch
                      size="xs"
                      checked={status.isDone}
                      onChange={(e) =>
                        updateStatusIsDone(
                          status.id,
                          e.currentTarget.checked,
                        )
                      }
                      label={<Text size="xs">{t("Done")}</Text>}
                    />
                  </Tooltip>
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => removeStatus(status.id)}
                    disabled={statuses.length <= 1}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>

          <Divider label={t("Add status")} labelPosition="left" />

          <Group gap="xs" wrap="nowrap">
            <Select
              size="xs"
              w={100}
              data={STATUS_COLORS.map((c) => ({ value: c, label: c }))}
              value={newStatusColor}
              onChange={(v) => setNewStatusColor(v ?? "blue")}
              leftSection={
                <ColorSwatch
                  color={`var(--mantine-color-${newStatusColor}-5)`}
                  size={12}
                />
              }
            />
            <TextInput
              size="xs"
              placeholder={t("Status label")}
              value={newStatusLabel}
              onChange={(e) => setNewStatusLabel(e.currentTarget.value)}
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") addStatus();
              }}
            />
            <Switch
              size="xs"
              checked={newStatusIsDone}
              onChange={(e) => setNewStatusIsDone(e.currentTarget.checked)}
              label={<Text size="xs">{t("Done")}</Text>}
            />
            <Button
              size="xs"
              leftSection={<IconPlus size={12} />}
              onClick={addStatus}
              disabled={!newStatusLabel.trim()}
            >
              {t("Add")}
            </Button>
          </Group>

          <Group justify="flex-end" mt="xs">
            <Button
              size="sm"
              onClick={handleSaveStatuses}
              loading={updateMutation.isPending}
            >
              {t("Save statuses")}
            </Button>
          </Group>
        </Stack>
      )}

      {/* Sprints */}
      {activeTab === "sprints" && (
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            {t(
              "Create sprints with start and end dates to organize your work into time-boxed iterations.",
            )}
          </Text>

          {/* Add sprint form */}
          <Paper withBorder radius="sm" p="sm">
            <Text size="xs" fw={600} mb="xs">
              {t("New sprint")}
            </Text>
            <Stack gap="xs">
              <TextInput
                size="xs"
                label={t("Sprint name")}
                placeholder={t("e.g. Sprint 1")}
                value={sprintName}
                onChange={(e) => setSprintName(e.currentTarget.value)}
              />
              <Group grow gap="xs">
                <TextInput
                  size="xs"
                  label={t("Start date")}
                  type="date"
                  value={sprintStart}
                  onChange={(e) => setSprintStart(e.currentTarget.value)}
                />
                <TextInput
                  size="xs"
                  label={t("End date")}
                  type="date"
                  value={sprintEnd}
                  onChange={(e) => setSprintEnd(e.currentTarget.value)}
                />
              </Group>
              <Group justify="flex-end">
                <Button
                  size="xs"
                  leftSection={<IconPlus size={12} />}
                  onClick={addSprint}
                  disabled={!sprintName.trim()}
                >
                  {t("Create sprint")}
                </Button>
              </Group>
            </Stack>
          </Paper>

          <Divider label={t("Sprints")} labelPosition="left" />

          {sprints.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="sm">
              {t("No sprints created yet.")}
            </Text>
          )}

          <Stack gap="xs">
            {sprints.map((sprint) => (
              <Paper key={sprint.id} withBorder radius="sm" p="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ minWidth: 0 }}>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={600} truncate>
                        {sprint.name}
                      </Text>
                      {sprint.active && (
                        <Badge size="xs" color="green" variant="light">
                          {t("Active")}
                        </Badge>
                      )}
                    </Group>
                    {(sprint.startDate || sprint.endDate) && (
                      <Text size="xs" c="dimmed">
                        {sprint.startDate && new Date(sprint.startDate).toLocaleDateString()}
                        {sprint.startDate && sprint.endDate && " → "}
                        {sprint.endDate && new Date(sprint.endDate).toLocaleDateString()}
                      </Text>
                    )}
                  </Box>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip
                      label={sprint.active ? t("Deactivate") : t("Set active")}
                      withArrow
                    >
                      <Switch
                        size="xs"
                        checked={sprint.active ?? false}
                        onChange={() => toggleSprintActive(sprint.id)}
                      />
                    </Tooltip>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => removeSprint(sprint.id)}
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>

          <Group justify="flex-end" mt="xs">
            <Button
              size="sm"
              onClick={handleSaveSprints}
              loading={updateMutation.isPending}
            >
              {t("Save sprints")}
            </Button>
          </Group>
        </Stack>
      )}

      {/* Tags */}
      {activeTab === "tags" && (
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            {t(
              "Define tags that team members can apply to tasks in this project.",
            )}
          </Text>
          <MultiSelect
            label={t("Project tags")}
            data={projectTags}
            value={projectTags}
            onChange={setProjectTags}
            searchable
            clearable
            comboboxProps={{ withinPortal: true }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLInputElement;
                const value = target.value.trim();
                if (value && !projectTags.includes(value)) {
                  setProjectTags([...projectTags, value]);
                }
              }
            }}
            placeholder={t("Type and press Enter to add tag")}
            leftSection={<IconTag size={14} />}
          />
          <Group justify="flex-end" mt="xs">
            <Button
              size="sm"
              onClick={handleSaveTags}
              loading={updateMutation.isPending}
            >
              {t("Save tags")}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
