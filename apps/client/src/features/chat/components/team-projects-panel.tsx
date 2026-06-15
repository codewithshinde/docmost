import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  IconDots,
  IconLayoutKanban,
  IconPlus,
  IconTable,
  IconTrash,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import {
  ITeamMember,
  ITeamProject,
  ITeamProjectTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectView,
} from "../types/chat.types";
import {
  useCreateProjectMutation,
  useCreateProjectTaskMutation,
  useDeleteProjectMutation,
  useDeleteProjectTaskMutation,
  useProjectTasksQuery,
  useTeamProjectsQuery,
  useUpdateProjectMutation,
  useUpdateProjectTaskMutation,
} from "../queries/project-query";

const statusOptions: { value: ProjectTaskStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

const priorityOptions: { value: ProjectTaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const viewOptions: { value: ProjectView; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "kanban", label: "Board" },
  { value: "calendar", label: "Calendar" },
];

interface TeamProjectsPanelProps {
  teamId: string;
  members?: ITeamMember[];
}

export function TeamProjectsPanel({ teamId, members }: TeamProjectsPanelProps) {
  const { t } = useTranslation();
  const { data: projects } = useTeamProjectsQuery(teamId);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = projects?.find(
    (project) => project.id === activeProjectId,
  );

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

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <ProjectList
        teamId={teamId}
        projects={projects ?? []}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
      />
      {activeProject ? (
        <ProjectTasks
          teamId={teamId}
          project={activeProject}
          members={members}
        />
      ) : (
        <Stack gap={4}>
          <Text fw={500}>{t("Team projects")}</Text>
          <Text size="sm" c="dimmed">
            {t(
              "Create a project to track tasks, owners, due dates, and status.",
            )}
          </Text>
        </Stack>
      )}
    </SimpleGrid>
  );
}

