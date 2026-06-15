import api from "@/lib/api-client";
import { IWebhook, IWebhookDelivery } from "../types/webhook.types";

export async function listWebhooks(): Promise<IWebhook[]> {
  const req = await api.post<IWebhook[]>("/webhooks/list");
  return req.data;
}

export async function createWebhook(data: {
  name: string;
  url: string;
  events: string[];
}): Promise<IWebhook & { secret?: string }> {
  const req = await api.post<IWebhook & { secret?: string }>(
    "/webhooks/create",
    data,
  );
  return req.data;
}

export async function updateWebhook(data: {
  webhookId: string;
  name?: string;
  url?: string;
  events?: string[];
  enabled?: boolean;
}): Promise<IWebhook> {
  const req = await api.post<IWebhook>("/webhooks/update", data);
  return req.data;
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await api.post("/webhooks/delete", { webhookId });
}

export async function listWebhookDeliveries(
  webhookId: string,
): Promise<IWebhookDelivery[]> {
  const req = await api.post<IWebhookDelivery[]>("/webhooks/deliveries", {
    webhookId,
  });
  return req.data;
}
