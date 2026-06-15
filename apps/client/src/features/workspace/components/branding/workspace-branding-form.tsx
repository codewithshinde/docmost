import {
  Button,
  ColorInput,
  Group,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import { zod4Resolver } from "mantine-form-zod-resolver";
import useUserRole from "@/hooks/use-user-role";
import { updateWorkspace } from "@/features/workspace/services/workspace-service";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom";

const brandingSchema = z.object({
  brandPrimaryColor: z
    .string()
    .refine((value) => value === "" || /^#[0-9a-fA-F]{6}$/.test(value), {
      message: "Enter a valid hex color",
    }),
  brandFaviconUrl: z.string().max(2048),
  brandCustomCss: z.string().max(20000),
  hidePoweredBy: z.boolean(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

export default function WorkspaceBrandingForm() {
  const { t } = useTranslation();
  const { isAdmin } = useUserRole();
  const [workspace, setWorkspace] = useAtom(workspaceAtom);
  const branding = workspace?.settings?.branding;

  const form = useForm<BrandingFormValues>({
    validate: zod4Resolver(brandingSchema),
    initialValues: {
      brandPrimaryColor: branding?.primaryColor ?? "",
      brandFaviconUrl: branding?.faviconUrl ?? "",
      brandCustomCss: branding?.customCss ?? "",
      hidePoweredBy: branding?.hidePoweredBy === true,
    },
  });

  const handleSubmit = async (values: BrandingFormValues) => {
    try {
      const updatedWorkspace = await updateWorkspace({
        brandPrimaryColor: values.brandPrimaryColor || null,
        brandFaviconUrl: values.brandFaviconUrl || null,
        brandCustomCss: values.brandCustomCss || null,
        hidePoweredBy: values.hidePoweredBy,
      });
      setWorkspace(updatedWorkspace);
      form.resetDirty(values);
      notifications.show({ message: t("Updated successfully") });
    } catch (err: any) {
      notifications.show({
        message: err?.response?.data?.message || t("Failed to update data"),
        color: "red",
      });
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Text size="md" fw={500} mb={4}>
        {t("Custom branding")}
      </Text>
      <Text size="sm" c="dimmed" mb="sm">
        {t("Customize public and sign-in surfaces for this workspace.")}
      </Text>

      <ColorInput
        label={t("Primary color")}
        placeholder="#2f6fed"
        variant="filled"
        readOnly={!isAdmin}
        {...form.getInputProps("brandPrimaryColor")}
      />

      <TextInput
        mt="sm"
        label={t("Favicon URL")}
        placeholder="https://example.com/favicon.png"
        variant="filled"
        readOnly={!isAdmin}
        {...form.getInputProps("brandFaviconUrl")}
      />

      <Textarea
        mt="sm"
        label={t("Custom CSS")}
        placeholder=":root { --docmost-brand-primary-color: #2f6fed; }"
        variant="filled"
        minRows={5}
        autosize
        readOnly={!isAdmin}
        {...form.getInputProps("brandCustomCss")}
      />

      <Group justify="space-between" mt="md" wrap="nowrap">
        <div>
          <Text size="sm" fw={500}>
            {t("Hide powered by badge")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("Remove the Likh badge from public shared pages.")}
          </Text>
        </div>
        <Switch
          disabled={!isAdmin}
          aria-label={t("Toggle powered by badge")}
          {...form.getInputProps("hidePoweredBy", { type: "checkbox" })}
        />
      </Group>

      {isAdmin && (
        <Button mt="sm" type="submit" disabled={!form.isDirty()}>
          {t("Save")}
        </Button>
      )}
    </form>
  );
}
