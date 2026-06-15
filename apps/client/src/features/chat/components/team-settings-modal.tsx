import { useEffect, useState } from "react";
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  ScrollArea,
  SegmentedControl,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconDots, IconInfoCircle, IconUsers } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAtomValue, useSetAtom } from "jotai";
import { modals } from "@mantine/modals";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { MultiUserSelect } from "@/features/group/components/multi-user-select";
import RoleSelectMenu from "@/components/ui/role-select-menu";
import { IRoleData } from "@/lib/types";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import {
  useAddTeamMemberMutation,
  useDeleteTeamMutation,
  useLeaveTeamMutation,
  useRemoveTeamMemberMutation,
  useTeamMembersQuery,
  useTeamQuery,
  useUpdateTeamMemberRoleMutation,
  useUpdateTeamMutation,
} from "../queries/team-query";
import { activeTeamIdAtom } from "../atoms/chat-atoms";

const teamRoleData: IRoleData[] = [
  {
    label: "Owner",
    value: "owner",
    description: "Can manage team settings, channels, and members.",
  },
  {
    label: "Member",
    value: "member",
    description: "Can view and participate in team channels.",
  },
];

function getTeamRoleLabel(value: string): string {
  return teamRoleData.find((item) => item.value === value)?.label ?? value;
}

interface TeamSettingsModalProps {
  teamId: string;
  opened: boolean;
  onClose: () => void;
}

export function TeamSettingsModal({
  teamId,
  opened,
  onClose,
}: TeamSettingsModalProps) {
  const { t } = useTranslation();
  const currentUser = useAtomValue(userAtom);
  const setActiveTeamId = useSetAtom(activeTeamIdAtom);

  const { data: team } = useTeamQuery(teamId);
  const { data: members } = useTeamMembersQuery(teamId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("open");
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);

  const updateTeamMutation = useUpdateTeamMutation();
  const deleteTeamMutation = useDeleteTeamMutation();
  const leaveTeamMutation = useLeaveTeamMutation();
  const addTeamMemberMutation = useAddTeamMemberMutation();
  const removeTeamMemberMutation = useRemoveTeamMemberMutation();
  const updateTeamMemberRoleMutation = useUpdateTeamMemberRoleMutation();

  useEffect(() => {
    if (team) {
      setName(team.name ?? "");
      setDescription(team.description ?? "");
      setType(team.type ?? "open");
    }
  }, [team]);

  if (!team) {
    return null;
  }

  const isOwner = team.memberRole === "owner";
  const canSave =
    isOwner &&
    name.trim().length > 0 &&
    (name.trim() !== team.name ||
      description.trim() !== (team.description ?? "") ||
      type !== team.type);

  const handleSave = () => {
    updateTeamMutation.mutate({
      teamId,
      name: name.trim(),
      description: description.trim(),
      type,
    });
  };

  const handleAddMembers = async () => {
    await Promise.all(
      newMemberIds.map((userId) =>
        addTeamMemberMutation.mutateAsync({ teamId, userId }),
      ),
    );
    setNewMemberIds([]);
  };

  const handleRoleChange = (userId: string, role: string) => {
    updateTeamMemberRoleMutation.mutate({ teamId, userId, role });
  };

  const handleRemoveMember = (userId: string) => {
    const member = members?.find((item) => item.userId === userId);
    modals.openConfirmModal({
      title: t("Remove member"),
      children: (
        <Text size="sm">
          {t("Remove {{name}} from this team?", {
            name: member?.user?.name ?? t("this member"),
          })}
        </Text>
      ),
      labels: { confirm: t("Remove"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => removeTeamMemberMutation.mutate({ teamId, userId }),
    });
  };

  const handleLeave = () => {
    modals.openConfirmModal({
      title: t("Leave team"),
      children: (
        <Text size="sm">{t("Are you sure you want to leave this team?")}</Text>
      ),
      labels: { confirm: t("Leave"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        leaveTeamMutation.mutate(teamId, {
          onSuccess: () => {
            onClose();
            setActiveTeamId(null);
          },
        });
      },
    });
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: t("Delete team"),
      children: (
        <Text size="sm">
          {t(
            "Are you sure you want to delete this team? All of its channels and messages will be permanently deleted. This action cannot be undone.",
          )}
        </Text>
      ),
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteTeamMutation.mutate(teamId, {
          onSuccess: () => {
            onClose();
            setActiveTeamId(null);
          },
        });
      },
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>{team.name}</Text>}
      size="xl"
    >
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
            {t("Overview")}
          </Tabs.Tab>
          <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>
            {t("Members")}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Stack gap="md">
            <TextInput
              label={t("Name")}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              disabled={!isOwner}
            />
            <Textarea
              label={t("Description")}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              disabled={!isOwner}
              autosize
              minRows={2}
            />
            <SegmentedControl
              value={type}
              onChange={setType}
              disabled={!isOwner}
              data={[
                { value: "open", label: t("Open") },
                { value: "invite_only", label: t("Invite only") },
              ]}
              fullWidth
            />

            {isOwner && (
              <Group justify="flex-end">
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  loading={updateTeamMutation.isPending}
                >
                  {t("Save changes")}
                </Button>
              </Group>
            )}

            <Divider />

            <Group justify="space-between">
              <div>
                <Text fw={500} size="sm">
                  {t("Leave team")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("You will no longer have access to this team's channels.")}
                </Text>
              </div>
              <Button color="red" variant="light" onClick={handleLeave}>
                {t("Leave")}
              </Button>
            </Group>

            {isOwner && (
              <Group justify="space-between">
                <div>
                  <Text fw={500} size="sm">
                    {t("Delete team")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t("Permanently delete this team and all of its channels.")}
                  </Text>
                </div>
                <Button color="red" variant="light" onClick={handleDelete}>
                  {t("Delete")}
                </Button>
              </Group>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="members" pt="md">
          <Stack gap="md">
            {isOwner && (
              <Group align="flex-end" gap="sm">
                <div style={{ flex: 1 }}>
                  <MultiUserSelect
                    label={t("Invite members")}
                    onChange={setNewMemberIds}
                    excludeUserIds={
                      members?.map((member) => member.userId) ?? []
                    }
                  />
                </div>
                <Button
                  onClick={handleAddMembers}
                  disabled={newMemberIds.length === 0}
                  loading={addTeamMemberMutation.isPending}
                >
                  {t("Add")}
                </Button>
              </Group>
            )}

            <ScrollArea h={300}>
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
                      <Table.Td w={150}>
                        {isOwner ? (
                          <RoleSelectMenu
                            roles={teamRoleData}
                            roleName={getTeamRoleLabel(member.role)}
                            onChange={(role) =>
                              handleRoleChange(member.userId, role)
                            }
                            disabled={
                              updateTeamMemberRoleMutation.isPending ||
                              member.userId === currentUser?.id
                            }
                          />
                        ) : (
                          <Text size="sm" c="dimmed">
                            {t(getTeamRoleLabel(member.role))}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td w={40}>
                        {isOwner && member.userId !== currentUser?.id && (
                          <Menu position="bottom-end" withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray">
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                color="red"
                                onClick={() =>
                                  handleRemoveMember(member.userId)
                                }
                              >
                                {t("Remove from team")}
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
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
