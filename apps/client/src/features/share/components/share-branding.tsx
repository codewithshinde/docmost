import { Affix, Button } from "@mantine/core";
import { useWorkspacePublicDataQuery } from "@/features/workspace/queries/workspace-query";

export default function ShareBranding() {
  const { data } = useWorkspacePublicDataQuery();

  if (data?.branding?.hidePoweredBy) {
    return null;
  }

  return (
    <Affix position={{ bottom: 20, right: 20 }}>
      <Button
        variant="default"
        component="a"
        target="_blank"
        href="https://likh.app?ref=public-share"
      >
        Powered by Likh
      </Button>
    </Affix>
  );
}
