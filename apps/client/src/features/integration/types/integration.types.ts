export type CallProvider = "livekit" | "jitsi";

export interface ICallEffectiveConfig {
  provider: CallProvider;
  enabled: boolean;
  configured: boolean;
  livekitUrl: string | null;
  jitsiDomain: string | null;
}

export interface ICallSettingsView {
  key: string;
  enabled: boolean;
  config: {
    provider?: CallProvider;
    livekitUrl?: string;
    jitsiDomain?: string;
    jitsiAppId?: string;
  };
  secretKeys: string[];
  effective: ICallEffectiveConfig;
}

export interface IUpdateCallSettings {
  enabled?: boolean;
  provider?: CallProvider;
  livekitUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
  jitsiDomain?: string;
  jitsiAppId?: string;
  jitsiAppSecret?: string;
}

export interface IConnectionTestResult {
  ok: boolean;
  message: string;
}
