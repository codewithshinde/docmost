import { useState } from "react";
import { Modal, Button, Stack, Group, Divider } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MultiUserSelect } from "@/features/group/components/multi-user-select";
import { useCreateDirectChannelMutation } from "../queries/channel-query";

interface CreateDmModalProps {
  opened: boolean;
  onClose: () => void;
}

export function CreateDmModal({ opened, onClose }: CreateDmModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userIds, setUserIds] = useState<string[]>([]);
  const createDirectChannelMutation = useCreateDirectChannelMutation();

  const handleClose = () => {
    setUserIds([]);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (userIds.length === 0) return;

    const channel = await createDirectChannelMutation.mutateAsync({ userIds });

    navigate(`/chat/${channel.id}`);
    handleClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("New direct message")}
      closeButtonProps={{ "aria-label": t("Close") }}
      centered
    >
      <Divider size="xs" mb="xs" />
      <form onSubmit={handleSubmit}>
        <Stack>
          <MultiUserSelect onChange={setUserIds} label={t("To")} />
        </Stack>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={userIds.length === 0}
            loading={createDirectChannelMutation.isPending}
          >
            {t("Start conversation")}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
