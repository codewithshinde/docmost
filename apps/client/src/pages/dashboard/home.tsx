import { Container, Space } from "@mantine/core";
import HomeTabs from "@/features/home/components/home-tabs";
import HomeAiPrompt from "@/features/home/components/home-ai-prompt";
import HomeAppTiles from "@/features/home/components/home-app-tiles";
import DashboardCalendarBlock from "@/features/home/components/dashboard-calendar-block";
import SpaceCarousel from "@/features/space/components/space-carousel.tsx";
import { getAppName } from "@/lib/config.ts";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>
          {t("Home")} - {getAppName()}
        </title>
      </Helmet>
      {/* Very faint tiled Likh logo watermark — does not interfere with content */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: "url(/likh-logo.svg)",
          backgroundRepeat: "repeat",
          backgroundSize: "120px 120px",
          opacity: 0.025,
        }}
      />
      <Container size={"900"} pt="md" style={{ position: "relative", zIndex: 1 }}>
        <HomeAppTiles />

        <Space h="md" />

        <HomeAiPrompt />

        <Space h="xl" />

        <DashboardCalendarBlock />

        <Space h="xl" />

        <SpaceCarousel />

        <Space h="xl" />

        <HomeTabs />
      </Container>
    </>
  );
}
