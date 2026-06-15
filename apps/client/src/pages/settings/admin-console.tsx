import type React from "react";
import { Container, SimpleGrid, Text } from "@mantine/core";
import {
  IconApi,
  IconBuilding,
  IconFileAnalytics,
  IconLink,
  IconLock,
  IconSettings,
  IconShare,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { getAppName } from "@/lib/config";
import classes from "@/features/home/components/home-app-tiles.module.css";

const adminTiles = [
  {
    label: "Workspace",
    path: "/settings/workspace",
    icon: IconBuilding,
    color: "var(--mantine-color-blue-6)",
  },
  {
    label: "Members",
    path: "/settings/members",
    icon: IconUsers,
    color: "var(--mantine-color-cyan-7)",
  },
  {
    label: "Teams",
    path: "/teams",
    icon: IconShield,
    color: "var(--mantine-color-teal-6)",
  },
  {
    label: "Spaces",
    path: "/settings/spaces",
    icon: IconShare,
    color: "var(--mantine-color-green-6)",
  },
  {
    label: "Security",
    path: "/settings/security",
    icon: IconLock,
    color: "var(--mantine-color-red-6)",
  },
  {
    label: "Integrations",
    path: "/settings/integrations",
    icon: IconLink,
    color: "var(--mantine-color-violet-6)",
  },
  {
    label: "API keys",
    path: "/settings/api-keys",
    icon: IconApi,
    color: "var(--mantine-color-indigo-6)",
  },
  {
    label: "Audit",
    path: "/settings/audit",
    icon: IconFileAnalytics,
    color: "var(--mantine-color-orange-6)",
  },
  {
    label: "Account",
    path: "/settings/account/profile",
    icon: IconSettings,
    color: "var(--mantine-color-gray-7)",
  },
];

export default function AdminConsole() {
  const { t } = useTranslation();

  return (
    <Container size="1100" py="xl">
      <Helmet>
        <title>
          {t("Admin Console")} - {getAppName()}
        </title>
      </Helmet>

      <Text component="h1" className={classes.title}>
        {t("Admin Console")}
      </Text>
      <Text size="sm" c="dimmed" mb="lg">
        {t("Manage workspace, teams, members, security, and integrations.")}
      </Text>

      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
        {adminTiles.map((tile) => (
          <Link key={tile.label} to={tile.path} className={classes.tile}>
            <span
              className={classes.iconBox}
              style={{ "--tile-color": tile.color } as React.CSSProperties}
            >
              <tile.icon size={24} stroke={1.8} />
            </span>
            <Text className={classes.label}>{t(tile.label)}</Text>
          </Link>
        ))}
      </SimpleGrid>
    </Container>
  );
}
