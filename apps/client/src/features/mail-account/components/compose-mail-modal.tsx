import { useEffect, useState } from "react";
import {
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSendMailMessageMutation } from "../queries/mail-account-query";

export interface ComposeMailInitialValues {
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  inReplyTo?: string;
  references?: string[];
}

interface ComposeMailModalProps {
  opened: boolean;
  onClose: () => void;
  initialValues?: ComposeMailInitialValues;
}

function parseRecipients(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function ComposeMailModal({
  opened,
  onClose,
  initialValues,
}: ComposeMailModalProps) {
  const { t } = useTranslation();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const sendMutation = useSendMailMessageMutation();

  useEffect(() => {
    if (!opened) return;
    setTo(initialValues?.to ?? "");
    setCc(initialValues?.cc ?? "");
    setBcc("");
    setShowCcBcc(!!initialValues?.cc);
    setSubject(initialValues?.subject ?? "");
    setBody(initialValues?.body ?? "");
  }, [opened, initialValues]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const toAddresses = parseRecipients(to);
    if (toAddresses.length === 0) return;

    await sendMutation.mutateAsync({
      to: toAddresses,
      cc: cc ? parseRecipients(cc) : undefined,
      bcc: bcc ? parseRecipients(bcc) : undefined,
      subject,
      text: body,
      inReplyTo: initialValues?.inReplyTo,
      references: initialValues?.references,
    });

    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("New message")}
      closeButtonProps={{ "aria-label": t("Close") }}
      size="lg"
      centered
    >
      <Divider size="xs" mb="xs" />
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label={t("To")}
            placeholder={t("recipient@example.com")}
            value={to}
            onChange={(event) => setTo(event.currentTarget.value)}
            data-autofocus
            withAsterisk
          />

          {showCcBcc ? (
            <>
              <TextInput
                label={t("Cc")}
                value={cc}
                onChange={(event) => setCc(event.currentTarget.value)}
              />
              <TextInput
                label={t("Bcc")}
                value={bcc}
                onChange={(event) => setBcc(event.currentTarget.value)}
              />
            </>
          ) : (
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setShowCcBcc(true)}
              style={{ alignSelf: "flex-start" }}
            >
              {t("Add Cc/Bcc")}
            </Button>
          )}

          <TextInput
            label={t("Subject")}
            value={subject}
            onChange={(event) => setSubject(event.currentTarget.value)}
          />

          <Textarea
            label={t("Message")}
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
            autosize
            minRows={8}
            maxRows={20}
          />
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={parseRecipients(to).length === 0}
            loading={sendMutation.isPending}
          >
            {t("Send")}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
