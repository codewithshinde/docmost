import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Popover,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowUp,
  IconBookmark,
  IconBolt,
  IconBug,
  IconCalendar,
  IconCheck,
  IconCheckbox,
  IconChevronDown,
  IconChevronRight,
  IconCircle,
  IconClock,
  IconDots,
  IconFile,
  IconFilter,
  IconFolderPlus,
  IconLayoutKanban,
  IconPaperclip,
  IconPlus,
  IconTable,
  IconTag,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { getFileUrl } from "@/lib/config";
import { formatBytes } from "@/lib/utils";
import {
  DEFAULT_PROJECT_STATUSES,
  IProjectStatus,
  ISprint,
  ITaskAttachment,
  ITeamMember,
  ITeamProject,
  ITeamProjectTask,
  ITeamProjectTaskComment,
  ProjectIssueType,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectView,
} from "../types/chat.types";
import {
  useCreateProjectMutation,
  useCreateProjectTaskCommentMutation,
  useCreateProjectTaskMutation,
  useDeleteProjectMutation,
  useDeleteProjectTaskMutation,
  useProjectTaskCommentsQuery,
  useProjectTasksQuery,
  useTeamProjectsQuery,
  useUpdateProjectMutation,
  useUpdateProjectTaskMutation,
  useUploadTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
} from "../queries/project-query";
import { TaskDescriptionEditor } from "./task-description-editor";

// ─── Constants ────────────────────────────────────────────────────────────────

export const priorityConfig: Record<
  ProjectTaskPriority,
  { label: string; color: string }
> = {
  low: { label: "Low", color: "gray" },
  medium: { label: "Medium", color: "yellow" },
  high: { label: "High", color: "orange" },
  urgent: { label: "Urgent", color: "red" },
};

export const issueTypeConfig: Record<
  ProjectIssueType,
  { label: string; color: string; icon: typeof IconCheckbox }
> = {
  task: { label: "Task", color: "teal", icon: IconCheckbox },
  bug: { label: "Bug", color: "red", icon: IconBug },
  story: { label: "Story", color: "blue", icon: IconBookmark },
  epic: { label: "Epic", color: "violet", icon: IconBolt },
};

export const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof IconCircle }
> = {
  todo: { label: "To Do", color: "gray", icon: IconCircle },
  in_progress: { label: "In Progress", color: "blue", icon: IconChevronRight },
  blocked: { label: "Blocked", color: "red", icon: IconAlertCircle },
  done: { label: "Done", color: "green", icon: IconCheck },
};

const priorityOptions: { value: ProjectTaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const issueTypeOptions: { value: ProjectIssueType; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "story", label: "Story" },
  { value: "epic", label: "Epic" },
];

const viewOptions: { value: ProjectView; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "kanban", label: "Board" },
  { value: "calendar", label: "Calendar" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isPastDue(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function getProjectStatuses(project: ITeamProject): IProjectStatus[] {
  if (project.statuses && project.statuses.length > 0) {
    return project.statuses;
  }
  return DEFAULT_PROJECT_STATUSES;
}

function getStatusCfg(
  statusId: string,
  projectStatuses: IProjectStatus[],
): IProjectStatus {
  return (
    projectStatuses.find((s) => s.id === statusId) ?? {
      id: statusId,
      label: statusId,
      color: "gray",
      isDone: false,
    }
  );
}

// ─── Panel (team hub usage) ───────────────────────────────────────────────────

interface TeamProjectsPanelProps {
  teamId: string;
  members?: ITeamMember[];
}

export function TeamProjectsPanel({ teamId, members }: TeamProjectsPanelProps) {
  const { t } = useTranslation();
  const { data: projects } = useTeamProjectsQuery(teamId);
  const deleteProjectMutation = useDeleteProjectMutation();

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
        deleteProjectMutation.mutate({ teamId, projectId: project.id }),
    });
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" mb={4}>
        <Box>
          <Text fw={650}>{t("Projects")}</Text>
          <Text size="xs" c="dimmed">
            {t("Track tasks, owners, and status.")}
          </Text>
        </Box>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconFolderPlus size={14} />}
          component={Link}
          to="/projects"
        >
          {t("All projects")}
        </Button>
      </Group>

      {(!projects || projects.length === 0) && (
        <Text size="sm" c="dimmed">
          {t("No projects yet.")}
        </Text>
      )}

      <Stack gap="xs">
        {(projects ?? []).map((project) => {
          const done = Number(project.doneTaskCount ?? 0);
          const total = Number(project.taskCount ?? 0);
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Paper
              key={project.id}
              withBorder
              radius="sm"
              p="sm"
              component={Link}
              to="/projects"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Group justify="space-between" wrap="nowrap" mb={6}>
                <Text size="sm" fw={600} truncate>
                  {project.name}
                </Text>
                <Group gap={4} wrap="nowrap">
                  <Badge variant="light" size="xs">
                    {done}/{total}
                  </Badge>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      confirmDelete(project);
                    }}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              </Group>
              {project.description && (
                <Text size="xs" c="dimmed" mb={6} truncate>
                  {project.description}
                </Text>
              )}
              <Progress value={pct} size="xs" color="blue" />
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}

// ─── Main project tasks view ──────────────────────────────────────────────────

export interface ProjectTasksViewProps {
  teamId: string;
  project: ITeamProject;
  members?: ITeamMember[];
  onOpenTask?: (taskId: string) => void;
}

