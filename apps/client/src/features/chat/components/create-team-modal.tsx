import { useState } from "react";
import { Modal, TextInput, Textarea, Button, Stack, Group, Divider } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCreateTeamMutation } from "../queries/team-query";
import { useSetAtom } from "jotai";
import { activeTeamIdAtom } from "../atoms/chat-atoms";

interface CreateTeamModalProps {
  opened: boolean;
  onClose: () => void;
}

export function CreateTeamModal({ opened, onClose }: CreateTeamModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createTeamMutation = useCreateTeamMutation();
  const setActiveTeamId = useSetAtom(activeTeamIdAtom);

  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    const team = await createTeamMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    setActiveTeamId(team.id);
    handleClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("Create team")}
      closeButtonProps={{ "aria-label": t("Close") }}
      centered
    >
      <Divider size="xs" mb="xs" />
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label={t("Team name")}
            placeholder={t("e.g. Engineering")}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            data-autofocus
            withAsterisk
          />
          <Textarea
            label={t("Description")}
            placeholder={t("What is this team about?")}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            autosize
            minRows={2}
          />
        </Stack>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={!name.trim()}
            loading={createTeamMutation.isPending}
          >
            {t("Create")}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
