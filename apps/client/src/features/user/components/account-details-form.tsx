import { useState } from "react";
import { Button, SimpleGrid, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import { updateUser } from "@/features/user/services/user-service";
import { IUser } from "@/features/user/types/user.types";

export default function AccountDetailsForm() {
  const { t } = useTranslation();
  const [user, setUser] = useAtom(userAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    user?.emergencyContactName ?? "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    user?.emergencyContactPhone ?? "",
  );

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updated = await updateUser({
        phone,
        address,
        emergencyContactName,
        emergencyContactPhone,
      } as Partial<IUser>);
      setUser(updated);
      notifications.show({ message: t("Updated successfully") });
    } catch {
      notifications.show({
        message: t("Failed to update data"),
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack gap="sm">
      <Text fw={600}>{t("Personal details")}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label={t("Phone")}
          value={phone}
          onChange={(event) => setPhone(event.currentTarget.value)}
        />
        <TextInput
          label={t("Designation")}
          value={user?.designation ?? ""}
          readOnly
          variant="filled"
        />
        <TextInput
          label={t("Emergency contact")}
          value={emergencyContactName}
          onChange={(event) =>
            setEmergencyContactName(event.currentTarget.value)
          }
        />
        <TextInput
          label={t("Emergency phone")}
          value={emergencyContactPhone}
          onChange={(event) =>
            setEmergencyContactPhone(event.currentTarget.value)
          }
        />
      </SimpleGrid>
      <Textarea
        label={t("Address")}
        value={address}
        onChange={(event) => setAddress(event.currentTarget.value)}
        minRows={3}
        autosize
      />
      <Button onClick={handleSave} loading={isLoading} w="fit-content">
        {t("Save details")}
      </Button>
    </Stack>
  );
}