export function ProjectTasksView({
  teamId,
  project,
  members,
  onOpenTask,
}: ProjectTasksViewProps) {
  const { t } = useTranslation();
  const { data: tasks = [] } = useProjectTasksQuery(project.id);
  const updateProjectMutation = useUpdateProjectMutation();
  const updateTaskMutation = useUpdateProjectTaskMutation();
  const deleteTaskMutation = useDeleteProjectTaskMutation();

  const [view, setView] = useState<ProjectView>(project.view ?? "kanban");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterSprint, setFilterSprint] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const projectStatuses = useMemo(
    () => getProjectStatuses(project),
    [project],
  );
  const projectSprints = useMemo(() => project.sprints ?? [], [project]);
  const projectTags = useMemo(() => project.projectTags ?? [], [project]);

  const memberOptions = useMemo(
    () =>
      members?.map((m) => ({
        value: m.userId,
        label: m.user?.name ?? m.user?.email ?? "Unknown",
      })) ?? [],
    [members],
  );

  const sprintOptions = useMemo(() => {
    const fromTasks = [
      ...new Set(tasks.map((t) => t.sprint).filter(Boolean) as string[]),
    ];
    const fromProject = projectSprints.map((s) => s.name);
    const all = [...new Set([...fromProject, ...fromTasks])];
    return all.map((s) => ({ value: s, label: s }));
  }, [tasks, projectSprints]);

  const statusOptions = useMemo(
    () => projectStatuses.map((s) => ({ value: s.id, label: s.label })),
    [projectStatuses],
  );

  const filteredTasks = useMemo(() => {
    let result = showSubtasks ? tasks : tasks.filter((t) => !t.parentTaskId);
    if (filterPriority)
      result = result.filter((t) => t.priority === filterPriority);
    if (filterType) result = result.filter((t) => t.issueType === filterType);
    if (filterSprint)
      result = result.filter((t) => t.sprint === filterSprint);
    if (filterAssignee)
      result = result.filter((t) => t.assigneeId === filterAssignee);
    return result;
  }, [tasks, showSubtasks, filterPriority, filterType, filterSprint, filterAssignee]);

  const handleChangeView = (newView: ProjectView) => {
    setView(newView);
    updateProjectMutation.mutate({
      teamId,
      projectId: project.id,
      view: newView,
    });
  };

  const handleUpdateTask = (
    task: ITeamProjectTask,
    data: Partial<ITeamProjectTask>,
  ) => {
    updateTaskMutation.mutate({
      teamId,
      projectId: project.id,
      taskId: task.id,
      ...data,
    });
  };

  const handleDeleteTask = (task: ITeamProjectTask) => {
    modals.openConfirmModal({
      title: t("Delete task"),
      children: <Text size="sm">{t("Delete this task permanently?")}</Text>,
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () =>
        deleteTaskMutation.mutate({
          teamId,
          projectId: project.id,
          taskId: task.id,
        }),
    });
  };

  const handleDrop = (statusId: string) => {
    const task = tasks.find((t) => t.id === dragTaskId);
    if (task && task.status !== statusId) {
      handleUpdateTask(task, { status: statusId });
    }
    setDragTaskId(null);
  };

  const hasFilters = !!(
    filterPriority ||
    filterType ||
    filterSprint ||
    filterAssignee ||
    showSubtasks
  );

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Toolbar — single compact row */}
      <Box
        px="md"
        py="xs"
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
          flexShrink: 0,
          background: "var(--mantine-color-body)",
        }}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs">
          {/* Left: create + filter */}
          <Group gap="xs" wrap="nowrap">
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => setCreateModalOpen(true)}
            >
              {t("Create issue")}
            </Button>

            <Popover
              position="bottom-start"
              withinPortal
              shadow="md"
              withArrow
            >
              <Popover.Target>
                <Button
                  size="xs"
                  variant={hasFilters ? "light" : "subtle"}
                  color={hasFilters ? "blue" : "gray"}
                  leftSection={<IconFilter size={12} />}
                  rightSection={
                    hasFilters ? (
                      <Badge size="xs" circle variant="filled" color="blue">
                        {[filterPriority, filterType, filterSprint, filterAssignee, showSubtasks ? "subtasks" : null].filter(Boolean).length}
                      </Badge>
                    ) : null
                  }
                >
                  {t("Filter")}
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs" w={220}>
                  <Select
                    size="xs"
                    label={t("Priority")}
                    placeholder={t("Any")}
                    clearable
                    data={priorityOptions.map((o) => ({
                      value: o.value,
                      label: t(o.label),
                    }))}
                    value={filterPriority}
                    onChange={(v) => setFilterPriority(v as string | null)}
                  />
                  <Select
                    size="xs"
                    label={t("Type")}
                    placeholder={t("Any")}
                    clearable
                    data={issueTypeOptions.map((o) => ({
                      value: o.value,
                      label: t(o.label),
                    }))}
                    value={filterType}
                    onChange={(v) => setFilterType(v as string | null)}
                  />
                  {sprintOptions.length > 0 && (
                    <Select
                      size="xs"
                      label={t("Sprint")}
                      placeholder={t("Any")}
                      clearable
                      data={sprintOptions}
                      value={filterSprint}
                      onChange={(v) => setFilterSprint(v as string | null)}
                    />
                  )}
                  {members && members.length > 0 && (
                    <Select
                      size="xs"
                      label={t("Assignee")}
                      placeholder={t("Anyone")}
                      clearable
                      data={memberOptions}
                      value={filterAssignee}
                      onChange={(v) => setFilterAssignee(v as string | null)}
                    />
                  )}
                  <Switch
                    size="xs"
                    label={t("Show sub-tasks")}
                    checked={showSubtasks}
                    onChange={(event) => setShowSubtasks(event.currentTarget.checked)}
                  />
                  {hasFilters && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        setFilterPriority(null);
                        setFilterType(null);
                        setFilterSprint(null);
                        setFilterAssignee(null);
                        setShowSubtasks(false);
                      }}
                    >
                      {t("Clear filters")}
                    </Button>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>

            <Text size="xs" c="dimmed">
              {filteredTasks.length}{" "}
              {t("issue", { count: filteredTasks.length })}
              {!showSubtasks && tasks.some((task) => task.parentTaskId) && (
                <Text span c="dimmed"> · {tasks.filter((task) => task.parentTaskId).length} {t("sub-tasks hidden")}</Text>
              )}
            </Text>
          </Group>

          {/* Right: view toggles */}
          <Group gap={4} wrap="nowrap">
            {viewOptions.map((opt) => (
              <Tooltip key={opt.value} label={t(opt.label)} withArrow>
                <ActionIcon
                  size="sm"
                  variant={view === opt.value ? "filled" : "subtle"}
                  color={view === opt.value ? "blue" : "gray"}
                  onClick={() => handleChangeView(opt.value)}
                >
                  {opt.value === "kanban" ? (
                    <IconLayoutKanban size={14} />
                  ) : (
                    <IconTable size={14} />
                  )}
                </ActionIcon>
              </Tooltip>
            ))}
          </Group>
        </Group>
      </Box>

      {/* Board / Table */}
      <Box style={{ flex: 1, overflow: "hidden" }}>
        {view === "kanban" ? (
          <KanbanBoard
            tasks={filteredTasks}
            projectStatuses={projectStatuses}
            onUpdateStatus={(task, statusId) =>
              handleUpdateTask(task, { status: statusId })
            }
            onOpenTask={(taskId) => onOpenTask?.(taskId)}
            onDeleteTask={handleDeleteTask}
            onDragStart={setDragTaskId}
            onDrop={handleDrop}
          />
        ) : (
          <Box style={{ height: "100%", overflowY: "auto" }}>
            <TaskTable
              tasks={
                view === "calendar"
                  ? [...filteredTasks].sort((a, b) =>
                      (a.dueAt ?? "").localeCompare(b.dueAt ?? ""),
                    )
                  : filteredTasks
              }
              memberOptions={memberOptions}
              projectStatuses={projectStatuses}
              onUpdateTask={handleUpdateTask}
              onOpenTask={(taskId) => onOpenTask?.(taskId)}
              onDeleteTask={handleDeleteTask}
            />
          </Box>
        )}
      </Box>

      {/* Create task modal */}
      <CreateTaskModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        teamId={teamId}
        projectId={project.id}
        memberOptions={memberOptions}
        projectStatuses={projectStatuses}
        projectSprints={projectSprints}
        projectTags={projectTags}
        onCreated={(taskId) => {
          setCreateModalOpen(false);
          onOpenTask?.(taskId);
        }}
      />
    </Box>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

