import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
  Avatar,
  Anchor,
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
  IconChevronRight,
  IconCircle,
  IconDots,
  IconFile,
  IconFilter,
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
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { getFileUrl } from "@/lib/config";
import { formatBytes } from "@/lib/utils";
import {
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

// ─── Constants ────────────────────────────────────────────────────────────────

export const statusConfig: Record<
  ProjectTaskStatus,
  { label: string; color: string; icon: typeof IconCircle }
> = {
  todo: { label: "Todo", color: "gray", icon: IconCircle },
  in_progress: { label: "In Progress", color: "blue", icon: IconChevronRight },
  blocked: { label: "Blocked", color: "red", icon: IconAlertCircle },
  done: { label: "Done", color: "green", icon: IconCheck },
};

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

const statusOptions: { value: ProjectTaskStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

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

function isPastDue(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ─── Panel (team settings usage) ──────────────────────────────────────────────

interface TeamProjectsPanelProps {
  teamId: string;
  members?: ITeamMember[];
}

export function TeamProjectsPanel({ teamId, members }: TeamProjectsPanelProps) {
  const { t } = useTranslation();
  const { data: projects } = useTeamProjectsQuery(teamId);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = projects?.find((p) => p.id === activeProjectId);

  useEffect(() => {
    if (!activeProjectId && projects?.length) setActiveProjectId(projects[0].id);
    if (activeProjectId && projects && !projects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(projects[0]?.id ?? null);
    }
  }, [activeProjectId, projects]);

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <ProjectListSidebar
        teamId={teamId}
        projects={projects ?? []}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
      />
      {activeProject ? (
        <ProjectTasksView teamId={teamId} project={activeProject} members={members} />
      ) : (
        <Stack gap={4} pt="sm">
          <Text fw={500}>{t("Team projects")}</Text>
          <Text size="sm" c="dimmed">
            {t("Create a project to track tasks, owners, due dates, and status.")}
          </Text>
        </Stack>
      )}
    </SimpleGrid>
  );
}

// ─── Project List Sidebar ─────────────────────────────────────────────────────

function ProjectListSidebar({
  teamId,
  projects,
  activeProjectId,
  onSelectProject,
}: {
  teamId: string;
  projects: ITeamProject[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [view, setView] = useState<ProjectView>("kanban");
  const createMutation = useCreateProjectMutation();
  const deleteMutation = useDeleteProjectMutation();

  const handleCreate = async () => {
    if (!name.trim()) return;
    const project = await createMutation.mutateAsync({
      teamId,
      name: name.trim(),
      description: description.trim() || undefined,
      view,
    });
    setName("");
    setDescription("");
    setView("kanban");
    onSelectProject(project.id);
  };

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
      onConfirm: () => deleteMutation.mutate({ teamId, projectId: project.id }),
    });
  };

  return (
    <Stack gap="sm">
      <Text fw={600} size="sm">
        {t("Projects")}
      </Text>

      <Stack gap="xs">
        <TextInput
          size="sm"
          label={t("Project name")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t("e.g. Launch plan")}
        />
        <Textarea
          size="sm"
          label={t("Description")}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={2}
          autosize
        />
        <Group align="flex-end">
          <Select
            size="sm"
            label={t("Default view")}
            data={viewOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
            value={view}
            onChange={(v) => setView((v as ProjectView) ?? "kanban")}
            style={{ flex: 1 }}
          />
          <Button
            size="sm"
            leftSection={<IconPlus size={14} />}
            onClick={handleCreate}
            disabled={!name.trim()}
            loading={createMutation.isPending}
          >
            {t("Create")}
          </Button>
        </Group>
      </Stack>

      <Divider />

      <Stack gap="xs">
        {projects.map((project) => {
          const done = Number(project.doneTaskCount ?? 0);
          const total = Number(project.taskCount ?? 0);
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Paper
              key={project.id}
              withBorder
              radius="sm"
              p="sm"
              style={{
                cursor: "pointer",
                borderColor:
                  project.id === activeProjectId
                    ? "var(--mantine-color-blue-5)"
                    : undefined,
              }}
              onClick={() => onSelectProject(project.id)}
            >
              <Group justify="space-between" wrap="nowrap" mb={4}>
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
                      confirmDelete(project);
                    }}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              </Group>
              <Progress value={pct} size="xs" color="blue" />
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}

// ─── Main project tasks view (used both from panel and projects page) ──────────

export interface ProjectTasksViewProps {
  teamId: string;
  project: ITeamProject;
  members?: ITeamMember[];
}

export function ProjectTasksView({ teamId, project, members }: ProjectTasksViewProps) {
  const { t } = useTranslation();
  const { data: tasks = [] } = useProjectTasksQuery(project.id);
  const updateProjectMutation = useUpdateProjectMutation();
  const createTaskMutation = useCreateProjectTaskMutation();
  const updateTaskMutation = useUpdateProjectTaskMutation();
  const deleteTaskMutation = useDeleteProjectTaskMutation();

  const [view, setView] = useState<ProjectView>(project.view ?? "kanban");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterSprint, setFilterSprint] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const memberOptions = useMemo(
    () =>
      members?.map((m) => ({
        value: m.userId,
        label: m.user?.name ?? m.user?.email ?? "Unknown",
      })) ?? [],
    [members],
  );

  const sprints = useMemo(
    () => [...new Set(tasks.map((t) => t.sprint).filter(Boolean) as string[])],
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterPriority) result = result.filter((t) => t.priority === filterPriority);
    if (filterType) result = result.filter((t) => t.issueType === filterType);
    if (filterSprint) result = result.filter((t) => t.sprint === filterSprint);
    if (filterAssignee) result = result.filter((t) => t.assigneeId === filterAssignee);
    return result;
  }, [tasks, filterPriority, filterType, filterSprint, filterAssignee]);

  const handleChangeView = (newView: ProjectView) => {
    setView(newView);
    updateProjectMutation.mutate({ teamId, projectId: project.id, view: newView });
  };

  const handleUpdateTask = (
    task: ITeamProjectTask,
    data: Partial<ITeamProjectTask>,
  ) => {
    updateTaskMutation.mutate({ teamId, projectId: project.id, taskId: task.id, ...data });
  };

  const handleDeleteTask = (task: ITeamProjectTask) => {
    modals.openConfirmModal({
      title: t("Delete task"),
      children: <Text size="sm">{t("Delete this task permanently?")}</Text>,
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () =>
        deleteTaskMutation.mutate({ teamId, projectId: project.id, taskId: task.id }),
    });
  };

  const handleDrop = (status: ProjectTaskStatus) => {
    const task = tasks.find((t) => t.id === dragTaskId);
    if (task && task.status !== status) {
      handleUpdateTask(task, { status });
    }
    setDragTaskId(null);
  };

  const hasFilters = !!(filterPriority || filterType || filterSprint || filterAssignee);

  return (
    <>
      {/* Header */}
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <Text fw={700} size="md" truncate>
                {project.name}
              </Text>
              {project.description && (
                <Text size="xs" c="dimmed" truncate>
                  {project.description}
                </Text>
              )}
            </div>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => setCreateModalOpen(true)}
            >
              {t("Add task")}
            </Button>
            <Select
              size="xs"
              w={110}
              value={view}
              data={viewOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
              onChange={(v) => handleChangeView((v as ProjectView) ?? "kanban")}
              leftSection={
                view === "kanban" ? <IconLayoutKanban size={14} /> : <IconTable size={14} />
              }
            />
          </Group>
        </Group>

        {/* Filter bar */}
        <Group gap="xs" wrap="wrap">
          <Select
            size="xs"
            w={130}
            placeholder={t("Priority")}
            clearable
            leftSection={<IconFilter size={12} />}
            data={priorityOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
            value={filterPriority}
            onChange={setFilterPriority}
          />
          <Select
            size="xs"
            w={120}
            placeholder={t("Type")}
            clearable
            data={issueTypeOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
            value={filterType}
            onChange={setFilterType}
          />
          {sprints.length > 0 && (
            <Select
              size="xs"
              w={150}
              placeholder={t("Sprint")}
              clearable
              data={sprints.map((s) => ({ value: s, label: s }))}
              value={filterSprint}
              onChange={setFilterSprint}
            />
          )}
          {members && members.length > 0 && (
            <Select
              size="xs"
              w={150}
              placeholder={t("Assignee")}
              clearable
              data={memberOptions}
              value={filterAssignee}
              onChange={setFilterAssignee}
            />
          )}
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
              }}
            >
              {t("Clear")}
            </Button>
          )}
          <Text size="xs" c="dimmed" ml="auto">
            {filteredTasks.length} {t("task", { count: filteredTasks.length })}
          </Text>
        </Group>
      </Stack>

      {/* Board / Table */}
      {view === "kanban" ? (
        <KanbanBoard
          tasks={filteredTasks}
          onUpdateStatus={(task, status) => handleUpdateTask(task, { status })}
          onOpenTask={setSelectedTaskId}
          onDeleteTask={handleDeleteTask}
          onDragStart={setDragTaskId}
          onDrop={handleDrop}
        />
      ) : (
        <TaskTable
          tasks={
            view === "calendar"
              ? [...filteredTasks].sort((a, b) =>
                  (a.dueAt ?? "").localeCompare(b.dueAt ?? ""),
                )
              : filteredTasks
          }
          memberOptions={memberOptions}
          onUpdateTask={handleUpdateTask}
          onOpenTask={setSelectedTaskId}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Task detail drawer */}
      <Drawer
        opened={!!selectedTask}
        onClose={() => setSelectedTaskId(null)}
        position="right"
        size={520}
        withOverlay={false}
        styles={{ inner: { pointerEvents: "none" }, content: { pointerEvents: "all" } }}
        title={
          selectedTask ? (
            <Group gap="xs">
              <ThemeIcon
                size={22}
                variant="light"
                color={issueTypeConfig[selectedTask.issueType]?.color ?? "teal"}
                radius="sm"
              >
                {(() => {
                  const Icon = issueTypeConfig[selectedTask.issueType]?.icon ?? IconCheckbox;
                  return <Icon size={14} />;
                })()}
              </ThemeIcon>
              <Text size="sm" fw={500} c="dimmed">
                {issueTypeConfig[selectedTask.issueType]?.label} ·{" "}
                {project.name}
              </Text>
            </Group>
          ) : null
        }
      >
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            projectId={project.id}
            teamId={teamId}
            members={members}
            memberOptions={memberOptions}
            onUpdateTask={(data) => handleUpdateTask(selectedTask, data)}
            onDeleteTask={() => {
              handleDeleteTask(selectedTask);
              setSelectedTaskId(null);
            }}
          />
        )}
      </Drawer>

      {/* Create task modal */}
      <CreateTaskModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        teamId={teamId}
        projectId={project.id}
        memberOptions={memberOptions}
        onCreated={(taskId) => {
          setCreateModalOpen(false);
          setSelectedTaskId(taskId);
        }}
      />
    </>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

