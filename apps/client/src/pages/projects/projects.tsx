import { useEffect, useState } from "react";
import {
  Badge,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconLayoutKanban } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { getAppName } from "@/lib/config";
import { useUserProjectsQuery } from "@/features/chat/queries/project-query";
import { useTeamMembersQuery } from "@/features/chat/queries/team-query";
import { ProjectTasks } from "@/features/chat/components/team-projects-panel";
import { ITeamProject } from "@/features/chat/types/chat.types";

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { data: projects } = useUserProjectsQuery();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
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

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        <Stack gap="sm">
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
                {t("Create a project from a team hub to start tracking work.")}
              </Text>
            </Paper>
          )}
        </Stack>

        <Paper withBorder radius="sm" p="md" style={{ gridColumn: "span 2" }}>
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
      </SimpleGrid>
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
