import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  getActiveCall,
  getCallConfig,
  joinCall,
  leaveCall,
} from "../services/call-service";
import { ICall, ICallConfig, IJoinCallResponse } from "../types/chat.types";

export const CALL_CONFIG_KEY = ["chat", "call-config"];
export const ACTIVE_CALL_KEY = ["chat", "active-call"];

export function useCallConfigQuery(): UseQueryResult<ICallConfig, Error> {
  return useQuery({
    queryKey: CALL_CONFIG_KEY,
    queryFn: getCallConfig,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActiveCallQuery(
  channelId?: string,
): UseQueryResult<ICall | null, Error> {
  return useQuery({
    queryKey: [...ACTIVE_CALL_KEY, channelId],
    queryFn: () => getActiveCall(channelId),
    enabled: !!channelId,
  });
}

export function useJoinCallMutation() {
  const queryClient = useQueryClient();
  return useMutation<IJoinCallResponse, Error, string>({
    mutationFn: joinCall,
    onSuccess: (data, channelId) => {
      queryClient.invalidateQueries({
        queryKey: [...ACTIVE_CALL_KEY, channelId],
      });
    },
  });
}

export function useLeaveCallMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { callId: string; channelId: string }>({
    mutationFn: ({ callId }) => leaveCall(callId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...ACTIVE_CALL_KEY, variables.channelId],
      });
    },
  });
}
