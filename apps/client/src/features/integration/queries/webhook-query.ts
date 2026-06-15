import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  updateWebhook,
} from "../services/webhook-service";

export const WEBHOOKS_KEY = ["integrations", "webhooks"];

export function useWebhooksQuery() {
  return useQuery({ queryKey: WEBHOOKS_KEY, queryFn: listWebhooks });
}

export function useWebhookDeliveriesQuery(webhookId?: string | null) {
  return useQuery({
    queryKey: [...WEBHOOKS_KEY, webhookId, "deliveries"],
    queryFn: () => listWebhookDeliveries(webhookId),
    enabled: !!webhookId,
  });
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWebhook,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY });
      notifications.show({
        title: "Webhook created",
        message: data.secret
          ? `Signing secret: ${data.secret}`
          : "Webhook created",
        color: "green",
        autoClose: 10000,
      });
    },
  });
}

export function useUpdateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWebhook,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY }),
  });
}

export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY }),
  });
}
