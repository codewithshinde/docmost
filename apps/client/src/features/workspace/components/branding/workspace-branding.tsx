import { Helmet } from "react-helmet-async";
import { IWorkspaceBrandingSettings } from "@/features/workspace/types/workspace.types";

type WorkspaceBrandingProps = {
  branding?: IWorkspaceBrandingSettings | null;
};

export default function WorkspaceBranding({
  branding,
}: WorkspaceBrandingProps) {
  if (!branding) {
    return null;
  }

  const primaryColorCss = branding.primaryColor
    ? `:root { --docmost-brand-primary-color: ${branding.primaryColor}; }`
    : "";

  return (
    <Helmet>
      {branding.faviconUrl && <link rel="icon" href={branding.faviconUrl} />}
      {(primaryColorCss || branding.customCss) && (
        <style type="text/css">
          {`${primaryColorCss}\n${branding.customCss ?? ""}`}
        </style>
      )}
    </Helmet>
  );
}