function ProjectList({
  teamId,
  projects,
  activeProjectId,
  onSelectProject,
}: {
  teamId: string;
  projects: ITeamProject[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [view, setView] = useState<ProjectView>("table");
  const createProjectMutation = useCreateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();

  const handleCreate = async () => {
    if (!name.trim()) return;
    const project = await createProjectMutation.mutateAsync({
      teamId,
      name: name.trim(),
      description: description.trim(),
      view,
    });
    setName("");
    setDescription("");
    setView("table");
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
      onConfirm: () =>
        deleteProjectMutation.mutate({
          teamId,
          projectId: project.id,
        }),
    });
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <div>
          <Text fw={500}>{t("Projects")}</Text>
          <Text size="xs" c="dimmed">
            {t(
              "Structured team workspaces with table, board, and calendar views.",
            )}
          </Text>
        </div>
      </Group>

      <Stack gap="xs">
        <TextInput
          label={t("Project name")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t("e.g. Launch plan")}
        />
        <Textarea
          label={t("Description")}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          minRows={2}
          autosize
        />
        <Group align="flex-end">
          <Select
            label={t("Default view")}
            data={viewOptions.map((item) => ({
              value: item.value,
              label: t(item.label),
            }))}
            value={view}
            onChange={(value) => setView((value as ProjectView) ?? "table")}
            leftSection={
              view === "kanban" ? (
                <IconLayoutKanban size={16} />
              ) : (
                <IconTable size={16} />
              )
            }
            style={{ flex: 1 }}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreate}
            disabled={!name.trim()}
            loading={createProjectMutation.isPending}
          >
            {t("Create")}
          </Button>
        </Group>
      </Stack>

      <Divider />

      <Stack gap={6}>
        {projects.map((project) => {
          const done = Number(project.doneTaskCount ?? 0);
          const total = Number(project.taskCount ?? 0);
          return (
            <Paper
              key={project.id}
              withBorder
              radius="sm"
              p="sm"
              style={{ cursor: "pointer" }}
              data-active={project.id === activeProjectId}
              onClick={() => onSelectProject(project.id)}
            >
              <Group justify="space-between" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>
                    {project.name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {project.description || t("No description")}
                  </Text>
                </div>
                <Group gap="xs" wrap="nowrap">
                  <Badge variant="light" size="sm">
                    {done}/{total}
                  </Badge>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={(event) => {
                      event.stopPropagation();
                      confirmDelete(project);
                    }}
                    aria-label={t("Delete project")}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}

function ProjectTasks({
  teamId,
  project,
  members,
}: {
  teamId: string;
  project: ITeamProject;
  members?: ITeamMember[];
}) {
  const { t } = useTranslation();
  const { data: tasks } = useProjectTasksQuery(project.id);
  const updateProjectMutation = useUpdateProjectMutation();
  const createTaskMutation = useCreateProjectTaskMutation();
  const updateTaskMutation = useUpdateProjectTaskMutation();
  const deleteTaskMutation = useDeleteProjectTaskMutation();

  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<ProjectTaskPriority>("medium");

  const memberOptions = useMemo(
    () =>
      members?.map((member) => ({
        value: member.userId,
        label: member.user?.name ?? member.user?.email ?? t("Unknown user"),
      })) ?? [],
    [members, t],
  );

  const handleCreateTask = async () => {
    if (!title.trim()) return;
    await createTaskMutation.mutateAsync({
      teamId,
      projectId: project.id,
      title: title.trim(),
      assigneeId: assigneeId ?? undefined,
      dueAt: dueAt || undefined,
      priority,
    });
    setTitle("");
    setAssigneeId(null);
    setDueAt("");
    setPriority("medium");
  };

  const updateTask = (
    task: ITeamProjectTask,
    data: Partial<Pick<ITeamProjectTask, "status" | "priority" | "assigneeId">>,
  ) => {
    updateTaskMutation.mutate({
      teamId,
      projectId: project.id,
      taskId: task.id,
      ...data,
    });
  };

  const taskList = tasks ?? [];
  const view = project.view;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <div style={{ minWidth: 0 }}>
          <Text fw={500} truncate>
            {project.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {project.description || t("No description")}
          </Text>
        </div>
        <Select
          w={130}
          value={view}
          data={viewOptions.map((item) => ({
            value: item.value,
            label: t(item.label),
          }))}
          onChange={(value) =>
            updateProjectMutation.mutate({
              teamId,
              projectId: project.id,
              view: (value as ProjectView) ?? "table",
            })
          }
        />
      </Group>

      <Group align="flex-end" gap="xs">
        <TextInput
          label={t("Task")}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          placeholder={t("Add a task")}
          style={{ flex: 1 }}
        />
        <Select
          label={t("Owner")}
          data={memberOptions}
          value={assigneeId}
          onChange={setAssigneeId}
          clearable
          searchable
          w={150}
        />
        <TextInput
          label={t("Due")}
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.currentTarget.value)}
          w={140}
        />
        <Select
          label={t("Priority")}
          data={priorityOptions.map((item) => ({
            value: item.value,
            label: t(item.label),
          }))}
          value={priority}
          onChange={(value) =>
            setPriority((value as ProjectTaskPriority) ?? "medium")
          }
          w={120}
        />
        <Button
          onClick={handleCreateTask}
          disabled={!title.trim()}
          loading={createTaskMutation.isPending}
        >
          {t("Add")}
        </Button>
      </Group>

      {view === "kanban" ? (
        <KanbanTasks
          tasks={taskList}
          onUpdateStatus={(task, status) => updateTask(task, { status })}
          onDeleteTask={(task) =>
            deleteTaskMutation.mutate({
              teamId,
              projectId: project.id,
              taskId: task.id,
            })
          }
        />
      ) : (
        <TaskTable
          tasks={taskList}
          memberOptions={memberOptions}
          onUpdateTask={updateTask}
          onDeleteTask={(task) =>
            deleteTaskMutation.mutate({
              teamId,
              projectId: project.id,
              taskId: task.id,
            })
          }
          calendarMode={view === "calendar"}
        />
      )}
    </Stack>
  );
}

function TaskTable({
  tasks,
  memberOptions,
  calendarMode,
  onUpdateTask,
  onDeleteTask,
}: {
  tasks: ITeamProjectTask[];
  memberOptions: { value: string; label: string }[];
  calendarMode: boolean;
  onUpdateTask: (
    task: ITeamProjectTask,
    data: Partial<Pick<ITeamProjectTask, "status" | "priority" | "assigneeId">>,
  ) => void;
  onDeleteTask: (task: ITeamProjectTask) => void;
}) {
  const { t } = useTranslation();
  const visibleTasks = calendarMode
    ? [...tasks].sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    : tasks;

  return (
    <Box style={{ overflowX: "auto" }}>
      <Table verticalSpacing={6}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("Task")}</Table.Th>
            <Table.Th>{t("Status")}</Table.Th>
            <Table.Th>{t("Owner")}</Table.Th>
            <Table.Th>{t("Due")}</Table.Th>
            <Table.Th>{t("Priority")}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visibleTasks.map((task) => (
            <Table.Tr key={task.id}>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {task.title}
                </Text>
              </Table.Td>
              <Table.Td>
                <Select
                  size="xs"
                  value={task.status}
                  data={statusOptions.map((item) => ({
                    value: item.value,
                    label: t(item.label),
                  }))}
                  onChange={(value) =>
                    onUpdateTask(task, {
                      status: (value as ProjectTaskStatus) ?? "todo",
                    })
                  }
                />
              </Table.Td>
              <Table.Td>
                <Select
                  size="xs"
                  value={task.assigneeId}
                  data={memberOptions}
                  onChange={(value) =>
                    onUpdateTask(task, { assigneeId: value })
                  }
                  clearable
                  searchable
                />
              </Table.Td>
              <Table.Td>
                <Text size="xs" c={task.dueAt ? undefined : "dimmed"}>
                  {task.dueAt
                    ? new Date(task.dueAt).toLocaleDateString()
                    : t("No date")}
                </Text>
              </Table.Td>
              <Table.Td>
                <Select
                  size="xs"
                  value={task.priority}
                  data={priorityOptions.map((item) => ({
                    value: item.value,
                    label: t(item.label),
                  }))}
                  onChange={(value) =>
                    onUpdateTask(task, {
                      priority: (value as ProjectTaskPriority) ?? "medium",
                    })
                  }
                />
              </Table.Td>
              <Table.Td>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => onDeleteTask(task)}
                  aria-label={t("Delete task")}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

function KanbanTasks({
  tasks,
  onUpdateStatus,
  onDeleteTask,
}: {
  tasks: ITeamProjectTask[];
  onUpdateStatus: (task: ITeamProjectTask, status: ProjectTaskStatus) => void;
  onDeleteTask: (task: ITeamProjectTask) => void;
}) {
  const { t } = useTranslation();

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      {statusOptions.map((status) => (
        <Box
          key={status.value}
          p="xs"
          style={{
            border: "1px solid var(--mantine-color-gray-3)",
            borderRadius: 6,
            minHeight: 120,
          }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600}>
              {t(status.label)}
            </Text>
            <Badge variant="light" size="sm">
              {tasks.filter((task) => task.status === status.value).length}
            </Badge>
          </Group>
          <Stack gap="xs">
            {tasks
              .filter((task) => task.status === status.value)
              .map((task) => (
                <Paper key={task.id} withBorder radius="sm" p="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>
                        {task.title}
                      </Text>
                      <Group gap={6} mt={4} wrap="nowrap">
                        <Badge size="xs" variant="light">
                          {t(
                            priorityOptions.find(
                              (p) => p.value === task.priority,
                            )?.label ?? task.priority,
                          )}
                        </Badge>
                        {task.assignee && (
                          <CustomAvatar
                            size={20}
                            name={task.assignee.name}
                            avatarUrl={task.assignee.avatarUrl}
                          />
                        )}
                      </Group>
                    </div>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {statusOptions
                          .filter((item) => item.value !== task.status)
                          .map((item) => (
                            <Menu.Item
                              key={item.value}
                              onClick={() => onUpdateStatus(task, item.value)}
                            >
                              {t("Move to {{status}}", {
                                status: t(item.label),
                              })}
                            </Menu.Item>
                          ))}
                        <Menu.Item
                          color="red"
                          onClick={() => onDeleteTask(task)}
                        >
                          {t("Delete task")}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Paper>
              ))}
          </Stack>
        </Box>
      ))}
    </SimpleGrid>
  );
}
