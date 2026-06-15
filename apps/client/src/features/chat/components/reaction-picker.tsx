import React, { Suspense, useState } from "react";
import { ActionIcon, Popover, useMantineColorScheme } from "@mantine/core";
import { useClickOutside, useDisclosure, useWindowEvent } from "@mantine/hooks";
import { IconMoodSmile } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const Picker = React.lazy(async () => {
  const [pickerModule, dataModule] = await Promise.all([
    import("@slidoapp/emoji-mart-react"),
    import("@slidoapp/emoji-mart-data"),
  ]);
  const PickerComp = pickerModule.default;
  const data = dataModule.default;
  return {
    default: (props: any) => <PickerComp {...props} data={data} />,
  };
});

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
}

export function ReactionPicker({ onSelect }: ReactionPickerProps) {
  const { t } = useTranslation();
  const [opened, handlers] = useDisclosure(false);
  const { colorScheme } = useMantineColorScheme();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [dropdown, setDropdown] = useState<HTMLDivElement | null>(null);

  useClickOutside(() => handlers.close(), ["mousedown", "touchstart"], [
    dropdown,
    target,
  ]);

  useWindowEvent("keydown", (event) => {
    if (opened && event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      handlers.close();
    }
  });

  const handleEmojiSelect = (emoji: { native: string }) => {
    onSelect(emoji.native);
    handlers.close();
  };

  return (
    <Popover
      opened={opened}
      onClose={handlers.close}
      width={332}
      position="top"
      withinPortal
      closeOnEscape
    >
      <Popover.Target ref={setTarget}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={handlers.toggle}
          aria-label={t("Add reaction")}
          aria-haspopup="dialog"
          aria-expanded={opened}
        >
          <IconMoodSmile size={16} />
        </ActionIcon>
      </Popover.Target>
      <Suspense fallback={null}>
        <Popover.Dropdown bg="000" style={{ border: "none" }} ref={setDropdown}>
          <Picker
            onEmojiSelect={handleEmojiSelect}
            perLine={8}
            skinTonePosition="search"
            theme={colorScheme}
          />
        </Popover.Dropdown>
      </Suspense>
    </Popover>
  );
}