function KanbanBoard({
  tasks,
  onUpdateStatus,
  onOpenTask,
  onDeleteTask,
  onDragStart,
  onDrop,
}: {
  tasks: ITeamProjectTask[];
  onUpdateStatus: (task: ITeamProjectTask, status: ProjectTaskStatus) => void;
  onOpenTask: (taskId: string) => void;
  onDeleteTask: (task: ITeamProjectTask) => void;
  onDragStart: (taskId: string) => void;
  onDrop: (status: ProjectTaskStatus) => void;
}) {
  const { t } = useTranslation();

  return (
    <Box style={{ overflowX: "auto" }}>
      <Group align="flex-start" wrap="nowrap" gap="sm" style={{ minWidth: 800 }}>
        {statusOptions.map((status) => {
          const cfg = statusConfig[status.value];
          const colTasks = tasks.filter((t) => t.status === status.value);
          return (
            <Box
              key={status.value}
              style={{
                flex: "0 0 240px",
                minWidth: 240,
                background: "var(--mantine-color-default-hover)",
                borderRadius: 8,
                padding: 8,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(status.value)}
            >
              {/* Column header */}
              <Group justify="space-between" mb={8} px={4}>
                <Group gap={6}>
                  <ThemeIcon size={18} color={cfg.color} variant="light" radius="xl">
                    <cfg.icon size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={600}>
                    {t(cfg.label)}
                  </Text>
                  <Badge size="xs" variant="light" color={cfg.color} radius="xl">
                    {colTasks.length}
                  </Badge>
                </Group>
              </Group>

              {/* Cards */}
              <Stack gap="xs">
                {colTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onOpen={() => onOpenTask(task.id)}
                    onDelete={() => onDeleteTask(task)}
                    onDragStart={() => onDragStart(task.id)}
                    onStatusChange={(s) => onUpdateStatus(task, s)}
                  />
                ))}
                {colTasks.length === 0 && (
                  <Box
                    style={{
                      border: "2px dashed var(--mantine-color-default-border)",
                      borderRadius: 6,
                      padding: "16px 8px",
                      textAlign: "center",
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      {t("Drop tasks here")}
                    </Text>
                  </Box>
                )}
              </Stack>
            </Box>
          );
        })}
      </Group>
    </Box>
  );
}

function KanbanCard({
  task,
  onOpen,
  onDelete,
  onDragStart,
  onStatusChange,
}: {
  task: ITeamProjectTask;
  onOpen: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onStatusChange: (status: ProjectTaskStatus) => void;
}) {
  const { t } = useTranslation();
  const priCfg = priorityConfig[task.priority];
  const typeCfg = issueTypeConfig[task.issueType];
  const TypeIcon = typeCfg?.icon ?? IconCheckbox;
  const pastDue = isPastDue(task.dueAt);

  return (
    <Paper
      withBorder
      radius="sm"
      p="xs"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      style={{
        cursor: "pointer",
        borderLeft: `3px solid var(--mantine-color-${priCfg?.color ?? "gray"}-5)`,
        userSelect: "none",
      }}
    >
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <ThemeIcon size={18} color={typeCfg?.color ?? "teal"} variant="light" radius="sm">
          <TypeIcon size={11} />
        </ThemeIcon>
        <div onClick={(e) => e.stopPropagation()}>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="xs">
              <IconDots size={12} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {statusOptions
              .filter((s) => s.value !== task.status)
              .map((s) => (
                <Menu.Item key={s.value} onClick={() => onStatusChange(s.value)}>
                  {t("Move to {{status}}", { status: t(statusConfig[s.value].label) })}
                </Menu.Item>
              ))}
            <Menu.Divider />
            <Menu.Item color="red" onClick={onDelete}>
              {t("Delete")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        </div>
      </Group>

      <Text size="sm" fw={500} mb={4} lineClamp={2}>
        {task.title}
      </Text>

      {(task.tags ?? []).length > 0 && (
        <Group gap={4} mb={4} wrap="wrap">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} size="xs" variant="outline" radius="sm">
              {tag}
            </Badge>
          ))}
        </Group>
      )}

      <Group justify="space-between" mt={6} wrap="nowrap">
        <Group gap={4} wrap="nowrap">
          <Badge
            size="xs"
            variant="light"
            color={priCfg?.color ?? "gray"}
            radius="sm"
          >
            {t(priCfg?.label ?? task.priority)}
          </Badge>
          {task.sprint && (
            <Badge size="xs" variant="dot" color="blue" radius="sm">
              {task.sprint}
            </Badge>
          )}
        </Group>
        <Group gap={4} wrap="nowrap">
          {task.dueAt && (
            <Text size="xs" c={pastDue ? "red" : "dimmed"} fw={pastDue ? 600 : 400}>
              {formatDate(task.dueAt)}
            </Text>
          )}
          {task.assignee && (
            <CustomAvatar
              size={20}
              name={task.assignee.name}
              avatarUrl={task.assignee.avatarUrl}
            />
          )}
        </Group>
      </Group>
    </Paper>
  );
}

