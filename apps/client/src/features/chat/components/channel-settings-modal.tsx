import { useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { modals } from "@mantine/modals";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { MultiUserSelect } from "@/features/group/components/multi-user-select";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import {
  useAddChannelMemberMutation,
  useArchiveChannelMutation,
  useChannelMembersQuery,
  useChannelQuery,
  useLeaveChannelMutation,
  useRemoveChannelMemberMutation,
  useUpdateChannelMutation,
} from "../queries/channel-query";

interface ChannelSettingsModalProps {
  channelId: string;
  opened: boolean;
  onClose: () => void;
}

export function ChannelSettingsModal({
  channelId,
  opened,
  onClose,
}: ChannelSettingsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useAtomValue(userAtom);

  const { data: channel } = useChannelQuery(channelId);
  const { data: members } = useChannelMembersQuery(channelId);

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [purpose, setPurpose] = useState("");
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);

  const updateChannelMutation = useUpdateChannelMutation();
  const archiveChannelMutation = useArchiveChannelMutation();
  const leaveChannelMutation = useLeaveChannelMutation();
  const addChannelMemberMutation = useAddChannelMemberMutation();
  const removeChannelMemberMutation = useRemoveChannelMemberMutation();

  useEffect(() => {
    if (channel) {
      setName(channel.name ?? "");
      setTopic(channel.topic ?? "");
      setPurpose(channel.purpose ?? "");
    }
  }, [channel]);

  if (!channel) {
    return null;
  }

  const currentMember = members?.find(
    (member) => member.userId === currentUser?.id,
  );
  const canManage = currentMember?.role === "admin";

  const handleSave = () => {
    updateChannelMutation.mutate({
      channelId,
      name,
      topic,
      purpose,
    });
  };

  const handleAddMembers = () => {
    newMemberIds.forEach((userId) => {
      addChannelMemberMutation.mutate({ channelId, userId });
    });
    setNewMemberIds([]);
  };

  const handleRemoveMember = (userId: string) => {
    removeChannelMemberMutation.mutate({ channelId, userId });
  };

  const handleLeave = () => {
    modals.openConfirmModal({
      title: t("Leave channel"),
      children: (
        <Text size="sm">
          {t("Are you sure you want to leave this channel?")}
        </Text>
      ),
      labels: { confirm: t("Leave"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        leaveChannelMutation.mutate(channelId, {
          onSuccess: () => {
            onClose();
            navigate("/chat");
          },
        });
      },
    });
  };

  const handleArchive = () => {
    modals.openConfirmModal({
      title: t("Archive channel"),
      children: (
        <Text size="sm">
          {t(
            "Are you sure you want to archive this channel? It will be hidden for all members.",
          )}
        </Text>
      ),
      labels: { confirm: t("Archive"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        archiveChannelMutation.mutate(channelId, {
          onSuccess: () => {
            onClose();
            navigate("/chat");
          },
        });
      },
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600}>{channel.name ?? t("Channel settings")}</Text>
      }
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label={t("Name")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          disabled={!canManage}
        />
        <Textarea
          label={t("Topic")}
          value={topic}
          onChange={(e) => setTopic(e.currentTarget.value)}
          disabled={!canManage}
          autosize
          minRows={1}
        />
        <Textarea
          label={t("Purpose")}
          value={purpose}
          onChange={(e) => setPurpose(e.currentTarget.value)}
          disabled={!canManage}
          autosize
          minRows={2}
        />

        {canManage && (
          <Group justify="flex-end">
            <Button
              onClick={handleSave}
              loading={updateChannelMutation.isPending}
            >
              {t("Save changes")}
            </Button>
          </Group>
        )}

        <Divider label={t("Members")} labelPosition="left" />

        {canManage && (
          <Group align="flex-end" gap="sm">
            <div style={{ flex: 1 }}>
              <MultiUserSelect onChange={setNewMemberIds} />
            </div>
            <Button
              onClick={handleAddMembers}
              disabled={newMemberIds.length === 0}
              loading={addChannelMemberMutation.isPending}
            >
              {t("Add")}
            </Button>
          </Group>
        )}

        <ScrollArea h={220}>
          <Table verticalSpacing={6}>
            <Table.Tbody>
              {members?.map((member) => (
                <Table.Tr key={member.id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <CustomAvatar
                        avatarUrl={member.user?.avatarUrl}
                        name={member.user?.name}
                        size={28}
                      />
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                          {member.user?.name}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {member.user?.email}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td w={80}>
                    {member.role === "admin" && (
                      <Badge size="sm" variant="light">
                        {t("Admin")}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td w={40}>
                    {canManage && member.userId !== currentUser?.id && (
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            color="red"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            {t("Remove from channel")}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        <Divider />

        <Group justify="space-between">
          <div>
            <Text fw={500} size="sm">
              {t("Leave channel")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("You will no longer have access to this channel.")}
            </Text>
          </div>
          <Button color="red" variant="light" onClick={handleLeave}>
            {t("Leave")}
          </Button>
        </Group>

        {canManage && (
          <Group justify="space-between">
            <div>
              <Text fw={500} size="sm">
                {t("Archive channel")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("This channel will be hidden for all members.")}
              </Text>
            </div>
            <Button color="red" variant="light" onClick={handleArchive}>
              {t("Archive")}
            </Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
