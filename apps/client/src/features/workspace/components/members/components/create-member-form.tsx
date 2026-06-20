import { Box, Button, Group, PasswordInput, Select, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MultiGroupSelect } from "@/features/group/components/multi-group-select.tsx";
import { UserRole } from "@/lib/types.ts";
import { userRoleData } from "@/features/workspace/types/user-role-data.ts";
import { useCreateMemberMutation } from "@/features/workspace/queries/workspace-query.ts";

interface Props {
  onClose: () => void;
}

export function CreateMemberForm({ onClose }: Props) {
  const { t } = useTranslation();
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const createMemberMutation = useCreateMemberMutation();

  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: UserRole.MEMBER,
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? t("Name is required") : null),
      password: (value) =>
        value.length < 8 ? t("Password must be at least 8 characters") : null,
      confirmPassword: (value, values) =>
        value !== values.password ? t("Passwords do not match") : null,
      username: (value, values) =>
        !value && !values.email
          ? t("Provide an email, a username, or both")
          : null,
      email: (value, values) =>
        !value && !values.username
          ? t("Provide an email, a username, or both")
          : null,
    },
  });

  const handleGroupSelect = (value: string[]) => {
    setGroupIds(value);
  };

  async function handleSubmit(values: typeof form.values) {
    await createMemberMutation.mutateAsync({
      name: values.name.trim(),
      email: values.email.trim() || undefined,
      username: values.username.trim() || undefined,
      password: values.password,
      role: values.role.toLowerCase(),
      groupIds,
    });

    onClose();
  }

  return (
    <Box maw="500" mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label={t("Name")}
          placeholder={t("Name")}
          variant="filled"
          data-autofocus
          {...form.getInputProps("name")}
        />

        <TextInput
          mt="sm"
          label={t("Username (optional)")}
          placeholder={t("Username")}
          variant="filled"
          autoComplete="off"
          {...form.getInputProps("username")}
        />

        <TextInput
          mt="sm"
          type="email"
          label={t("Email (optional)")}
          placeholder="email@example.com"
          variant="filled"
          autoComplete="off"
          {...form.getInputProps("email")}
        />

        <PasswordInput
          mt="sm"
          label={t("Password")}
          placeholder={t("Password")}
          variant="filled"
          autoComplete="new-password"
          {...form.getInputProps("password")}
        />

        <PasswordInput
          mt="sm"
          label={t("Confirm password")}
          placeholder={t("Confirm password")}
          variant="filled"
          autoComplete="new-password"
          {...form.getInputProps("confirmPassword")}
        />

        <Select
          mt="sm"
          label={t("Select role")}
          placeholder={t("Choose a role")}
          variant="filled"
          data={userRoleData
            .filter((role) => role.value !== UserRole.OWNER)
            .map((role) => ({
              ...role,
              label: t(`${role.label}`),
              description: t(`${role.description}`),
            }))}
          allowDeselect={false}
          checkIconPosition="right"
          {...form.getInputProps("role")}
        />

        <MultiGroupSelect
          mt="sm"
          description={t(
            "The user will be granted access to spaces the groups can access",
          )}
          label={t("Add to groups")}
          onChange={handleGroupSelect}
        />

        <Group justify="flex-end" mt="md">
          <Button type="submit" loading={createMemberMutation.isPending}>
            {t("Create user")}
          </Button>
        </Group>
      </form>
    </Box>
  );
}
