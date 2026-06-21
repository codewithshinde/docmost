import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Divider,
  Group,
  Loader,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBookmark,
  IconBolt,
  IconBug,
  IconCalendar,
  IconCheck,
  IconCheckbox,
  IconChevronLeft,
  IconChevronRight,
  IconCircle,
  IconClock,
  IconFile,
  IconHistory,
  IconPaperclip,
  IconPlus,
  IconTag,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { getAppName, getFileUrl } from "@/lib/config";
import { formatBytes } from "@/lib/utils";
import {
  DEFAULT_PROJECT_STATUSES,
  IProjectStatus,
  ISprint,
  ITaskAttachment,
  ITeamProject,
  ITeamProjectTask,
  ITeamProjectTaskComment,
  ITeamProjectTaskHistoryItem,
  ProjectIssueType,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@/features/chat/types/chat.types";
import {
  useCreateProjectTaskMutation,
  useCreateProjectTaskCommentMutation,
  useDeleteProjectTaskMutation,
  useProjectTaskCommentsQuery,
  useProjectTaskHistoryQuery,
  useProjectTasksQuery,
  useTeamProjectsQuery,
  useUpdateProjectTaskMutation,
  useUploadTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
} from "@/features/chat/queries/project-query";
import { useTeamMembersQuery } from "@/features/chat/queries/team-query";
import { useUserProjectsQuery } from "@/features/chat/queries/project-query";
import { TaskDescriptionEditor } from "@/features/chat/components/task-description-editor";

// ─── Constants (shared with panel) ───────────────────────────────────────────

const priorityConfig: Record<ProjectTaskPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "gray" },
  medium: { label: "Medium", color: "yellow" },
  high: { label: "High", color: "orange" },
  urgent: { label: "Urgent", color: "red" },
};

const issueTypeConfig: Record<ProjectIssueType, { label: string; color: string; icon: any }> = {
  task: { label: "Task", color: "teal", icon: IconCheckbox },
  bug: { label: "Bug", color: "red", icon: IconBug },
  story: { label: "Story", color: "blue", icon: IconBookmark },
  epic: { label: "Epic", color: "violet", icon: IconBolt },
};

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const issueTypeOptions = [
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "story", label: "Story" },
  { value: "epic", label: "Epic" },
];

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function getProjectStatuses(project: ITeamProject): IProjectStatus[] {
  if (project.statuses && project.statuses.length > 0) return project.statuses;
  return DEFAULT_PROJECT_STATUSES;
}

function getStatusCfg(statusId: string, projectStatuses: IProjectStatus[]): IProjectStatus {
  return (
    projectStatuses.find((s) => s.id === statusId) ?? {
      id: statusId, label: statusId, color: "gray", isDone: false,
    }
  );
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  status: "Status",
  priority: "Priority",
  issueType: "Type",
  assigneeId: "Assignee",
  sprint: "Sprint",
  storyPoints: "Story Points",
  dueAt: "Due Date",
  tags: "Tags",
  linkedTaskIds: "Linked Issues",
  description: "Description",
};

// ─── Task Page ────────────────────────────────────────────────────────────────