function KanbanBoard({
  tasks,
  projectStatuses,
  onUpdateStatus,
  onOpenTask,
  onDeleteTask,
  onDragStart,
  onDrop,
}: {
  tasks: ITeamProjectTask[];
  projectStatuses: IProjectStatus[];
  onUpdateStatus: (task: ITeamProjectTask, statusId: string) => void;
  onOpenTask: (taskId: string) => void;
  onDeleteTask: (task: ITeamProjectTask) => void;
  onDragStart: (taskId: string) => void;
  onDrop: (statusId: string) => void;
}) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <ScrollArea
      style={{ height: "100%" }}
      scrollbars="x"
      offsetScrollbars
      styles={{
        viewport: { padding: "12px 16px" },
        scrollbar: { zIndex: 10 },
      }}
    >
      <Group
        align="flex-start"
        wrap="nowrap"
        gap="md"
        style={{ height: "calc(100% - 24px)", minWidth: projectStatuses.length * 280 }}
      >
        {projectStatuses.map((status) => {
          const colTasks = tasks.filter((t) => t.status === status.id);
          const isOver = dragOver === status.id;
          return (
            <Box
              key={status.id}
              style={{
                flex: "1 1 0",
                minWidth: 270,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: isOver
                  ? `var(--mantine-color-${status.color}-0)`
                  : "var(--mantine-color-default-hover)",
                borderRadius: 10,
                border: isOver
                  ? `2px dashed var(--mantine-color-${status.color}-4)`
                  : "2px solid transparent",
                transition: "background 0.15s, border 0.15s",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                onDrop(status.id);
                setDragOver(null);
              }}
            >
              {/* Column header */}
              <Group
                justify="space-between"
                px="sm"
                pt="sm"
                pb="xs"
                style={{
                  flexShrink: 0,
                  borderBottom: `2px solid var(--mantine-color-${status.color}-4)`,
                }}
              >
                <Group gap={8}>
                  <Box
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: `var(--mantine-color-${status.color}-5)`,
                      flexShrink: 0,
                    }}
                  />
                  <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: 0.8 }}>
                    {status.label}
                  </Text>
                  <Badge
                    size="xs"
                    variant="filled"
                    color={status.color}
                    radius="xl"
                    style={{ minWidth: 22 }}
                  >
                    {colTasks.length}
                  </Badge>
                </Group>
              </Group>

              {/* Cards */}
              <ScrollArea style={{ flex: 1 }} px="xs" pb="xs">
                <Stack gap="xs">
                  {colTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      projectStatuses={projectStatuses}
                      onOpen={() => onOpenTask(task.id)}
                      onDelete={() => onDeleteTask(task)}
                      onDragStart={() => onDragStart(task.id)}
                      onStatusChange={(sid) => onUpdateStatus(task, sid)}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <Box
                      style={{
                        border:
                          "2px dashed var(--mantine-color-default-border)",
                        borderRadius: 6,
                        padding: "20px 8px",
                        textAlign: "center",
                      }}
                    >
                      <Text size="xs" c="dimmed">
                        {t("No issues")}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </ScrollArea>
            </Box>
          );
        })}
      </Group>
    </ScrollArea>
  );
}

