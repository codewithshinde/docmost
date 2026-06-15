import React from "react";
import { Group, Text } from "@mantine/core";
import classes from "./auth.module.css";
import WorkspaceBranding from "@/features/workspace/components/branding/workspace-branding";
import { IWorkspaceBrandingSettings } from "@/features/workspace/types/workspace.types";

type AuthLayoutProps = {
  children: React.ReactNode;
  branding?: IWorkspaceBrandingSettings | null;
  logo?: string | null;
  name?: string;
};

export function AuthLayout({
  children,
  branding,
  logo,
  name,
}: AuthLayoutProps) {
  const appName = name || "Likh";

  return (
    <>
      <WorkspaceBranding branding={branding} />
      <Group justify="center" gap={8} className={classes.logo}>
        <img
          src={logo || branding?.faviconUrl || "/icons/favicon-32x32.png"}
          alt={appName}
          width={22}
          height={22}
        />
        <Text size="28px" fw={700} style={{ userSelect: "none" }}>
          {appName}
        </Text>
      </Group>
      <main>{children}</main>
    </>
  );
}
