import { useCallback, useEffect, useState } from "react";
import classes from "../styles/mail-editor.module.css";
import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { DateTimePicker, DatePickerInput } from "@mantine/dates";
import {
  IconBold,
  IconCalendarPlus,
  IconItalic,
  IconLink,
  IconLinkOff,
  IconList,
  IconListNumbers,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { addHours, format, parse } from "date-fns";
import { useSendMailMessageMutation } from "../queries/mail-account-query";
import { generateIcs } from "../utils/mail-ics.utils";

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

function parseDateValue(value: string): Date {
  return parse(value, "yyyy-MM-dd", new Date());
}

function parseDateTimeValue(value: string): Date {
  return parse(value, "yyyy-MM-dd HH:mm:ss", new Date());
}

function parseRecipients(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function textToHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map((line) => `<p>${line || "<br>"}</p>`)
    .join("");
}

function MailEditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const { t } = useTranslation();

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt(t("URL"), previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor, t]);

  if (!editor) return null;

  return (
    <Box
      px="xs"
      py={4}
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
        background: "var(--mantine-color-default-hover)",
      }}
    >
      <Group gap={2} wrap="wrap">
        <Tooltip label={t("Bold")} withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant={editor.isActive("bold") ? "filled" : "subtle"}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <IconBold size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("Italic")} withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant={editor.isActive("italic") ? "filled" : "subtle"}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <IconItalic size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("Underline")} withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant={editor.isActive("underline") ? "filled" : "subtle"}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <IconUnderline size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("Strikethrough")} withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant={editor.isActive("strike") ? "filled" : "subtle"}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <IconStrikethrough size={14} />
          </ActionIcon>
        </Tooltip>
        <Divider orientation="vertical" mx={2} />
        <Tooltip label={t("Bullet list")} withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant={editor.isActive("bulletList") ? "filled" : "subtle"}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <IconList size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("Ordered list")} withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant={editor.isActive("orderedList") ? "filled" : "subtle"}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <IconListNumbers size={14} />
          </ActionIcon>
        </Tooltip>
        <Divider orientation="vertical" mx={2} />
        <Tooltip label={t("Insert link")} withArrow openDelay={500}>
          <ActionIcon
            size="sm"
            variant={editor.isActive("link") ? "filled" : "subtle"}
            onClick={setLink}
          >
            <IconLink size={14} />
          </ActionIcon>
        </Tooltip>
        {editor.isActive("link") && (
          <Tooltip label={t("Remove link")} withArrow openDelay={500}>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <IconLinkOff size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Box>
  );
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
  const sendMutation = useSendMailMessageMutation();

  // Calendar invite state
  const [attachInvite, setAttachInvite] = useState(false);
  const [icsTitle, setIcsTitle] = useState("");
  const [icsAllDay, setIcsAllDay] = useState(false);
  const [icsStart, setIcsStart] = useState<Date | null>(null);
  const [icsEnd, setIcsEnd] = useState<Date | null>(null);
  const [icsLocation, setIcsLocation] = useState("");
  const [icsDescription, setIcsDescription] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ dropcursor: false, gapcursor: false }),
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: "",
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
  });

  useEffect(() => {
    if (!opened || !editor) return;
    setTo(initialValues?.to ?? "");
    setCc(initialValues?.cc ?? "");
    setBcc("");
    setShowCcBcc(!!initialValues?.cc);
    setSubject(initialValues?.subject ?? "");
    const html = initialValues?.body ? textToHtml(initialValues.body) : "";
    editor.commands.setContent(html || "");
    // Reset invite fields on open
    setAttachInvite(false);
    setIcsTitle("");
    setIcsAllDay(false);
    setIcsStart(null);
    setIcsEnd(null);
    setIcsLocation("");
    setIcsDescription("");
  }, [opened, initialValues, editor]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const toAddresses = parseRecipients(to);
    if (toAddresses.length === 0 || !editor) return;

    const html = editor.getHTML();
    const text = editor.getText();

    let icsAttachment: string | undefined;
    if (attachInvite && icsTitle && icsStart && icsEnd) {
      icsAttachment = generateIcs({
        uid: `${Date.now()}-${Math.random().toString(36).slice(2)}@likh`,
        title: icsTitle,
        startsAt: icsStart,
        endsAt: icsEnd,
        allDay: icsAllDay,
        location: icsLocation || undefined,
        description: icsDescription || undefined,
        attendeeEmails: toAddresses,
        method: "REQUEST",
      });
    }

    await sendMutation.mutateAsync({
      to: toAddresses,
      cc: cc ? parseRecipients(cc) : undefined,
      bcc: bcc ? parseRecipients(bcc) : undefined,
      subject,
      html,
      text,
      inReplyTo: initialValues?.inReplyTo,
      references: initialValues?.references,
      icsAttachment,
    });

    editor.commands.clearContent();
    onClose();
  };

  const inviteValid = !attachInvite || (!!icsTitle && !!icsStart && !!icsEnd);

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

          <Box>
            <Box
              mb={4}
              style={{ fontSize: "var(--mantine-font-size-sm)", fontWeight: 500 }}
            >
              {t("Message")}
            </Box>
            <Box
              style={{
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: "var(--mantine-radius-sm)",
                overflow: "hidden",
              }}
            >
              <MailEditorToolbar editor={editor} />
              <Box
                p="sm"
                className={classes.mailEditor}
                style={{ minHeight: 160, maxHeight: 320, overflowY: "auto" }}
              >
                <EditorContent editor={editor} />
              </Box>
            </Box>
          </Box>

          {/* Calendar invite attachment */}
          <Box>
            <Group gap="xs">
              <Switch
                size="sm"
                label={
                  <Group gap={4}>
                    <IconCalendarPlus size={14} />
                    <Text size="sm">{t("Attach calendar invite")}</Text>
                  </Group>
                }
                checked={attachInvite}
                onChange={(e) => setAttachInvite(e.currentTarget.checked)}
              />
            </Group>

            {attachInvite && (
              <Paper
                withBorder
                p="sm"
                mt="xs"
                radius="sm"
                style={{ background: "var(--mantine-color-default-hover)" }}
              >
                <Stack gap="sm">
                  <TextInput
                    label={t("Event title")}
                    placeholder={t("Team standup")}
                    value={icsTitle}
                    onChange={(e) => setIcsTitle(e.currentTarget.value)}
                    withAsterisk
                    size="sm"
                  />

                  <Checkbox
                    label={t("All day")}
                    size="sm"
                    checked={icsAllDay}
                    onChange={(e) => {
                      setIcsAllDay(e.currentTarget.checked);
                      setIcsStart(null);
                      setIcsEnd(null);
                    }}
                  />

                  {icsAllDay ? (
                    <Group grow>
                      <DatePickerInput
                        label={t("Start date")}
                        placeholder={t("Pick date")}
                        value={icsStart ? format(icsStart, "yyyy-MM-dd") : undefined}
                        onChange={(value) => value && setIcsStart(parseDateValue(value))}
                        size="sm"
                        withAsterisk
                      />
                      <DatePickerInput
                        label={t("End date")}
                        placeholder={t("Pick date")}
                        value={icsEnd ? format(icsEnd, "yyyy-MM-dd") : undefined}
                        onChange={(value) => value && setIcsEnd(parseDateValue(value))}
                        minDate={icsStart ? format(icsStart, "yyyy-MM-dd") : undefined}
                        size="sm"
                        withAsterisk
                      />
                    </Group>
                  ) : (
                    <Group grow>
                      <DateTimePicker
                        label={t("Start")}
                        placeholder={t("Pick date & time")}
                        value={icsStart ? format(icsStart, "yyyy-MM-dd HH:mm:ss") : undefined}
                        onChange={(value) => {
                          if (!value) return;
                          const d = parseDateTimeValue(value);
                          setIcsStart(d);
                          if (!icsEnd) setIcsEnd(addHours(d, 1));
                        }}
                        size="sm"
                        withAsterisk
                      />
                      <DateTimePicker
                        label={t("End")}
                        placeholder={t("Pick date & time")}
                        value={icsEnd ? format(icsEnd, "yyyy-MM-dd HH:mm:ss") : undefined}
                        onChange={(value) => value && setIcsEnd(parseDateTimeValue(value))}
                        minDate={icsStart ? format(icsStart, "yyyy-MM-dd HH:mm:ss") : undefined}
                        size="sm"
                        withAsterisk
                      />
                    </Group>
                  )}

                  <TextInput
                    label={t("Location")}
                    placeholder={t("Conference room / Zoom link")}
                    value={icsLocation}
                    onChange={(e) => setIcsLocation(e.currentTarget.value)}
                    size="sm"
                  />

                  <Textarea
                    label={t("Description")}
                    placeholder={t("Optional notes")}
                    value={icsDescription}
                    onChange={(e) => setIcsDescription(e.currentTarget.value)}
                    size="sm"
                    rows={2}
                    autosize
                    maxRows={4}
                  />
                </Stack>
              </Paper>
            )}
          </Box>
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={parseRecipients(to).length === 0 || !inviteValid}
            loading={sendMutation.isPending}
          >
            {t("Send")}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