function KanbanCard({
  task,
  projectStatuses,
  onOpen,
  onDelete,
  onDragStart,
  onStatusChange,
}: {
  task: ITeamProjectTask;
  projectStatuses: IProjectStatus[];
  onOpen: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onStatusChange: (statusId: string) => void;
}) {
  const { t } = useTranslation();
  const priCfg = priorityConfig[task.priority];
  const typeCfg = issueTypeConfig[task.issueType];
  const TypeIcon = typeCfg?.icon ?? IconCheckbox;
  const pastDue = isPastDue(task.dueAt);
  const [hovered, setHovered] = useState(false);

  // Priority indicator colors
  const priBorderColor = priCfg?.color === "red"
    ? "var(--mantine-color-red-5)"
    : priCfg?.color === "orange"
      ? "var(--mantine-color-orange-5)"
      : priCfg?.color === "yellow"
        ? "var(--mantine-color-yellow-5)"
        : "var(--mantine-color-gray-4)";

  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        borderLeft: `3px solid ${priBorderColor}`,
        userSelect: "none",
        transition: "box-shadow 0.15s, transform 0.1s",
        boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.08)" : undefined,
        transform: hovered ? "translateY(-1px)" : undefined,
      }}
    >
      {/* Top row: ticket + type icon + actions */}
      <Group justify="space-between" wrap="nowrap" mb={8}>
        <Group gap={6} wrap="nowrap">
          <Tooltip label={t(typeCfg?.label ?? task.issueType)} withArrow openDelay={500}>
            <ThemeIcon
              size={20}
              color={typeCfg?.color ?? "teal"}
              variant="light"
              radius="sm"
            >
              <TypeIcon size={12} />
            </ThemeIcon>
          </Tooltip>
          {task.ticketNumber && (
            <Text size="xs" c="dimmed" fw={600} style={{ fontFamily: "monospace", letterSpacing: 0.5 }}>
              #{task.ticketNumber}
            </Text>
          )}
          {task.parentTaskId && (
            <Badge size="xs" variant="outline" color="gray" radius="sm">
              {t("Sub-task")}
            </Badge>
          )}
        </Group>
        <div onClick={(e) => e.stopPropagation()}>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="xs"
                style={{ opacity: hovered ? 1 : 0.4, transition: "opacity 0.15s" }}
              >
                <IconDots size={12} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{t("Move to")}</Menu.Label>
              {projectStatuses
                .filter((s) => s.id !== task.status)
                .map((s) => (
                  <Menu.Item key={s.id} onClick={() => onStatusChange(s.id)}
                    leftSection={
                      <Box style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${s.color}-5)` }} />
                    }
                  >
                    {s.label}
                  </Menu.Item>
                ))}
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={12} />} onClick={onDelete}>
                {t("Delete")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </Group>

      {/* Title */}
      <Text size="sm" fw={500} mb={8} lineClamp={2} style={{ lineHeight: 1.5 }}>
        {task.title}
      </Text>

      {/* Tags */}
      {(task.tags ?? []).length > 0 && (
        <Group gap={4} mb={8} wrap="wrap">
          {task.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} size="xs" variant="outline" color="gray" radius="xl">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 2 && (
            <Badge size="xs" variant="outline" color="gray" radius="xl">
              +{task.tags.length - 2}
            </Badge>
          )}
        </Group>
      )}

      {/* Bottom row: priority + due date + assignee */}
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          {/* Priority pill */}
          <Badge
            size="xs"
            variant="light"
            color={priCfg?.color ?? "gray"}
            radius="xl"
            style={{ fontSize: 10 }}
          >
            {t(priCfg?.label ?? task.priority)}
          </Badge>

          {/* Due date */}
          {task.dueAt && (
            <Group gap={3} wrap="nowrap">
              <IconCalendar
                size={11}
                color={pastDue ? "var(--mantine-color-red-5)" : "var(--mantine-color-dimmed)"}
              />
              <Text size="xs" c={pastDue ? "red" : "dimmed"} fw={pastDue ? 600 : 400}>
                {formatDate(task.dueAt)}
              </Text>
            </Group>
          )}

          {/* Sprint */}
          {task.sprint && (
            <Badge size="xs" variant="dot" color="indigo" radius="xl" style={{ fontSize: 10 }}>
              {task.sprint}
            </Badge>
          )}
        </Group>

        {/* Assignee avatar */}
        {task.assignee ? (
          <Tooltip label={task.assignee.name} withArrow openDelay={300}>
            <span>
              <CustomAvatar size={22} name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} />
            </span>
          </Tooltip>
        ) : (
          <Tooltip label={t("Unassigned")} withArrow openDelay={300}>
            <ThemeIcon size={22} variant="light" color="gray" radius="xl">
              <IconUser size={12} />
            </ThemeIcon>
          </Tooltip>
        )}
      </Group>
    </Paper>
  );
}

// ─── Task Table ───────────────────────────────────────────────────────────────

function TaskTable({
  tasks,
  memberOptions,
  projectStatuses,
  onUpdateTask,
  onOpenTask,
  onDeleteTask,
}: {
  tasks: ITeamProjectTask[];
  memberOptions: { value: string; label: string }[];
  projectStatuses: IProjectStatus[];
  onUpdateTask: (
    task: ITeamProjectTask,
    data: Partial<ITeamProjectTask>,
  ) => void;
  onOpenTask: (taskId: string) => void;
  onDeleteTask: (task: ITeamProjectTask) => void;
}) {
  const { t } = useTranslation();
  const statusOptions = projectStatuses.map((s) => ({
    value: s.id,
    label: s.label,
  }));

  return (
    <Table
      verticalSpacing={8}
      highlightOnHover
      styles={{
        thead: { position: "sticky", top: 0, zIndex: 2, background: "var(--mantine-color-body)" },
        th: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--mantine-color-dimmed)" },
      }}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={80}>{t("ID")}</Table.Th>
          <Table.Th>{t("Issue")}</Table.Th>
          <Table.Th w={90}>{t("Type")}</Table.Th>
          <Table.Th w={150}>{t("Status")}</Table.Th>
          <Table.Th w={150}>{t("Assignee")}</Table.Th>
          <Table.Th w={110}>{t("Due")}</Table.Th>
          <Table.Th w={120}>{t("Priority")}</Table.Th>
          <Table.Th w={60} />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {tasks.length === 0 && (
          <Table.Tr>
            <Table.Td colSpan={8}>
              <Text c="dimmed" size="sm" ta="center" py="xl">
                {t("No issues yet. Click + Create issue to get started.")}
              </Text>
            </Table.Td>
          </Table.Tr>
        )}
        {tasks.map((task) => {
          const priCfg = priorityConfig[task.priority];
          const typeCfg = issueTypeConfig[task.issueType];
          const TypeIcon = typeCfg?.icon ?? IconCheckbox;
          const past = isPastDue(task.dueAt);
          const statusCfg = getStatusCfg(task.status, projectStatuses);
          return (
            <Table.Tr
              key={task.id}
              style={{ cursor: "pointer" }}
            >
              {/* Ticket ID */}
              <Table.Td onClick={() => onOpenTask(task.id)}>
                {task.ticketNumber ? (
                  <Text size="xs" c="dimmed" fw={600} style={{ fontFamily: "monospace" }}>
                    #{task.ticketNumber}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed">—</Text>
                )}
              </Table.Td>

              {/* Title */}
              <Table.Td onClick={() => onOpenTask(task.id)}>
                <Group gap={8} wrap="nowrap">
                  <Box
                    style={{
                      width: 3,
                      height: 36,
                      borderRadius: 2,
                      background: `var(--mantine-color-${priCfg?.color ?? "gray"}-5)`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>{task.title}</Text>
                    {task.parentTaskId && (
                      <Text size="xs" c="dimmed">{t("Sub-task")}</Text>
                    )}
                    {(task.tags ?? []).length > 0 && (
                      <Group gap={4} mt={2}>
                        {task.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} size="xs" variant="outline" color="gray" radius="xl">{tag}</Badge>
                        ))}
                        {task.tags.length > 2 && (
                          <Text size="xs" c="dimmed">+{task.tags.length - 2}</Text>
                        )}
                      </Group>
                    )}
                  </div>
                </Group>
              </Table.Td>

              {/* Type */}
              <Table.Td>
                <Group gap={4} wrap="nowrap">
                  <ThemeIcon size={18} color={typeCfg?.color ?? "teal"} variant="light" radius="sm">
                    <TypeIcon size={11} />
                  </ThemeIcon>
                </Group>
              </Table.Td>

              {/* Status */}
              <Table.Td>
                <Select
                  size="xs"
                  value={task.status}
                  data={statusOptions}
                  onChange={(v) => onUpdateTask(task, { status: (v as ProjectTaskStatus) ?? "todo" })}
                  leftSection={
                    <Box style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${statusCfg.color}-5)` }} />
                  }
                  styles={{ input: { fontWeight: 500 } }}
                />
              </Table.Td>

              {/* Assignee */}
              <Table.Td>
                {task.assignee ? (
                  <Group gap={6} wrap="nowrap">
                    <CustomAvatar size={22} name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} />
                    <Text size="xs" truncate style={{ maxWidth: 90 }}>{task.assignee.name}</Text>
                  </Group>
                ) : (
                  <Select
                    size="xs"
                    value={task.assigneeId}
                    data={memberOptions}
                    onChange={(v) => onUpdateTask(task, { assigneeId: v })}
                    clearable
                    searchable
                    placeholder={t("Assign")}
                  />
                )}
              </Table.Td>

              {/* Due date */}
              <Table.Td>
                {task.dueAt ? (
                  <Group gap={4} wrap="nowrap">
                    <IconCalendar size={12} color={past ? "var(--mantine-color-red-5)" : "var(--mantine-color-dimmed)"} />
                    <Text size="xs" c={past ? "red" : "dimmed"} fw={past ? 600 : 400}>
                      {formatDate(task.dueAt)}
                    </Text>
                  </Group>
                ) : (
                  <Text size="xs" c="dimmed">—</Text>
                )}
              </Table.Td>

              {/* Priority */}
              <Table.Td>
                <Badge
                  size="xs"
                  variant="light"
                  color={priCfg?.color ?? "gray"}
                  radius="xl"
                >
                  {t(priCfg?.label ?? task.priority)}
                </Badge>
              </Table.Td>

              {/* Actions */}
              <Table.Td>
                <Group gap={2} wrap="nowrap">
                  <Tooltip label={t("Open")} withArrow>
                    <ActionIcon size="sm" variant="subtle" onClick={() => onOpenTask(task.id)}>
                      <IconChevronRight size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t("Delete")} withArrow>
                    <ActionIcon size="sm" variant="subtle" color="red" onClick={() => onDeleteTask(task)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

function TaskDetailPanel({
  task,
  projectId,
  teamId,
  members,
  memberOptions,
  projectStatuses,
  projectSprints,
  projectTags,
  allTasks,
  onUpdateTask,
  onDeleteTask,
  onOpenTask,
  onCreateSubtask,
}: {
  task: ITeamProjectTask;
  projectId: string;
  teamId: string;
  members?: ITeamMember[];
  memberOptions: { value: string; label: string }[];
  projectStatuses: IProjectStatus[];
  projectSprints: ISprint[];
  projectTags: string[];
  allTasks: ITeamProjectTask[];
  onUpdateTask: (data: Partial<ITeamProjectTask>) => void;
  onDeleteTask: () => void;
  onOpenTask: (taskId: string) => void;
  onCreateSubtask: (data: { title: string; parentTaskId: string }) => void;
}) {
  const { t } = useTranslation();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(task.description ?? "");
  const [comment, setComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: comments = [] } = useProjectTaskCommentsQuery(task.id);
  const createCommentMutation = useCreateProjectTaskCommentMutation();
  const uploadAttachmentMutation = useUploadTaskAttachmentMutation();
  const deleteAttachmentMutation = useDeleteTaskAttachmentMutation();

  useEffect(() => {
    setTitleValue(task.title);
    setDescValue(task.description ?? "");
  }, [task.id, task.title, task.description]);

  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTask({ title: trimmed });
    }
    setEditingTitle(false);
  };

  const handleSaveDesc = () => {
    if (descValue !== (task.description ?? "")) {
      onUpdateTask({ description: descValue || null });
    }
    setEditingDesc(false);
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    await createCommentMutation.mutateAsync({
      taskId: task.id,
      projectId,
      content: comment.trim(),
    });
    setComment("");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      await uploadAttachmentMutation.mutateAsync({
        taskId: task.id,
        projectId,
        file,
      });
    }
  };

  const statusCfg = getStatusCfg(task.status, projectStatuses);
  const priCfg = priorityConfig[task.priority];
  const attachments = (task as any).attachments as
    | ITaskAttachment[]
    | undefined;

  const statusOptions = projectStatuses.map((s) => ({
    value: s.id,
    label: s.label,
  }));

  const sprintOptions = [
    ...new Set([
      ...projectSprints.map((s) => s.name),
      ...(task.sprint ? [task.sprint] : []),
    ]),
  ].map((s) => ({ value: s, label: s }));

  const [tagSearch, setTagSearch] = useState("");
  const tagOptions = [
    ...new Set([...projectTags, ...(task.tags ?? []), ...(tagSearch ? [tagSearch] : [])]),
  ];

  return (
    <ScrollArea mah="75vh" pr="xs">
      <Stack gap="md">
        {/* Created/Updated timestamps */}
        <Group gap="md" wrap="nowrap">
          <Group gap={4} wrap="nowrap">
            <IconClock size={12} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              {t("Created")}:{" "}
              <strong>{formatDateTime(task.createdAt)}</strong>
            </Text>
          </Group>
          {task.updatedAt !== task.createdAt && (
            <Text size="xs" c="dimmed">
              {t("Updated")}: {formatDateTime(task.updatedAt)}
            </Text>
          )}
        </Group>

        {/* Title */}
        {editingTitle ? (
          <Textarea
            value={titleValue}
            onChange={(e) => setTitleValue(e.currentTarget.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSaveTitle();
              }
              if (e.key === "Escape") {
                setTitleValue(task.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
            autosize
            minRows={1}
            maxRows={4}
            fw={700}
            size="md"
          />
        ) : (
          <Text
            fw={700}
            size="lg"
            onClick={() => setEditingTitle(true)}
            style={{ cursor: "text", lineHeight: 1.3 }}
          >
            {task.title}
          </Text>
        )}

        {/* Status + Priority + Type row */}
        <Group gap="xs" wrap="wrap">
          <Select
            size="xs"
            value={task.status}
            data={statusOptions}
            onChange={(v) =>
              onUpdateTask({ status: (v as ProjectTaskStatus) ?? "todo" })
            }
            leftSection={
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: `var(--mantine-color-${statusCfg.color}-5)`,
                }}
              />
            }
          />
          <Select
            size="xs"
            value={task.priority}
            data={priorityOptions.map((o) => ({
              value: o.value,
              label: t(priorityConfig[o.value].label),
            }))}
            onChange={(v) =>
              onUpdateTask({ priority: (v as ProjectTaskPriority) ?? "medium" })
            }
          />
          <Select
            size="xs"
            value={task.issueType}
            data={issueTypeOptions.map((o) => ({
              value: o.value,
              label: t(issueTypeConfig[o.value].label),
            }))}
            onChange={(v) =>
              onUpdateTask({ issueType: (v as ProjectIssueType) ?? "task" })
            }
          />
        </Group>

        <Divider />

        {/* Metadata grid */}
        <SimpleGrid cols={2} spacing="xs">
          <Box>
            <Text size="xs" c="dimmed" mb={4} fw={500}>
              <Group gap={4}>
                <IconUser size={12} />
                {t("Assignee")}
              </Group>
            </Text>
            <Select
              size="xs"
              value={task.assigneeId}
              data={memberOptions}
              onChange={(v) => onUpdateTask({ assigneeId: v })}
              clearable
              searchable
              placeholder={t("Unassigned")}
            />
          </Box>
          <Box>
            <Text size="xs" c="dimmed" mb={4} fw={500}>
              <Group gap={4}>
                <IconCalendar size={12} />
                {t("Due date")}
              </Group>
            </Text>
            <TextInput
              size="xs"
              type="date"
              value={
                task.dueAt
                  ? new Date(task.dueAt).toISOString().slice(0, 10)
                  : ""
              }
              onChange={(e) =>
                onUpdateTask({ dueAt: e.currentTarget.value || null })
              }
            />
          </Box>
          <Box>
            <Text size="xs" c="dimmed" mb={4} fw={500}>
              {t("Sprint")}
            </Text>
            {sprintOptions.length > 0 ? (
              <Select
                size="xs"
                value={task.sprint}
                data={sprintOptions}
                onChange={(v) => onUpdateTask({ sprint: v })}
                clearable
                searchable
                placeholder={t("None")}
              />
            ) : (
              <TextInput
                size="xs"
                value={task.sprint ?? ""}
                onChange={(e) =>
                  onUpdateTask({ sprint: e.currentTarget.value || null })
                }
                placeholder={t("Sprint name")}
              />
            )}
          </Box>
          <Box>
            <Text size="xs" c="dimmed" mb={4} fw={500}>
              {t("Story points")}
            </Text>
            <NumberInput
              size="xs"
              value={task.storyPoints ?? ""}
              onChange={(v) =>
                onUpdateTask({ storyPoints: v === "" ? null : Number(v) })
              }
              min={0}
              placeholder="0"
            />
          </Box>
        </SimpleGrid>

        {/* Tags */}
        <Box>
          <Text size="xs" c="dimmed" mb={4} fw={500}>
            <Group gap={4}>
              <IconTag size={12} />
              {t("Tags")}
            </Group>
          </Text>
          <MultiSelect
            size="xs"
            data={tagOptions}
            value={task.tags ?? []}
            onChange={(v) => { onUpdateTask({ tags: v }); setTagSearch(""); }}
            searchable
            clearable
            searchValue={tagSearch}
            onSearchChange={setTagSearch}
            comboboxProps={{ withinPortal: true }}
            placeholder={t("Add tags")}
          />
        </Box>

        <Divider />

        {/* Description */}
        <Box>
          <Text size="xs" c="dimmed" mb={4} fw={500}>
            {t("Description")}
          </Text>
          {editingDesc ? (
            <Textarea
              value={descValue}
              onChange={(e) => setDescValue(e.currentTarget.value)}
              onBlur={handleSaveDesc}
              autoFocus
              autosize
              minRows={3}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleSaveDesc();
              }}
            />
          ) : (
            <Box
              onClick={() => setEditingDesc(true)}
              style={{
                cursor: "text",
                minHeight: 60,
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--mantine-color-default-border)",
              }}
            >
              {task.description ? (
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {task.description}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  {t("Click to add description...")}
                </Text>
              )}
            </Box>
          )}
        </Box>

        {/* External links */}
        {task.externalLinks?.length > 0 && (
          <Box>
            <Text size="xs" c="dimmed" mb={4} fw={500}>
              {t("Links")}
            </Text>
            <Stack gap={4}>
              {task.externalLinks.map((link) => (
                <Anchor key={link} href={link} target="_blank" size="sm">
                  {link}
                </Anchor>
              ))}
            </Stack>
          </Box>
        )}

        {/* Sub-tasks */}
        <SubtasksSection
          task={task}
          allTasks={allTasks}
          projectId={projectId}
          teamId={teamId}
          projectStatuses={projectStatuses}
          onOpenTask={onOpenTask}
          onCreateSubtask={onCreateSubtask}
        />

        {/* Linked tickets */}
        <LinkedTasksSection
          task={task}
          allTasks={allTasks}
          onUpdateTask={onUpdateTask}
          onOpenTask={onOpenTask}
        />

        <Divider />

        {/* Attachments */}
        <Box>
          <Group justify="space-between" mb={6}>
            <Text size="xs" c="dimmed" fw={500}>
              <Group gap={4}>
                <IconPaperclip size={12} />
                {t("Attachments")}
                {attachments && attachments.length > 0 && (
                  <Badge size="xs" variant="light">
                    {attachments.length}
                  </Badge>
                )}
              </Group>
            </Text>
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={
                uploadAttachmentMutation.isPending ? (
                  <Loader size={10} />
                ) : (
                  <IconPlus size={12} />
                )
              }
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAttachmentMutation.isPending}
            >
              {t("Upload")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </Group>
          {attachments && attachments.length > 0 && (
            <Stack gap="xs">
              {attachments.map((att) => {
                const url = getFileUrl(`/files/${att.id}/${att.fileName}`);
                const isImage = att.mimeType?.startsWith("image/");
                return (
                  <Paper key={att.id} withBorder radius="sm" p="xs">
                    <Group justify="space-between" wrap="nowrap">
                      {isImage ? (
                        <Group
                          gap="xs"
                          wrap="nowrap"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <img
                            src={url}
                            alt={att.fileName}
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: 4,
                              flexShrink: 0,
                            }}
                          />
                          <Anchor
                            href={url}
                            target="_blank"
                            size="xs"
                            truncate
                            style={{ flex: 1 }}
                          >
                            {att.fileName}
                          </Anchor>
                        </Group>
                      ) : (
                        <Group
                          gap="xs"
                          wrap="nowrap"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <ThemeIcon
                            size={32}
                            variant="light"
                            color="blue"
                            radius="sm"
                          >
                            <IconFile size={18} />
                          </ThemeIcon>
                          <div style={{ minWidth: 0 }}>
                            <Anchor
                              href={url}
                              target="_blank"
                              size="xs"
                              truncate
                            >
                              {att.fileName}
                            </Anchor>
                            <Text size="xs" c="dimmed">
                              {formatBytes(att.fileSize)}
                            </Text>
                          </div>
                        </Group>
                      )}
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() =>
                          deleteAttachmentMutation.mutate({
                            taskId: task.id,
                            projectId,
                            attachmentId: att.id,
                          })
                        }
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>

        <Divider />

        {/* Comments */}
        <Box>
          <Text size="xs" c="dimmed" mb={8} fw={500}>
            {t("Comments")} {comments.length > 0 && `(${comments.length})`}
          </Text>
          <Stack gap="xs">
            {comments.map((item) => (
              <CommentItem key={item.id} comment={item} />
            ))}
            <Textarea
              placeholder={t("Add a comment...")}
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              minRows={2}
              autosize
              size="sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <Group justify="flex-end">
              <Button
                size="xs"
                onClick={handleAddComment}
                disabled={!comment.trim()}
                loading={createCommentMutation.isPending}
              >
                {t("Comment")}
              </Button>
            </Group>
          </Stack>
        </Box>

        <Divider />

        <Group justify="flex-end">
          <Button size="xs" variant="subtle" color="red" onClick={onDeleteTask}>
            {t("Delete issue")}
          </Button>
        </Group>
      </Stack>
    </ScrollArea>
  );
}

function CommentItem({ comment }: { comment: ITeamProjectTaskComment }) {
  return (
    <Paper withBorder radius="sm" p="xs">
      <Group gap="xs" mb={4} wrap="nowrap">
        <CustomAvatar
          size={24}
          name={comment.user?.name ?? "?"}
          avatarUrl={comment.user?.avatarUrl}
        />
        <Text size="xs" fw={500}>
          {comment.user?.name ?? "Unknown"}
        </Text>
        <Text size="xs" c="dimmed">
          {formatDateTime(comment.createdAt)}
        </Text>
      </Group>
      <Text size="sm" style={{ whiteSpace: "pre-wrap", paddingLeft: 32 }}>
        {comment.content}
      </Text>
    </Paper>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({
  opened,
  onClose,
  teamId,
  projectId,
  memberOptions,
  projectStatuses,
  projectSprints,
  projectTags,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  teamId: string;
  projectId: string;
  memberOptions: { value: string; label: string }[];
  projectStatuses: IProjectStatus[];
  projectSprints: ISprint[];
  projectTags: string[];
  onCreated: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<ProjectIssueType>("task");
  const [priority, setPriority] = useState<ProjectTaskPriority>("medium");
  const [status, setStatus] = useState<string>(
    projectStatuses[0]?.id ?? "todo",
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [sprint, setSprint] = useState<string | null>(null);
  const [storyPoints, setStoryPoints] = useState<string | number>("");
  const [dueAt, setDueAt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");

  const createMutation = useCreateProjectTaskMutation();

  const statusOptions = projectStatuses.map((s) => ({
    value: s.id,
    label: s.label,
  }));
  const sprintOptions = projectSprints.map((s) => ({
    value: s.name,
    label: s.name,
  }));
  const tagOptions = [...new Set([...projectTags, ...tags, ...(tagSearch ? [tagSearch] : [])])];

  useEffect(() => {
    if (opened) {
      setStatus(projectStatuses[0]?.id ?? "todo");
    }
  }, [opened, projectStatuses]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const task = await createMutation.mutateAsync({
      teamId,
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      issueType,
      priority,
      status,
      assigneeId: assigneeId ?? undefined,
      sprint: sprint ?? undefined,
      storyPoints: storyPoints === "" ? undefined : Number(storyPoints),
      dueAt: dueAt || undefined,
      tags,
    });
    setTitle("");
    setDescription("");
    setIssueType("task");
    setPriority("medium");
    setStatus(projectStatuses[0]?.id ?? "todo");
    setAssigneeId(null);
    setSprint(null);
    setStoryPoints("");
    setDueAt("");
    setTags([]);
    onCreated(task.id);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="sm">
          {t("Create issue")}
        </Text>
      }
      size="lg"
    >
      <Stack gap="sm">
        <TextInput
          label={t("Title")}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          placeholder={t("Issue title")}
          required
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleCreate();
          }}
        />

        <SimpleGrid cols={3} spacing="xs">
          <Select
            size="sm"
            label={t("Type")}
            value={issueType}
            data={issueTypeOptions.map((o) => ({
              value: o.value,
              label: t(issueTypeConfig[o.value].label),
            }))}
            onChange={(v) => setIssueType((v as ProjectIssueType) ?? "task")}
          />
          <Select
            size="sm"
            label={t("Priority")}
            value={priority}
            data={priorityOptions.map((o) => ({
              value: o.value,
              label: t(priorityConfig[o.value].label),
            }))}
            onChange={(v) =>
              setPriority((v as ProjectTaskPriority) ?? "medium")
            }
          />
          <Select
            size="sm"
            label={t("Status")}
            value={status}
            data={statusOptions}
            onChange={(v) => setStatus(v ?? statusOptions[0]?.value ?? "todo")}
          />
        </SimpleGrid>

        <SimpleGrid cols={2} spacing="xs">
          <Select
            size="sm"
            label={t("Assignee")}
            value={assigneeId}
            data={memberOptions}
            onChange={(v) => setAssigneeId(v as string | null)}
            clearable
            searchable
            placeholder={t("Unassigned")}
          />
          <TextInput
            size="sm"
            label={t("Due date")}
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.currentTarget.value)}
          />
          {sprintOptions.length > 0 ? (
            <Select
              size="sm"
              label={t("Sprint")}
              value={sprint}
              data={sprintOptions}
              onChange={(v) => setSprint(v as string | null)}
              clearable
              placeholder={t("None")}
            />
          ) : (
            <TextInput
              size="sm"
              label={t("Sprint")}
              value={sprint ?? ""}
              onChange={(e) => setSprint(e.currentTarget.value || null)}
              placeholder={t("Sprint 1")}
            />
          )}
          <NumberInput
            size="sm"
            label={t("Story points")}
            value={storyPoints}
            onChange={(v) => setStoryPoints(v as string | number)}
            min={0}
            placeholder="0"
          />
        </SimpleGrid>

        <MultiSelect
          size="sm"
          label={t("Tags")}
          data={tagOptions}
          value={tags}
          onChange={(v) => { setTags(v); setTagSearch(""); }}
          searchable
          clearable
          searchValue={tagSearch}
          onSearchChange={setTagSearch}
          comboboxProps={{ withinPortal: true }}
          placeholder={t("Add tags")}
        />

        <Box>
          <Text size="sm" fw={500} mb={4}>{t("Description")}</Text>
          <TaskDescriptionEditor
            value={description}
            onChange={setDescription}
            minHeight={180}
            placeholder={t("Add acceptance criteria, context, links, and implementation notes...")}
          />
        </Box>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim()}
            loading={createMutation.isPending}
          >
            {t("Create issue")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Sub-tasks Section ────────────────────────────────────────────────────────

function SubtasksSection({
  task,
  allTasks,
  projectId,
  teamId,
  projectStatuses,
  onOpenTask,
  onCreateSubtask,
}: {
  task: ITeamProjectTask;
  allTasks: ITeamProjectTask[];
  projectId: string;
  teamId: string;
  projectStatuses: IProjectStatus[];
  onOpenTask: (taskId: string) => void;
  onCreateSubtask: (data: { title: string; parentTaskId: string }) => void;
}) {
  const { t } = useTranslation();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const subtasks = allTasks.filter((t) => t.parentTaskId === task.id);

  const handleAdd = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    onCreateSubtask({ title, parentTaskId: task.id });
    setNewSubtaskTitle("");
    setAdding(false);
  };

  return (
    <Box>
      <Group justify="space-between" mb={6}>
        <Text size="xs" c="dimmed" fw={500}>
          <Group gap={4}>
            <IconCheckbox size={12} />
            {t("Sub-tasks")}
            {subtasks.length > 0 && (
              <Badge size="xs" variant="light">{subtasks.length}</Badge>
            )}
          </Group>
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          leftSection={<IconPlus size={12} />}
          onClick={() => setAdding(true)}
        >
          {t("Add")}
        </Button>
      </Group>
      <Stack gap={4}>
        {subtasks.map((sub) => {
          const statusCfg = getStatusCfg(sub.status, projectStatuses);
          return (
            <Paper
              key={sub.id}
              withBorder
              radius="sm"
              px="xs"
              py={6}
              onClick={() => onOpenTask(sub.id)}
              style={{ cursor: "pointer" }}
            >
              <Group gap="xs" wrap="nowrap">
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: `var(--mantine-color-${statusCfg.color}-5)`,
                    flexShrink: 0,
                  }}
                />
                <Text size="xs" style={{ flex: 1 }} truncate>
                  {sub.title}
                </Text>
                <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                  {statusCfg.label}
                </Text>
              </Group>
            </Paper>
          );
        })}
        {adding && (
          <Group gap="xs" wrap="nowrap">
            <TextInput
              size="xs"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.currentTarget.value)}
              placeholder={t("Sub-task title")}
              autoFocus
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewSubtaskTitle(""); }
              }}
            />
            <Button size="xs" onClick={handleAdd} disabled={!newSubtaskTitle.trim()}>
              {t("Add")}
            </Button>
            <ActionIcon size="xs" variant="subtle" onClick={() => { setAdding(false); setNewSubtaskTitle(""); }}>
              <IconX size={12} />
            </ActionIcon>
          </Group>
        )}
      </Stack>
    </Box>
  );
}

