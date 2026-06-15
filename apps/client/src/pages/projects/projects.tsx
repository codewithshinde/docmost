import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconLayoutKanban, IconPlus } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { getAppName } from "@/lib/config";
import {
  useCreateProjectMutation,
  useUserProjectsQuery,
} from "@/features/chat/queries/project-query";
import {
  useTeamMembersQuery,
  useTeamsQuery,
} from "@/features/chat/queries/team-query";
import { ProjectTasks } from "@/features/chat/components/team-projects-panel";
import { ITeamProject, ProjectView } from "@/features/chat/types/chat.types";

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { data: projects } = useUserProjectsQuery();
  const { data: teams } = useTeamsQuery();
  const createProjectMutation = useCreateProjectMutation();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [view, setView] = useState<ProjectView>("kanban");
  const activeProject = projects?.find(
    (project) => project.id === activeProjectId,
  );
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

  const handleCreateProject = async () => {
    if (!teamId || !name.trim()) return;
    const project = await createProjectMutation.mutateAsync({
      teamId,
      name: name.trim(),
      description: description.trim() || undefined,
      view,
    });
    setActiveProjectId(project.id);
    setName("");
    setDescription("");
    setView("kanban");
  };

  return (
    <Container size="1200" py="xl">
      <Helmet>
        <title>
          {t("Projects")} - {getAppName()}
        </title>
      </Helmet>

      <Group justify="space-between" mb="lg">
        <div>
          <Text component="h1" fw={750} size="xl">
            {t("Projects")}
          </Text>
          <Text size="sm" c="dimmed">
            {t("Jira-style work tracking across your teams.")}
          </Text>
        </div>
      </Group>

      <Paper withBorder radius="sm" p="md" mb="lg">
        <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
          <Select
            label={t("Team")}
            data={(teams ?? []).map((team) => ({
              value: team.id,
              label: team.name,
            }))}
            value={teamId}
            onChange={setTeamId}
            searchable
            placeholder={t("Select team")}
          />
          <TextInput
            label={t("Project name")}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder={t("e.g. Release board")}
          />
          <Select
            label={t("Default view")}
            value={view}
            onChange={(value) => setView((value as ProjectView) ?? "kanban")}
            data={[
              { value: "kanban", label: t("Board") },
              { value: "table", label: t("Table") },
              { value: "calendar", label: t("Calendar") },
            ]}
          />
          <Button
            mt={24}
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateProject}
            disabled={!teamId || !name.trim()}
            loading={createProjectMutation.isPending}
          >
            {t("Create project")}
          </Button>
        </SimpleGrid>
        <Textarea
          mt="sm"
          label={t("Description")}
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          minRows={2}
          autosize
        />
      </Paper>

      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="sm">
          {(projects ?? []).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              active={project.id === activeProjectId}
              onClick={() => setActiveProjectId(project.id)}
            />
          ))}
          {(!projects || projects.length === 0) && (
            <Paper withBorder radius="sm" p="md">
              <Text fw={600}>{t("No projects yet")}</Text>
              <Text size="sm" c="dimmed">
                {t("Create a project here or from a team hub to start tracking work.")}
              </Text>
            </Paper>
          )}
        </SimpleGrid>

        <Paper withBorder radius="sm" p="md" mih={520}>
          {activeProject ? (
            <ProjectTasks
              teamId={activeProject.teamId}
              project={activeProject}
              members={members}
            />
          ) : (
            <Stack align="center" py="xl">
              <IconLayoutKanban size={36} stroke={1.5} />
              <Text fw={600}>{t("Select a project")}</Text>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}

function ProjectCard({
  project,
  active,
  onClick,
}: {
  project: ITeamProject & { teamName?: string };
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const done = Number(project.doneTaskCount ?? 0);
  const total = Number(project.taskCount ?? 0);

  return (
    <Paper
      withBorder
      radius="sm"
      p="md"
      onClick={onClick}
      data-active={active}
      style={{ cursor: "pointer" }}
    >
      <Group justify="space-between" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Text fw={700} truncate>
            {project.name}
          </Text>
          <Text
            component={Link}
            to={`/teams/${project.teamId}`}
            size="xs"
            c="dimmed"
            truncate
            onClick={(event) => event.stopPropagation()}
          >
            {project.teamName || t("Team")}
          </Text>
        </div>
        <Badge variant="light">
          {done}/{total}
        </Badge>
      </Group>
    </Paper>
  );
}