export default function TaskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();

  const { data: allProjects } = useUserProjectsQuery();
  const project = allProjects?.find((p) => p.id === projectId);
  const { data: tasks = [] } = useProjectTasksQuery(projectId);
  const { data: members } = useTeamMembersQuery(project?.teamId);

  const task = tasks.find((t) => t.id === taskId);

  const updateTaskMutation = useUpdateProjectTaskMutation();
  const deleteTaskMutation = useDeleteProjectTaskMutation();
  const createTaskMutation = useCreateProjectTaskMutation();

  const projectStatuses = useMemo(
    () => (project ? getProjectStatuses(project) : DEFAULT_PROJECT_STATUSES),
    [project],
  );
  const projectSprints = useMemo(() => project?.sprints ?? [], [project]);
  const projectTags = useMemo(() => project?.projectTags ?? [], [project]);

  const memberOptions = useMemo(
    () =>
      members?.map((m) => ({
        value: m.userId,
        label: m.user?.name ?? m.user?.email ?? "Unknown",
      })) ?? [],
    [members],
  );

  const handleUpdateTask = (data: Partial<ITeamProjectTask>) => {
    if (!task || !project) return;
    updateTaskMutation.mutate({
      teamId: project.teamId,
      projectId: project.id,
      taskId: task.id,
      ...data,
    });
  };

  const handleDeleteTask = () => {
    if (!task || !project) return;
    modals.openConfirmModal({
      title: t("Delete task"),
      children: <Text size="sm">{t("Delete this task permanently?")}</Text>,
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteTaskMutation.mutate({
          teamId: project.teamId,
          projectId: project.id,
          taskId: task.id,
        });
        navigate("/projects");
      },
    });
  };

  // Parent task breadcrumb
  const parentTask = task?.parentTaskId ? tasks.find((t) => t.id === task.parentTaskId) : null;

  if (!task || !project) {
    return (
      <Box style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        {tasks.length === 0 ? (
          <Loader size="sm" />
        ) : (
          <Stack align="center">
            <Text size="sm" c="dimmed">{t("Task not found")}</Text>
            <Button component={Link} to="/projects" variant="subtle" size="xs">
              {t("Back to Projects")}
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  const TypeIcon = issueTypeConfig[task.issueType]?.icon ?? IconCheckbox;
  const typeCfg = issueTypeConfig[task.issueType];

  return (
    <>
      <Helmet>
        <title>
          {task.title} - {getAppName()}
        </title>
      </Helmet>

      {/* Top bar with breadcrumbs */}
      <Box
        px="lg"
        py="sm"
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
          background: "var(--mantine-color-body)",
          flexShrink: 0,
        }}
      >
        <Group gap="xs" wrap="nowrap">
          <ActionIcon variant="subtle" size="sm" component={Link} to="/projects">
            <IconChevronLeft size={16} />
          </ActionIcon>
          <Breadcrumbs separator="/" style={{ fontSize: 13 }}>
            <Anchor component={Link} to="/projects" size="sm" c="dimmed">
              {t("Projects")}
            </Anchor>
            <Anchor
              component={Link}
              to="/projects"
              size="sm"
              c="dimmed"
              onClick={() => navigate("/projects")}
            >
              {project.name}
            </Anchor>
            {parentTask && (
              <Anchor
                component={Link}
                to={`/projects/${projectId}/tasks/${parentTask.id}`}
                size="sm"
                c="dimmed"
              >
                {parentTask.title}
              </Anchor>
            )}
            <Text size="sm" fw={500} lineClamp={1} style={{ maxWidth: 300 }}>
              {task.title}
            </Text>
          </Breadcrumbs>
          <Box style={{ marginLeft: "auto" }}>
            <Group gap="xs">
              <Badge
                variant="light"
                size="sm"
                color={typeCfg?.color ?? "teal"}
                leftSection={<TypeIcon size={10} />}
              >
                {task.parentTaskId ? "Sub-task" : t(typeCfg?.label ?? task.issueType)}
              </Badge>
            </Group>
          </Box>
        </Group>
      </Box>

      {/* Main content: two-column layout */}
      <Box
        style={{
          display: "flex",
          height: "calc(100% - 53px)",
          overflow: "hidden",
        }}
      >
        {/* Left: Main content */}
        <Box
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 32px",
            minWidth: 0,
          }}
        >
          <TaskMainContent
            task={task}
            tasks={tasks}
            project={project}
            projectStatuses={projectStatuses}
            projectSprints={projectSprints}
            projectTags={projectTags}
            memberOptions={memberOptions}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onOpenTask={(id) => navigate(`/projects/${projectId}/tasks/${id}`)}
            onCreateSubtask={async ({ title, parentTaskId }) => {
              await createTaskMutation.mutateAsync({
                teamId: project.teamId,
                projectId: project.id,
                title,
                parentTaskId,
                issueType: "task",
                priority: "medium",
                status: projectStatuses[0]?.id ?? "todo",
                tags: [],
              });
            }}
          />
        </Box>

        {/* Right: Meta sidebar */}
        <Box
          style={{
            width: 300,
            flexShrink: 0,
            borderLeft: "1px solid var(--mantine-color-default-border)",
            overflowY: "auto",
            padding: "24px 16px",
            background: "var(--mantine-color-default-hover)",
          }}
        >
          <TaskMetaSidebar
            task={task}
            projectStatuses={projectStatuses}
            projectSprints={projectSprints}
            projectTags={projectTags}
            memberOptions={memberOptions}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        </Box>
      </Box>
    </>
  );
}

// ─── Main content left panel ──────────────────────────────────────────────────

