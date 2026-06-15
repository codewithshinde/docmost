import { useState } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Divider,
  SegmentedControl,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCreateChannelMutation } from "../queries/channel-query";

interface CreateChannelModalProps {
  opened: boolean;
  onClose: () => void;
  teamId: string;
}

export function CreateChannelModal({
  opened,
  onClose,
  teamId,
}: CreateChannelModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const createChannelMutation = useCreateChannelMutation();

  const handleClose = () => {
    setName("");
    setTopic("");
    setType("public");
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !teamId) return;

    const channel = await createChannelMutation.mutateAsync({
      teamId,
      name: name.trim(),
      type,
      topic: topic.trim() || undefined,
    });

    navigate(`/chat/${channel.id}`);
    handleClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("Create channel")}
      closeButtonProps={{ "aria-label": t("Close") }}
      centered
    >
      <Divider size="xs" mb="xs" />
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label={t("Channel name")}
            placeholder={t("e.g. general")}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            data-autofocus
            withAsterisk
          />
          <Textarea
            label={t("Topic")}
            placeholder={t("What's this channel about?")}
            value={topic}
            onChange={(event) => setTopic(event.currentTarget.value)}
            autosize
            minRows={2}
          />
          <SegmentedControl
            value={type}
            onChange={(value) => setType(value as "public" | "private")}
            data={[
              { label: t("Public"), value: "public" },
              { label: t("Private"), value: "private" },
            ]}
            fullWidth
          />
        </Stack>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={!name.trim()}
            loading={createChannelMutation.isPending}
          >
            {t("Create")}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