// ─── Task Table ───────────────────────────────────────────────────────────────

function TaskTable({
  tasks,
  memberOptions,
  onUpdateTask,
  onOpenTask,
  onDeleteTask,
}: {
  tasks: ITeamProjectTask[];
  memberOptions: { value: string; label: string }[];
  onUpdateTask: (task: ITeamProjectTask, data: Partial<ITeamProjectTask>) => void;
  onOpenTask: (taskId: string) => void;
  onDeleteTask: (task: ITeamProjectTask) => void;
}) {
  const { t } = useTranslation();

  return (
    <Box style={{ overflowX: "auto" }}>
      <Table verticalSpacing={6} striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("Task")}</Table.Th>
            <Table.Th w={100}>{t("Type")}</Table.Th>
            <Table.Th w={130}>{t("Status")}</Table.Th>
            <Table.Th w={150}>{t("Owner")}</Table.Th>
            <Table.Th w={120}>{t("Sprint")}</Table.Th>
            <Table.Th w={100}>{t("Due")}</Table.Th>
            <Table.Th w={110}>{t("Priority")}</Table.Th>
            <Table.Th w={80} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tasks.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text c="dimmed" size="sm" ta="center" py="md">
                  {t("No tasks yet. Click + Add task to get started.")}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {tasks.map((task) => {
            const priCfg = priorityConfig[task.priority];
            const typeCfg = issueTypeConfig[task.issueType];
            const TypeIcon = typeCfg?.icon ?? IconCheckbox;
            const past = isPastDue(task.dueAt);
            return (
              <Table.Tr key={task.id} style={{ cursor: "pointer" }}>
                <Table.Td onClick={() => onOpenTask(task.id)}>
                  <Group gap={6} wrap="nowrap">
                    <Box
                      style={{
                        width: 3,
                        height: 32,
                        borderRadius: 2,
                        background: `var(--mantine-color-${priCfg?.color ?? "gray"}-5)`,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <Text size="sm" fw={500}>
                        {task.title}
                      </Text>
                      {(task.tags ?? []).length > 0 && (
                        <Group gap={4} mt={2}>
                          {task.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} size="xs" variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="nowrap">
                    <ThemeIcon size={16} color={typeCfg?.color ?? "teal"} variant="light" radius="sm">
                      <TypeIcon size={10} />
                    </ThemeIcon>
                    <Text size="xs">{t(typeCfg?.label ?? task.issueType)}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Select
                    size="xs"
                    value={task.status}
                    data={statusOptions.map((o) => ({
                      value: o.value,
                      label: t(statusConfig[o.value].label),
                    }))}
                    onChange={(v) =>
                      onUpdateTask(task, { status: (v as ProjectTaskStatus) ?? "todo" })
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <Select
                    size="xs"
                    value={task.assigneeId}
                    data={memberOptions}
                    onChange={(v) => onUpdateTask(task, { assigneeId: v })}
                    clearable
                    searchable
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    size="xs"
                    value={task.sprint ?? ""}
                    onChange={(e) =>
                      onUpdateTask(task, { sprint: e.currentTarget.value || null })
                    }
                    placeholder="-"
                  />
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c={past ? "red" : task.dueAt ? undefined : "dimmed"} fw={past ? 600 : 400}>
                    {formatDate(task.dueAt) ?? "-"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Select
                    size="xs"
                    value={task.priority}
                    data={priorityOptions.map((o) => ({
                      value: o.value,
                      label: t(priorityConfig[o.value].label),
                    }))}
                    onChange={(v) =>
                      onUpdateTask(task, { priority: (v as ProjectTaskPriority) ?? "medium" })
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label={t("Open")} withArrow>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => onOpenTask(task.id)}
                      >
                        <IconChevronRight size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t("Delete")} withArrow>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => onDeleteTask(task)}
                      >
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
    </Box>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

function TaskDetailPanel({
  task,
  projectId,
  teamId,
  members,
  memberOptions,
  onUpdateTask,
  onDeleteTask,
}: {
  task: ITeamProjectTask;
  projectId: string;
  teamId: string;
  members?: ITeamMember[];
  memberOptions: { value: string; label: string }[];
  onUpdateTask: (data: Partial<ITeamProjectTask>) => void;
  onDeleteTask: () => void;
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
    await createCommentMutation.mutateAsync({ taskId: task.id, projectId, content: comment.trim() });
    setComment("");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      await uploadAttachmentMutation.mutateAsync({ taskId: task.id, projectId, file });
    }
  };

  const priCfg = priorityConfig[task.priority];
  const stCfg = statusConfig[task.status];
  const attachments = (task as any).attachments as ITaskAttachment[] | undefined;

  return (
    <ScrollArea h="calc(100vh - 80px)" pr="xs">
      <Stack gap="md">
        {/* Title */}
        {editingTitle ? (
          <Group align="flex-start" gap="xs">
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
              style={{ flex: 1 }}
              fw={700}
            />
          </Group>
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

        {/* Status + Priority row */}
        <Group gap="xs" wrap="wrap">
          <Select
            size="xs"
            value={task.status}
            data={statusOptions.map((o) => ({
              value: o.value,
              label: t(statusConfig[o.value].label),
            }))}
            onChange={(v) => onUpdateTask({ status: (v as ProjectTaskStatus) ?? "todo" })}
            leftSection={
              <ThemeIcon size={14} color={stCfg.color} variant="transparent">
                <stCfg.icon size={12} />
              </ThemeIcon>
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
              value={task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : ""}
              onChange={(e) => onUpdateTask({ dueAt: e.currentTarget.value || null })}
            />
          </Box>
          <Box>
            <Text size="xs" c="dimmed" mb={4} fw={500}>
              {t("Sprint")}
            </Text>
            <TextInput
              size="xs"
              value={task.sprint ?? ""}
              onChange={(e) => onUpdateTask({ sprint: e.currentTarget.value || null })}
              placeholder={t("Sprint name")}
            />
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
            data={task.tags ?? []}
            value={task.tags ?? []}
            onChange={(v) => onUpdateTask({ tags: v })}
            searchable
            clearable
            comboboxProps={{ withinPortal: true }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLInputElement;
                const value = target.value.trim();
                if (value && !task.tags?.includes(value)) {
                  onUpdateTask({ tags: [...(task.tags ?? []), value] });
                }
              }
            }}
            placeholder={t("Press Enter to add tag")}
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
                        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
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
                          <Anchor href={url} target="_blank" size="xs" truncate style={{ flex: 1 }}>
                            {att.fileName}
                          </Anchor>
                        </Group>
                      ) : (
                        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                          <ThemeIcon size={32} variant="light" color="blue" radius="sm">
                            <IconFile size={18} />
                          </ThemeIcon>
                          <div style={{ minWidth: 0 }}>
                            <Anchor href={url} target="_blank" size="xs" truncate>
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
            {t("Delete task")}
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
          {new Date(comment.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
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
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  teamId: string;
  projectId: string;
  memberOptions: { value: string; label: string }[];
  onCreated: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<ProjectIssueType>("task");
  const [priority, setPriority] = useState<ProjectTaskPriority>("medium");
  const [status, setStatus] = useState<ProjectTaskStatus>("todo");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [sprint, setSprint] = useState("");
  const [storyPoints, setStoryPoints] = useState<string | number>("");
  const [dueAt, setDueAt] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const createMutation = useCreateProjectTaskMutation();

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
      sprint: sprint.trim() || undefined,
      storyPoints: storyPoints === "" ? undefined : Number(storyPoints),
      dueAt: dueAt || undefined,
      tags,
    });
    setTitle("");
    setDescription("");
    setIssueType("task");
    setPriority("medium");
    setStatus("todo");
    setAssigneeId(null);
    setSprint("");
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
        <Text fw={600} size="sm">
          {t("Create task")}
        </Text>
      }
      size="lg"
    >
      <Stack gap="sm">
        <TextInput
          label={t("Title")}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          placeholder={t("Task title")}
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
            onChange={(v) => setPriority((v as ProjectTaskPriority) ?? "medium")}
          />
          <Select
            size="sm"
            label={t("Status")}
            value={status}
            data={statusOptions.map((o) => ({
              value: o.value,
              label: t(statusConfig[o.value].label),
            }))}
            onChange={(v) => setStatus((v as ProjectTaskStatus) ?? "todo")}
          />
        </SimpleGrid>

        <SimpleGrid cols={2} spacing="xs">
          <Select
            size="sm"
            label={t("Assignee")}
            value={assigneeId}
            data={memberOptions}
            onChange={setAssigneeId}
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
          <TextInput
            size="sm"
            label={t("Sprint")}
            value={sprint}
            onChange={(e) => setSprint(e.currentTarget.value)}
            placeholder={t("Sprint 1")}
          />
          <NumberInput
            size="sm"
            label={t("Story points")}
            value={storyPoints}
            onChange={setStoryPoints}
            min={0}
            placeholder="0"
          />
        </SimpleGrid>

        <MultiSelect
          size="sm"
          label={t("Tags")}
          data={tags}
          value={tags}
          onChange={setTags}
          searchable
          clearable
          comboboxProps={{ withinPortal: true }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const target = e.target as HTMLInputElement;
              const value = target.value.trim();
              if (value && !tags.includes(value)) setTags([...tags, value]);
            }
          }}
          placeholder={t("Press Enter to add tag")}
        />

        <Textarea
          size="sm"
          label={t("Description")}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={3}
          autosize
          placeholder={t("Optional description...")}
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim()}
            loading={createMutation.isPending}
          >
            {t("Create task")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Re-export alias ──────────────────────────────────────────────────────────
export { ProjectTasksView as ProjectTasks };