function TaskMainContent({
  task,
  tasks,
  project,
  projectStatuses,
  projectSprints,
  projectTags,
  memberOptions,
  onUpdateTask,
  onDeleteTask,
  onOpenTask,
  onCreateSubtask,
}: {
  task: ITeamProjectTask;
  tasks: ITeamProjectTask[];
  project: ITeamProject;
  projectStatuses: IProjectStatus[];
  projectSprints: ISprint[];
  projectTags: string[];
  memberOptions: { value: string; label: string }[];
  onUpdateTask: (data: Partial<ITeamProjectTask>) => void;
  onDeleteTask: () => void;
  onOpenTask: (taskId: string) => void;
  onCreateSubtask: (data: { title: string; parentTaskId: string }) => void;
}) {
  const { t } = useTranslation();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descValue, setDescValue] = useState(task.description ?? "");
  const descSaved = useRef(task.description ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: comments = [] } = useProjectTaskCommentsQuery(task.id);
  const { data: history = [] } = useProjectTaskHistoryQuery(task.id);
  const createCommentMutation = useCreateProjectTaskCommentMutation();
  const uploadAttachmentMutation = useUploadTaskAttachmentMutation();
  const deleteAttachmentMutation = useDeleteTaskAttachmentMutation();
  const [comment, setComment] = useState("");

  useEffect(() => {
    setTitleValue(task.title);
    setDescValue(task.description ?? "");
    descSaved.current = task.description ?? "";
  }, [task.id, task.title, task.description]);

  const handleSaveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) onUpdateTask({ title: trimmed });
    setEditingTitle(false);
  };

  const handleDescBlur = () => {
    if (descValue !== descSaved.current) {
      onUpdateTask({ description: descValue || null });
      descSaved.current = descValue;
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    await createCommentMutation.mutateAsync({
      taskId: task.id,
      projectId: project.id,
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
        projectId: project.id,
        file,
      });
    }
  };

  const attachments = (task as any).attachments as ITaskAttachment[] | undefined;

  // Title editing
  const titleEl = editingTitle ? (
    <TextInput
      value={titleValue}
      onChange={(e) => setTitleValue(e.currentTarget.value)}
      onBlur={handleSaveTitle}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); handleSaveTitle(); }
        if (e.key === "Escape") { setTitleValue(task.title); setEditingTitle(false); }
      }}
      autoFocus
      size="xl"
      styles={{ input: { fontSize: 24, fontWeight: 700, border: "none", padding: 0, background: "transparent" } }}
    />
  ) : (
    <Text
      fw={700}
      size="xl"
      onClick={() => setEditingTitle(true)}
      style={{ cursor: "text", lineHeight: 1.3, fontSize: 24 }}
    >
      {task.title}
    </Text>
  );

  return (
    <Stack gap="xl">
      {/* Title */}
      {titleEl}

      {/* Description */}
      <Box>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={6}>
          {t("Description")}
        </Text>
        <TaskDescriptionEditor
          value={descValue}
          onChange={setDescValue}
          onBlur={handleDescBlur}
          placeholder={t("Add a description...")}
        />
      </Box>

      {/* Sub-tasks */}
      <SubtasksSection
        task={task}
        allTasks={tasks}
        projectId={project.id}
        teamId={project.teamId}
        projectStatuses={projectStatuses}
        onOpenTask={onOpenTask}
        onCreateSubtask={onCreateSubtask}
      />

      {/* Linked issues */}
      <LinkedTasksSection
        task={task}
        allTasks={tasks}
        onUpdateTask={onUpdateTask}
        onOpenTask={onOpenTask}
      />

      {/* Attachments */}
      <Box>
        <Group justify="space-between" mb={6}>
          <Group gap={4}>
            <IconPaperclip size={14} />
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
              {t("Attachments")}
              {attachments && attachments.length > 0 && (
                <Badge size="xs" variant="light" ml={4}>{attachments.length}</Badge>
              )}
            </Text>
          </Group>
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={uploadAttachmentMutation.isPending ? <Loader size={10} /> : <IconPlus size={12} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAttachmentMutation.isPending}
          >
            {t("Upload")}
          </Button>
          <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFileSelect} />
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
                        <img src={url} alt={att.fileName} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                        <Anchor href={url} target="_blank" size="xs" truncate style={{ flex: 1 }}>{att.fileName}</Anchor>
                      </Group>
                    ) : (
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <ThemeIcon size={32} variant="light" color="blue" radius="sm"><IconFile size={18} /></ThemeIcon>
                        <div style={{ minWidth: 0 }}>
                          <Anchor href={url} target="_blank" size="xs" truncate>{att.fileName}</Anchor>
                          <Text size="xs" c="dimmed">{formatBytes(att.fileSize)}</Text>
                        </div>
                      </Group>
                    )}
                    <ActionIcon
                      size="xs" variant="subtle" color="red"
                      onClick={() => deleteAttachmentMutation.mutate({ taskId: task.id, projectId: project.id, attachmentId: att.id })}
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
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={8}>
          {t("Comments")} {comments.length > 0 && `(${comments.length})`}
        </Text>
        <Stack gap="xs">
          {comments.map((item) => <CommentItem key={item.id} comment={item} />)}
          <TextInput
            placeholder={t("Add a comment...")}
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            size="sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); }
            }}
            rightSection={
              <ActionIcon
                size="sm"
                variant="filled"
                color="blue"
                onClick={handleAddComment}
                disabled={!comment.trim()}
                loading={createCommentMutation.isPending}
              >
                <IconPlus size={12} />
              </ActionIcon>
            }
          />
        </Stack>
      </Box>

      <Divider />

      {/* History */}
      <Box>
        <Group gap={6} mb={8}>
          <IconHistory size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t("History")}
          </Text>
        </Group>
        {history.length === 0 ? (
          <Text size="xs" c="dimmed">{t("No changes recorded yet.")}</Text>
        ) : (
          <Stack gap={6}>
            {history.map((item) => (
              <HistoryItem key={item.id} item={item} />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

// ─── Right meta sidebar ───────────────────────────────────────────────────────

function TaskMetaSidebar({
  task,
  projectStatuses,
  projectSprints,
  projectTags,
  memberOptions,
  onUpdateTask,
  onDeleteTask,
}: {
  task: ITeamProjectTask;
  projectStatuses: IProjectStatus[];
  projectSprints: ISprint[];
  projectTags: string[];
  memberOptions: { value: string; label: string }[];
  onUpdateTask: (data: Partial<ITeamProjectTask>) => void;
  onDeleteTask: () => void;
}) {
  const { t } = useTranslation();
  const [tagSearch, setTagSearch] = useState("");

  const statusCfg = getStatusCfg(task.status, projectStatuses);
  const statusOptions = projectStatuses.map((s) => ({ value: s.id, label: s.label }));
  const sprintOptions = [
    ...new Set([...projectSprints.map((s) => s.name), ...(task.sprint ? [task.sprint] : [])]),
  ].map((s) => ({ value: s, label: s }));
  const tagOptions = [...new Set([...projectTags, ...(task.tags ?? []), ...(tagSearch ? [tagSearch] : [])])];

  const MetaRow = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
    <Box mb="sm">
      <Group gap={6} mb={4}>
        <Icon size={12} color="var(--mantine-color-dimmed)" />
        <Text size="xs" c="dimmed" fw={500}>{label}</Text>
      </Group>
      {children}
    </Box>
  );

  return (
    <Stack gap="xs">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>{t("Details")}</Text>

      <MetaRow icon={IconCircle} label={t("Status")}>
        <Select
          size="xs"
          value={task.status}
          data={statusOptions}
          onChange={(v) => onUpdateTask({ status: (v as ProjectTaskStatus) ?? "todo" })}
          leftSection={
            <Box style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${statusCfg.color}-5)` }} />
          }
        />
      </MetaRow>

      <MetaRow icon={IconAlertCircle} label={t("Priority")}>
        <Select
          size="xs"
          value={task.priority}
          data={priorityOptions.map((o) => ({
            value: o.value,
            label: t(priorityConfig[o.value as ProjectTaskPriority].label),
          }))}
          onChange={(v) => onUpdateTask({ priority: (v as ProjectTaskPriority) ?? "medium" })}
        />
      </MetaRow>

      <MetaRow icon={IconCheckbox} label={t("Type")}>
        <Select
          size="xs"
          value={task.issueType}
          data={issueTypeOptions.map((o) => ({
            value: o.value,
            label: t(issueTypeConfig[o.value as ProjectIssueType].label),
          }))}
          onChange={(v) => onUpdateTask({ issueType: (v as ProjectIssueType) ?? "task" })}
        />
      </MetaRow>

      <Divider my="xs" />

      <MetaRow icon={IconUser} label={t("Assignee")}>
        <Select
          size="xs"
          value={task.assigneeId}
          data={memberOptions}
          onChange={(v) => onUpdateTask({ assigneeId: v })}
          clearable
          searchable
          placeholder={t("Unassigned")}
        />
      </MetaRow>

      <MetaRow icon={IconCalendar} label={t("Due date")}>
        <TextInput
          size="xs"
          type="date"
          value={task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : ""}
          onChange={(e) => onUpdateTask({ dueAt: e.currentTarget.value || null })}
        />
      </MetaRow>

      <MetaRow icon={IconChevronRight} label={t("Sprint")}>
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
            onChange={(e) => onUpdateTask({ sprint: e.currentTarget.value || null })}
            placeholder={t("Sprint name")}
          />
        )}
      </MetaRow>

      <MetaRow icon={IconCheck} label={t("Story points")}>
        <NumberInput
          size="xs"
          value={task.storyPoints ?? ""}
          onChange={(v) => onUpdateTask({ storyPoints: v === "" ? null : Number(v) })}
          min={0}
          placeholder="0"
        />
      </MetaRow>

      <MetaRow icon={IconTag} label={t("Tags")}>
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
      </MetaRow>

      <Divider my="xs" />

      <Group gap={6} wrap="nowrap">
        <IconClock size={12} color="var(--mantine-color-dimmed)" />
        <Text size="xs" c="dimmed">{t("Created")}: {formatDateTime(task.createdAt)}</Text>
      </Group>
      {task.updatedAt !== task.createdAt && (
        <Group gap={6} wrap="nowrap">
          <IconClock size={12} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">{t("Updated")}: {formatDateTime(task.updatedAt)}</Text>
        </Group>
      )}

      <Divider my="xs" />

      <Button
        size="xs"
        variant="subtle"
        color="red"
        leftSection={<IconTrash size={12} />}
        onClick={onDeleteTask}
        fullWidth
      >
        {t("Delete issue")}
      </Button>
    </Stack>
  );
}

// ─── Sub-tasks section ────────────────────────────────────────────────────────

function SubtasksSection({
  task, allTasks, projectId, teamId, projectStatuses, onOpenTask, onCreateSubtask,
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
        <Group gap={4}>
          <IconCheckbox size={14} />
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t("Sub-tasks")}
            {subtasks.length > 0 && <Badge size="xs" variant="light" ml={4}>{subtasks.length}</Badge>}
          </Text>
        </Group>
        <Button size="compact-xs" variant="subtle" leftSection={<IconPlus size={12} />} onClick={() => setAdding(true)}>
          {t("Add")}
        </Button>
      </Group>
      <Stack gap={4}>
        {subtasks.map((sub) => {
          const statusCfg = getStatusCfg(sub.status, projectStatuses);
          const subTypeCfg = issueTypeConfig[sub.issueType] ?? issueTypeConfig.task;
          const SubIcon = subTypeCfg.icon;
          return (
            <Paper
              key={sub.id} withBorder radius="sm" px="sm" py={8}
              onClick={() => onOpenTask(sub.id)}
              style={{ cursor: "pointer", borderLeft: `3px solid var(--mantine-color-${subTypeCfg.color}-4)` }}
            >
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon size={16} color={subTypeCfg.color} variant="light" radius="sm">
                  <SubIcon size={10} />
                </ThemeIcon>
                <Text size="sm" style={{ flex: 1 }} truncate>{sub.title}</Text>
                <Badge size="xs" variant="dot" color={statusCfg.color}>{statusCfg.label}</Badge>
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
            <Button size="xs" onClick={handleAdd} disabled={!newSubtaskTitle.trim()}>{t("Add")}</Button>
            <ActionIcon size="xs" variant="subtle" onClick={() => { setAdding(false); setNewSubtaskTitle(""); }}>
              <IconX size={12} />
            </ActionIcon>
          </Group>
        )}
      </Stack>
    </Box>
  );
}

// ─── Linked tasks section ─────────────────────────────────────────────────────

function LinkedTasksSection({
  task, allTasks, onUpdateTask, onOpenTask,
}: {
  task: ITeamProjectTask;
  allTasks: ITeamProjectTask[];
  onUpdateTask: (data: Partial<ITeamProjectTask>) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const linkedIds: string[] = Array.isArray(task.linkedTaskIds) ? task.linkedTaskIds : [];
  const linkedTasks = allTasks.filter((t) => linkedIds.includes(t.id) && t.id !== task.id);
  const linkableOptions = allTasks.filter((t) => t.id !== task.id && !linkedIds.includes(t.id) && !t.parentTaskId);
  const filtered = searchValue.trim()
    ? linkableOptions.filter((t) => t.title.toLowerCase().includes(searchValue.toLowerCase()))
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
        <Group gap={4}>
          <IconFile size={14} />
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t("Linked issues")}
            {linkedTasks.length > 0 && <Badge size="xs" variant="light" ml={4}>{linkedTasks.length}</Badge>}
          </Text>
        </Group>
        <Box style={{ position: "relative" }}>
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconPlus size={12} />}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {t("Link")}
          </Button>
          {menuOpen && (
            <Paper
              withBorder
              shadow="md"
              radius="sm"
              p="xs"
              style={{ position: "absolute", right: 0, top: "100%", zIndex: 200, width: 260 }}
            >
              <TextInput
                size="xs"
                placeholder={t("Search issues...")}
                value={searchValue}
                onChange={(e) => setSearchValue(e.currentTarget.value)}
                autoFocus
                mb="xs"
              />
              {filtered.length === 0 ? (
                <Text size="xs" c="dimmed">{t("No issues found")}</Text>
              ) : (
                <Stack gap={2}>
                  {filtered.map((opt) => (
                    <Box
                      key={opt.id}
                      px="xs" py={4}
                      onClick={() => handleLink(opt.id)}
                      style={{
                        cursor: "pointer", borderRadius: 4,
                        "&:hover": { background: "var(--mantine-color-default-hover)" },
                      }}
                    >
                      <Text size="xs" truncate>{opt.title}</Text>
                    </Box>
                  ))}
                </Stack>
              )}
              <Button size="xs" variant="subtle" mt="xs" onClick={() => setMenuOpen(false)} fullWidth>{t("Close")}</Button>
            </Paper>
          )}
        </Box>
      </Group>
      {linkedIds.length > 0 && linkedTasks.length === 0 && (
        <Text size="xs" c="dimmed" fs="italic">{t("Linked tasks may be in a different project or were deleted.")}</Text>
      )}
      <Stack gap={4}>
        {linkedTasks.map((linked) => {
          const typeCfg = issueTypeConfig[linked.issueType] ?? issueTypeConfig.task;
          const LinkedIcon = typeCfg.icon;
          return (
            <Paper key={linked.id} withBorder radius="sm" px="sm" py={8}>
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon size={16} color={typeCfg.color} variant="light" radius="sm">
                  <LinkedIcon size={10} />
                </ThemeIcon>
                <Text size="xs" style={{ flex: 1, cursor: "pointer" }} truncate onClick={() => onOpenTask(linked.id)}>
                  {linked.title}
                </Text>
                <ActionIcon size="xs" variant="subtle" color="red" onClick={() => handleUnlink(linked.id)}>
                  <IconX size={10} />
                </ActionIcon>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

// ─── Comment item ─────────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: ITeamProjectTaskComment }) {
  return (
    <Paper withBorder radius="sm" p="xs">
      <Group gap="xs" mb={4} wrap="nowrap">
        <CustomAvatar size={24} name={comment.user?.name ?? "?"} avatarUrl={comment.user?.avatarUrl} />
        <Text size="xs" fw={500}>{comment.user?.name ?? "Unknown"}</Text>
        <Text size="xs" c="dimmed">{formatDateTime(comment.createdAt)}</Text>
      </Group>
      <Text size="sm" style={{ whiteSpace: "pre-wrap", paddingLeft: 32 }}>{comment.content}</Text>
    </Paper>
  );
}

// ─── History item ─────────────────────────────────────────────────────────────

function HistoryItem({ item }: { item: ITeamProjectTaskHistoryItem }) {
  const fieldLabel = FIELD_LABELS[item.fieldChanged] ?? item.fieldChanged;

  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <CustomAvatar size={20} name={item.user?.name ?? "?"} avatarUrl={item.user?.avatarUrl} />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group gap={4} wrap="wrap">
          <Text size="xs" fw={500}>{item.user?.name ?? "Someone"}</Text>
          <Text size="xs" c="dimmed">changed</Text>
          <Text size="xs" fw={500} c="blue">{fieldLabel}</Text>
          {item.oldValue && item.newValue && (
            <>
              <Text size="xs" c="dimmed">from</Text>
              <Badge size="xs" variant="outline" color="gray">{item.oldValue}</Badge>
              <Text size="xs" c="dimmed">to</Text>
              <Badge size="xs" variant="filled" color="blue">{item.newValue}</Badge>
            </>
          )}
          {!item.oldValue && item.newValue && (
            <>
              <Text size="xs" c="dimmed">to</Text>
              <Badge size="xs" variant="filled" color="blue">{item.newValue}</Badge>
            </>
          )}
        </Group>
        <Text size="xs" c="dimmed">{formatDateTime(item.createdAt)}</Text>
      </Box>
    </Group>
  );
}
