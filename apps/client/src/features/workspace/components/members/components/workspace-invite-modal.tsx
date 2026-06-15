import { WorkspaceInviteForm } from "@/features/workspace/components/members/components/workspace-invite-form.tsx";
import { CreateMemberForm } from "@/features/workspace/components/members/components/create-member-form.tsx";
import { Button, Divider, Modal, ScrollArea, SegmentedControl } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function WorkspaceInviteModal() {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [mode, setMode] = useState<"invite" | "create">("invite");

  return (
    <>
      <Button onClick={open}>{t("Invite members")}</Button>

      <Modal
        size="550"
        opened={opened}
        onClose={close}
        title={t("Invite new members")}
        centered
      >
        <Divider size="xs" mb="xs" />

        <SegmentedControl
          fullWidth
          mb="md"
          value={mode}
          onChange={(value) => setMode(value as "invite" | "create")}
          data={[
            { label: t("Invite by email"), value: "invite" },
            { label: t("Create user"), value: "create" },
          ]}
        />

        <ScrollArea h="80%">
          {mode === "invite" ? (
            <WorkspaceInviteForm onClose={close} />
          ) : (
            <CreateMemberForm onClose={close} />
          )}
        </ScrollArea>
      </Modal>
    </>
  );
}
