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
  Modal,
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
  IconExternalLink,
  IconFile,
  IconFileText,
  IconHistory,
  IconLink,
  IconPaperclip,
  IconPencil,
  IconPlus,
  IconSearch,
  IconShare,
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
import { searchPage } from "@/features/search/services/search-service";
import { IPageSearch } from "@/features/search/types/search.types";

// ─── Constants ────────────────────────────────────────────────────────────────

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
  linkedPageIds: "Linked Pages",
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

  const parentTask = task?.parentTaskId ? tasks.find((t) => t.id === task.parentTaskId) : null;
  const shareUrl = window.location.href;
  const [copiedLink, setCopiedLink] = useState(false);

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

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
  const priCfg = priorityConfig[task.priority];
  const statusCfg = getStatusCfg(task.status, projectStatuses);
  const ticketLabel = task.ticketNumber ? `#${task.ticketNumber}` : null;

  return (
    <>
      <Helmet>
        <title>
          {ticketLabel ? `${ticketLabel} ${task.title}` : task.title} - {getAppName()}
        </title>
      </Helmet>

      {/* Top bar */}
      <Box
        px="md"
        py="xs"
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
          background: "var(--mantine-color-body)",
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <ActionIcon variant="subtle" size="sm" component={Link} to="/projects">
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Breadcrumbs separator="/" style={{ fontSize: 13, minWidth: 0 }}>
              <Anchor component={Link} to="/projects" size="sm" c="dimmed">
                {t("Projects")}
              </Anchor>
              <Anchor component={Link} to="/projects" size="sm" c="dimmed">
                {project.name}
              </Anchor>
              {parentTask && (
                <Anchor
                  component={Link}
                  to={`/projects/${projectId}/tasks/${parentTask.id}`}
                  size="sm"
                  c="dimmed"
                >
                  {parentTask.ticketNumber ? `#${parentTask.ticketNumber}` : parentTask.title}
                </Anchor>
              )}
              <Text size="sm" fw={500} lineClamp={1} style={{ maxWidth: 260 }}>
                {ticketLabel && <Text span c="dimmed" mr={4}>{ticketLabel}</Text>}
                {task.title}
              </Text>
            </Breadcrumbs>
          </Group>

          <Group gap="xs" wrap="nowrap">
            {/* Status badge */}
            <Badge
              variant="light"
              size="sm"
              color={statusCfg.color}
            >
              {statusCfg.label}
            </Badge>

            {/* Priority badge */}
            <Badge
              variant="dot"
              size="sm"
              color={priCfg?.color ?? "gray"}
            >
              {priCfg?.label ?? task.priority}
            </Badge>

            {/* Issue type */}
            <Badge
              variant="light"
              size="sm"
              color={typeCfg?.color ?? "teal"}
              leftSection={<TypeIcon size={10} />}
            >
              {task.parentTaskId ? "Sub-task" : t(typeCfg?.label ?? task.issueType)}
            </Badge>

            {/* Share link */}
            <Tooltip label={copiedLink ? t("Link copied!") : t("Copy link")} withArrow>
              <ActionIcon
                variant={copiedLink ? "filled" : "subtle"}
                color={copiedLink ? "green" : "gray"}
                size="sm"
                onClick={copyShareUrl}
              >
                {copiedLink ? <IconCheck size={14} /> : <IconShare size={14} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Box>

      {/* Main content: two-column layout */}
      <Box
        style={{
          display: "flex",
          height: "calc(100% - 49px)",
          overflow: "hidden",
        }}
      >
        {/* Left: Main content */}
        <Box
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 36px",
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
            width: 280,
            flexShrink: 0,
            borderLeft: "1px solid var(--mantine-color-default-border)",
            overflowY: "auto",
            padding: "24px 16px",
            background: "var(--mantine-color-default-hover)",
          }}
        >
          <TaskMetaSidebar
            task={task}
            projectId={projectId}
            projectStatuses={projectStatuses}
            projectSprints={projectSprints}
            projectTags={projectTags}
            memberOptions={memberOptions}
            shareUrl={shareUrl}
            onCopyShareUrl={copyShareUrl}
            copiedLink={copiedLink}
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
  const [editingIssue, setEditingIssue] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descValue, setDescValue] = useState(task.description ?? "");
  const descSaved = useRef(task.description ?? "");
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
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

  const handleSaveIssue = () => {
    const nextTitle = titleValue.trim();
    const data: Partial<ITeamProjectTask> = {};
    if (nextTitle && nextTitle !== task.title) data.title = nextTitle;
    if (descValue !== descSaved.current) {
      data.description = descValue || null;
      descSaved.current = descValue;
    }
    if (Object.keys(data).length > 0) onUpdateTask(data);
    setEditingIssue(false);
  };

  const handleCancelIssueEdit = () => {
    setTitleValue(task.title);
    setDescValue(task.description ?? "");
    setEditingIssue(false);
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

  const mentionOptions = memberOptions.filter((member) =>
    comment.includes("@")
      ? member.label.toLowerCase().includes(comment.split("@").pop()?.toLowerCase() ?? "")
      : false,
  ).slice(0, 5);

  const insertMention = (label: string) => {
    const beforeAt = comment.lastIndexOf("@");
    const nextComment = beforeAt >= 0
      ? `${comment.slice(0, beforeAt)}@${label} `
      : `${comment}@${label} `;
    setComment(nextComment);
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
  const typeCfg = issueTypeConfig[task.issueType];
  const priCfg = priorityConfig[task.priority];
  const ticketLabel = task.ticketNumber ? `#${task.ticketNumber}` : null;

  return (
    <Stack gap="xl">
      <Modal
        opened={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title={<Text fw={700} size="sm">{previewImage?.name}</Text>}
        size="xl"
        centered
      >
        {previewImage && (
          <Box style={{ display: "flex", justifyContent: "center" }}>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", borderRadius: 6 }}
            />
          </Box>
        )}
      </Modal>

      {/* Ticket number + type breadcrumb */}
      <Group gap="xs" wrap="nowrap">
        {ticketLabel && (
          <Badge
            size="lg"
            variant="outline"
            color="gray"
            radius="sm"
            style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}
          >
            {ticketLabel}
          </Badge>
        )}
        <Badge
          size="sm"
          variant="light"
          color={typeCfg?.color ?? "teal"}
          leftSection={typeCfg ? <typeCfg.icon size={10} /> : null}
        >
          {task.parentTaskId ? "Sub-task" : t(typeCfg?.label ?? task.issueType)}
        </Badge>
        <Badge size="sm" variant="dot" color={priCfg?.color ?? "gray"}>
          {priCfg?.label ?? task.priority}
        </Badge>
        <Text size="xs" c="dimmed" style={{ marginLeft: "auto" }}>
          {formatDateTime(task.createdAt)}
        </Text>
        {editingIssue ? (
          <Group gap="xs">
            <Button size="xs" variant="subtle" color="gray" onClick={handleCancelIssueEdit}>
              {t("Cancel")}
            </Button>
            <Button size="xs" onClick={handleSaveIssue} disabled={!titleValue.trim()}>
              {t("Save issue")}
            </Button>
          </Group>
        ) : (
          <Button size="xs" variant="light" leftSection={<IconPencil size={12} />} onClick={() => setEditingIssue(true)}>
            {t("Edit issue")}
          </Button>
        )}
      </Group>

      {/* Title */}
      {editingIssue ? (
        <TextInput
          value={titleValue}
          onChange={(e) => setTitleValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSaveIssue(); }
            if (e.key === "Escape") handleCancelIssueEdit();
          }}
          autoFocus
          size="xl"
          styles={{ input: { fontSize: 24, fontWeight: 700, border: "none", padding: 0, background: "transparent" } }}
        />
      ) : (
        <Text
          fw={700}
          size="xl"
          style={{ lineHeight: 1.3, fontSize: 24 }}
        >
          {task.title}
        </Text>
      )}

      {/* Description */}
      <Box>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={8}>
          {t("Description")}
        </Text>
        {editingIssue ? (
          <TaskDescriptionEditor
            value={descValue}
            onChange={setDescValue}
            placeholder={t("Add a rich description... Supports formatting, headings, code blocks, and more.")}
          />
        ) : (
          <TaskDescriptionEditor
            value={task.description ?? ""}
            onChange={() => {}}
            readOnly
            placeholder={t("No description yet.")}
          />
        )}
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

      {/* Linked Pages */}
      <LinkedPagesSection
        task={task}
        onUpdateTask={onUpdateTask}
      />

      {/* Attachments */}
      <Box>
        <Group justify="space-between" mb={8}>
          <Group gap={6}>
            <IconPaperclip size={14} color="var(--mantine-color-dimmed)" />
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
                <Paper key={att.id} withBorder radius="sm" p="sm">
                  <Group justify="space-between" wrap="nowrap">
                    {isImage ? (
                      <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Box
                          style={{
                            width: 60,
                            height: 60,
                            flexShrink: 0,
                            borderRadius: 6,
                            overflow: "hidden",
                            border: "1px solid var(--mantine-color-default-border)",
                            cursor: "pointer",
                          }}
                          onClick={() => setPreviewImage({ url, name: att.fileName })}
                        >
                          <img src={url} alt={att.fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </Box>
                        <Box style={{ minWidth: 0 }}>
                          <Anchor component="button" type="button" onClick={() => setPreviewImage({ url, name: att.fileName })} size="xs" truncate fw={500}>
                            {att.fileName}
                          </Anchor>
                          <Text size="xs" c="dimmed">{formatBytes(att.fileSize)}</Text>
                        </Box>
                      </Group>
                    ) : (
                      <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <ThemeIcon size={40} variant="light" color="blue" radius="sm"><IconFile size={22} /></ThemeIcon>
                        <div style={{ minWidth: 0 }}>
                          <Anchor href={url} target="_blank" size="xs" truncate fw={500}>{att.fileName}</Anchor>
                          <Text size="xs" c="dimmed">{formatBytes(att.fileSize)}</Text>
                        </div>
                      </Group>
                    )}
                    <ActionIcon
                      size="sm" variant="subtle" color="red"
                      onClick={() => deleteAttachmentMutation.mutate({ taskId: task.id, projectId: project.id, attachmentId: att.id })}
                    >
                      <IconX size={14} />
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
        <Group gap={6} mb={10}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t("Comments")} {comments.length > 0 && `(${comments.length})`}
          </Text>
        </Group>
        <Stack gap="sm">
          {comments.map((item) => <CommentItem key={item.id} comment={item} />)}
          {mentionOptions.length > 0 && (
            <Paper withBorder radius="sm" p={4}>
              <Group gap={4}>
                {mentionOptions.map((member) => (
                  <Button
                    key={member.value}
                    size="compact-xs"
                    variant="subtle"
                    leftSection={<IconUser size={11} />}
                    onClick={() => insertMention(member.label)}
                  >
                    {member.label}
                  </Button>
                ))}
              </Group>
            </Paper>
          )}
          <TextInput
            placeholder={t("Add a comment... (Enter to submit)")}
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
  projectId,
  projectStatuses,
  projectSprints,
  projectTags,
  memberOptions,
  shareUrl,
  onCopyShareUrl,
  copiedLink,
  onUpdateTask,
  onDeleteTask,
}: {
  task: ITeamProjectTask;
  projectId?: string;
  projectStatuses: IProjectStatus[];
  projectSprints: ISprint[];
  projectTags: string[];
  memberOptions: { value: string; label: string }[];
  shareUrl: string;
  onCopyShareUrl: () => void;
  copiedLink: boolean;
  onUpdateTask: (data: Partial<ITeamProjectTask>) => void;
  onDeleteTask: () => void;
}) {
  const { t } = useTranslation();
  const [tagSearch, setTagSearch] = useState("");

  const statusCfg = getStatusCfg(task.status, projectStatuses);
  const priCfg = priorityConfig[task.priority];
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
      {/* Ticket ID */}
      {task.ticketNumber && (
        <Box mb="sm">
          <Text size="xs" c="dimmed" fw={500} mb={4}>Ticket ID</Text>
          <Group gap="xs">
            <Badge
              variant="outline"
              color="gray"
              radius="sm"
              style={{ fontFamily: "monospace", fontWeight: 700 }}
            >
              #{task.ticketNumber}
            </Badge>
            <Tooltip label={copiedLink ? "Copied!" : "Copy shareable link"} withArrow>
              <ActionIcon size="xs" variant={copiedLink ? "filled" : "subtle"} color={copiedLink ? "green" : "gray"} onClick={onCopyShareUrl}>
                {copiedLink ? <IconCheck size={10} /> : <IconLink size={10} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Box>
      )}

      <Divider my={4} />
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
          leftSection={
            <Box style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--mantine-color-${priCfg?.color ?? "gray"}-5)` }} />
          }
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
  const done = subtasks.filter((s) => {
    const sc = projectStatuses.find((ps) => ps.id === s.status);
    return sc?.isDone;
  }).length;

  const handleAdd = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    onCreateSubtask({ title, parentTaskId: task.id });
    setNewSubtaskTitle("");
    setAdding(false);
  };

  return (
    <Box>
      <Group justify="space-between" mb={8}>
        <Group gap={6}>
          <IconCheckbox size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t("Sub-tasks")}
            {subtasks.length > 0 && (
              <Text span ml={6} size="xs" c="dimmed">({done}/{subtasks.length})</Text>
            )}
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
              style={{
                cursor: "pointer",
                borderLeft: `3px solid var(--mantine-color-${subTypeCfg.color}-4)`,
              }}
            >
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon size={16} color={subTypeCfg.color} variant="light" radius="sm">
                  <SubIcon size={10} />
                </ThemeIcon>
                {sub.ticketNumber && (
                  <Text size="xs" c="dimmed" fw={600} style={{ fontFamily: "monospace", flexShrink: 0 }}>
                    #{sub.ticketNumber}
                  </Text>
                )}
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
      <Group justify="space-between" mb={8}>
        <Group gap={6}>
          <IconLink size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t("Linked issues")}
            {linkedTasks.length > 0 && <Badge size="xs" variant="light" ml={4}>{linkedTasks.length}</Badge>}
          </Text>
        </Group>
        <Box style={{ position: "relative" }}>
          <Button size="compact-xs" variant="subtle" leftSection={<IconPlus size={12} />} onClick={() => setMenuOpen(!menuOpen)}>
            {t("Link")}
          </Button>
          {menuOpen && (
            <Paper
              withBorder shadow="md" radius="sm" p="xs"
              style={{ position: "absolute", right: 0, top: "100%", zIndex: 200, width: 280 }}
            >
              <TextInput
                size="xs"
                placeholder={t("Search issues...")}
                leftSection={<IconSearch size={12} />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.currentTarget.value)}
                autoFocus
                mb="xs"
              />
              {filtered.length === 0 ? (
                <Text size="xs" c="dimmed" py="xs">{t("No issues found")}</Text>
              ) : (
                <Stack gap={2}>
                  {filtered.map((opt) => {
                    const tc = issueTypeConfig[opt.issueType] ?? issueTypeConfig.task;
                    const TI = tc.icon;
                    return (
                      <Box
                        key={opt.id}
                        px="xs" py={6}
                        onClick={() => handleLink(opt.id)}
                        style={{ cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <ThemeIcon size={16} color={tc.color} variant="light" radius="sm"><TI size={10} /></ThemeIcon>
                        {opt.ticketNumber && <Text size="xs" c="dimmed" fw={600} style={{ flexShrink: 0, fontFamily: "monospace" }}>#{opt.ticketNumber}</Text>}
                        <Text size="xs" truncate style={{ flex: 1 }}>{opt.title}</Text>
                      </Box>
                    );
                  })}
                </Stack>
              )}
              <Button size="xs" variant="subtle" mt="xs" onClick={() => setMenuOpen(false)} fullWidth>{t("Close")}</Button>
            </Paper>
          )}
        </Box>
      </Group>
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
                {linked.ticketNumber && (
                  <Text size="xs" c="dimmed" fw={600} style={{ flexShrink: 0, fontFamily: "monospace" }}>
                    #{linked.ticketNumber}
                  </Text>
                )}
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

// ─── Linked Pages section ─────────────────────────────────────────────────────

function LinkedPagesSection({
  task,
  onUpdateTask,
}: {
  task: ITeamProjectTask;
  onUpdateTask: (data: Partial<ITeamProjectTask>) => void;
}) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<IPageSearch[]>([]);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const linkedPageIds: string[] = Array.isArray(task.linkedPageIds) ? task.linkedPageIds : [];

  // We keep a local cache of fetched page info
  const [pageCache, setPageCache] = useState<Record<string, IPageSearch>>({});

  const handleSearch = async (query: string) => {
    setSearchValue(query);
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await searchPage({ query });
      setSearchResults(results.filter((p) => !linkedPageIds.includes(p.id)));
      // Cache results for display
      const newCache: Record<string, IPageSearch> = { ...pageCache };
      for (const r of results) newCache[r.id] = r;
      setPageCache(newCache);
    } finally {
      setSearching(false);
    }
  };

  const handleLink = (page: IPageSearch) => {
    const newCache = { ...pageCache, [page.id]: page };
    setPageCache(newCache);
    onUpdateTask({ linkedPageIds: [...linkedPageIds, page.id] });
    setSearchValue("");
    setSearchResults([]);
  };

  const handleUnlink = (pageId: string) => {
    onUpdateTask({ linkedPageIds: linkedPageIds.filter((id) => id !== pageId) });
  };

  const linkedPages = linkedPageIds.map((id) => pageCache[id] ?? { id, title: "Linked page", slugId: "", space: {} as IPageSearch["space"] });

  return (
    <Box>
      <Group justify="space-between" mb={8}>
        <Group gap={6}>
          <IconFileText size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t("Linked pages")}
            {linkedPageIds.length > 0 && <Badge size="xs" variant="light" ml={4}>{linkedPageIds.length}</Badge>}
          </Text>
        </Group>
        <Box style={{ position: "relative" }}>
          <Button size="compact-xs" variant="subtle" leftSection={<IconPlus size={12} />} onClick={() => setMenuOpen(!menuOpen)}>
            {t("Link page")}
          </Button>
          {menuOpen && (
            <Paper
              withBorder shadow="md" radius="sm" p="xs"
              style={{ position: "absolute", right: 0, top: "100%", zIndex: 200, width: 300 }}
            >
              <TextInput
                size="xs"
                placeholder={t("Search space pages...")}
                leftSection={searching ? <Loader size={12} /> : <IconSearch size={12} />}
                value={searchValue}
                onChange={(e) => handleSearch(e.currentTarget.value)}
                autoFocus
                mb="xs"
              />
              {searchResults.length === 0 && searchValue && !searching && (
                <Text size="xs" c="dimmed" py="xs">{t("No pages found")}</Text>
              )}
              {searchResults.length === 0 && !searchValue && (
                <Text size="xs" c="dimmed" py="xs">{t("Type to search pages in all spaces...")}</Text>
              )}
              {searchResults.length > 0 && (
                <Stack gap={2}>
                  {searchResults.slice(0, 8).map((page) => (
                    <Box
                      key={page.id}
                      px="xs" py={6}
                      onClick={() => handleLink(page)}
                      style={{ cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <IconFileText size={14} color="var(--mantine-color-blue-5)" />
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" truncate fw={500}>{page.title || t("Untitled")}</Text>
                        {page.space?.name && <Text size="xs" c="dimmed">{page.space.name}</Text>}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
              <Button size="xs" variant="subtle" mt="xs" onClick={() => setMenuOpen(false)} fullWidth>{t("Close")}</Button>
            </Paper>
          )}
        </Box>
      </Group>
      <Stack gap={4}>
        {linkedPages.map((page) => (
          <Paper key={page.id} withBorder radius="sm" px="sm" py={8}>
            <Group gap="xs" wrap="nowrap">
              <IconFileText size={14} color="var(--mantine-color-blue-5)" />
              <Box style={{ flex: 1, minWidth: 0 }}>
                {page.slugId ? (
                  <Anchor
                    href={`/s/${page.space?.slug ?? ""}/${page.slugId}`}
                    target="_blank"
                    size="xs"
                    fw={500}
                    truncate
                  >
                    {page.title || t("Untitled")}
                  </Anchor>
                ) : (
                  <Text size="xs" fw={500} truncate>{page.title || t("Linked page")}</Text>
                )}
                {page.space?.name && <Text size="xs" c="dimmed">{page.space.name}</Text>}
              </Box>
              {page.slugId && (
                <ActionIcon size="xs" variant="subtle" href={`/s/${page.space?.slug ?? ""}/${page.slugId}`} component="a" target="_blank">
                  <IconExternalLink size={10} />
                </ActionIcon>
              )}
              <ActionIcon size="xs" variant="subtle" color="red" onClick={() => handleUnlink(page.id)}>
                <IconX size={10} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Comment item ─────────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: ITeamProjectTaskComment }) {
  return (
    <Paper withBorder radius="sm" p="sm">
      <Group gap="xs" mb={6} wrap="nowrap">
        <CustomAvatar size={28} name={comment.user?.name ?? "?"} avatarUrl={comment.user?.avatarUrl} />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={600}>{comment.user?.name ?? "Unknown"}</Text>
          <Text size="xs" c="dimmed">{formatDateTime(comment.createdAt)}</Text>
        </Box>
      </Group>
      <Box pl={36}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{comment.content}</Text>
      </Box>
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
              <Text size="xs" c="dimmed">set to</Text>
              <Badge size="xs" variant="filled" color="blue">{item.newValue}</Badge>
            </>
          )}
        </Group>
        <Text size="xs" c="dimmed">{formatDateTime(item.createdAt)}</Text>
      </Box>
    </Group>
  );
}