// ─── Linked Tasks Section ─────────────────────────────────────────────────────

function LinkedTasksSection({
  task,
  allTasks,
  onUpdateTask,
  onOpenTask,
}: {
  task: ITeamProjectTask;
  allTasks: ITeamProjectTask[];
  onUpdateTask: (data: Partial<ITeamProjectTask>) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const linkedIds: string[] = task.linkedTaskIds ?? [];
  const linkedTasks = allTasks.filter(
    (t) => linkedIds.includes(t.id) && t.id !== task.id,
  );

  const linkableOptions = allTasks.filter(
    (t) => t.id !== task.id && !linkedIds.includes(t.id) && !t.parentTaskId,
  );

  const filtered = searchValue.trim()
    ? linkableOptions.filter((t) =>
        t.title.toLowerCase().includes(searchValue.toLowerCase()),
      )
    : linkableOptions.slice(0, 8);

  const handleLink = (otherId: string) => {
    onUpdateTask({ linkedTaskIds: [...linkedIds, otherId] });
    setSearchValue("");
    setMenuOpen(false);
  };

  const handleUnlink = (otherId: string) => {
    onUpdateTask({ linkedTaskIds: linkedIds.filter((id) => id !== otherId) });
  };

  return (
    <Box>
      <Group justify="space-between" mb={6}>
        <Text size="xs" c="dimmed" fw={500}>
          <Group gap={4}>
            <IconFile size={12} />
            {t("Linked issues")}
            {linkedTasks.length > 0 && (
              <Badge size="xs" variant="light">{linkedTasks.length}</Badge>
            )}
          </Group>
        </Text>
        <Menu
          opened={menuOpen}
          onOpen={() => setMenuOpen(true)}
          onClose={() => { setMenuOpen(false); setSearchValue(""); }}
          withinPortal
          position="bottom-end"
          shadow="md"
        >
          <Menu.Target>
            <Button size="compact-xs" variant="subtle" leftSection={<IconPlus size={12} />}>
              {t("Link")}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Box px="xs" pb="xs">
              <TextInput
                size="xs"
                placeholder={t("Search issues...")}
                value={searchValue}
                onChange={(e) => setSearchValue(e.currentTarget.value)}
                autoFocus
              />
            </Box>
            {filtered.length === 0 && (
              <Text size="xs" c="dimmed" px="xs" pb="xs">
                {t("No issues found")}
              </Text>
            )}
            {filtered.map((opt) => (
              <Menu.Item key={opt.id} onClick={() => handleLink(opt.id)}>
                <Text size="xs" truncate maw={240}>{opt.title}</Text>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>
      <Stack gap={4}>
        {linkedTasks.map((linked) => (
          <Paper key={linked.id} withBorder radius="sm" px="xs" py={6}>
            <Group gap="xs" wrap="nowrap">
              <Text
                size="xs"
                style={{ flex: 1, cursor: "pointer" }}
                truncate
                onClick={() => onOpenTask(linked.id)}
              >
                {linked.title}
              </Text>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => handleUnlink(linked.id)}
              >
                <IconX size={10} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Re-export alias ──────────────────────────────────────────────────────────
export { ProjectTasksView as ProjectTasks };
