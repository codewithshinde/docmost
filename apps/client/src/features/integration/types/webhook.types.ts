export interface IWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

export interface IWebhookDelivery {
  id: string;
  event: string;
  status: string;
  statusCode: number | null;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}
