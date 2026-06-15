import { ActionIcon, Button, Group, SegmentedControl, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconClock, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { format, type Locale } from "date-fns";
import { useDateFnsLocale } from "@/lib/date-locale";
import { CalendarViewType, getViewRange } from "../utils/calendar-range";

interface CalendarToolbarProps {
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  anchorDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewEvent: () => void;
  onBlockTime: () => void;
}

export function CalendarToolbar({
  view,
  onViewChange,
  anchorDate,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
  onBlockTime,
}: CalendarToolbarProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();

  const label = getRangeLabel(view, anchorDate, locale, t);

  return (
    <Group justify="space-between" wrap="wrap" mb="md" gap="sm">
      <Group gap="xs">
        <Button variant="default" size="xs" onClick={onToday}>
          {t("Today")}
        </Button>
        <ActionIcon variant="default" onClick={onPrev} aria-label={t("Previous")}>
          <IconChevronLeft size={16} />
        </ActionIcon>
        <ActionIcon variant="default" onClick={onNext} aria-label={t("Next")}>
          <IconChevronRight size={16} />
        </ActionIcon>
        <Text fw={600} size="lg" ml="xs">
          {label}
        </Text>
      </Group>

      <Group gap="sm">
        <SegmentedControl
          value={view}
          onChange={(value) => onViewChange(value as CalendarViewType)}
          data={[
            { label: t("Month"), value: "month" },
            { label: t("Week"), value: "week" },
            { label: t("Day"), value: "day" },
            { label: t("Agenda"), value: "agenda" },
          ]}
        />
        <Button
          variant="default"
          leftSection={<IconClock size={16} />}
          onClick={onBlockTime}
        >
          {t("Block time")}
        </Button>
        <Button leftSection={<IconPlus size={16} />} onClick={onNewEvent}>
          {t("New event")}
        </Button>
      </Group>
    </Group>
  );
}

function getRangeLabel(
  view: CalendarViewType,
  anchorDate: Date,
  locale: Locale,
  t: (key: string) => string,
): string {
  switch (view) {
    case "month":
      return format(anchorDate, "MMMM yyyy", { locale });
    case "day":
      return format(anchorDate, "EEEE, MMMM d, yyyy", { locale });
    case "agenda":
      return t("Upcoming");
    case "week": {
      const { start, end } = getViewRange("week", anchorDate);
      const startLabel = format(start, "MMM d", { locale });
      const endLabel = format(end, "MMM d, yyyy", { locale });
      return `${startLabel} – ${endLabel}`;
    }
    default:
      return "";
  }
}
