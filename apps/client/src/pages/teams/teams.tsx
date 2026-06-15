import {
  Badge,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconFolder,
  IconLayoutKanban,
  IconMessageCircle2,
  IconPlus,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { getAppName } from "@/lib/config";
import { useTeamsQuery } from "@/features/chat/queries/team-query";
import { CreateTeamModal } from "@/features/chat/components/create-team-modal";
import { useDisclosure } from "@mantine/hooks";
import classes from "@/features/home/components/home-app-tiles.module.css";

export default function TeamsPage() {
  const { t } = useTranslation();
  const { data: teams } = useTeamsQuery();
  const [opened, handlers] = useDisclosure(false);

  return (
    <Container size="1100" py="xl">
      <Helmet>
        <title>
          {t("Teams")} - {getAppName()}
        </title>
      </Helmet>

      <Group justify="space-between" mb="lg">
        <div>
          <Text component="h1" className={classes.title}>
            {t("Teams")}
          </Text>
          <Text size="sm" c="dimmed">
            {t("Teams connect spaces, chat, projects, and members.")}
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={handlers.open}>
          {t("Create team")}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {(teams ?? []).map((team) => (
          <Link key={team.id} to={`/teams/${team.id}`} className={classes.tile}>
            <span className={classes.iconBox}>
              <IconUsersGroup size={24} />
            </span>
            <Stack gap={4} align="center">
              <Text fw={700} ta="center" lineClamp={1}>
                {team.name}
              </Text>
              <Text size="xs" c="dimmed" ta="center" lineClamp={2}>
                {team.description || t("Team workspace")}
              </Text>
              <Group gap={6} justify="center">
                <Badge
                  size="xs"
                  variant="light"
                  leftSection={<IconFolder size={12} />}
                >
                  {t("Spaces")}
                </Badge>
                <Badge
                  size="xs"
                  variant="light"
                  leftSection={<IconLayoutKanban size={12} />}
                >
                  {t("Projects")}
                </Badge>
                <Badge
                  size="xs"
                  variant="light"
                  leftSection={<IconMessageCircle2 size={12} />}
                >
                  {t("Chat")}
                </Badge>
              </Group>
            </Stack>
          </Link>
        ))}
      </SimpleGrid>

      <CreateTeamModal opened={opened} onClose={handlers.close} />
    </Container>
  );
}
