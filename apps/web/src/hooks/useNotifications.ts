import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { NOTIFICATION_EVENT, type NotificationPayload } from "@live-crm/shared";
import { apiRequest } from "../api/client";
import type { NotificationPage } from "../api/types";
import { useAuth } from "./useAuth";
import { useToast } from "../components/ToastProvider";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const enabled = user?.systemRole === "USER";
  const query = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => apiRequest<NotificationPage>("/notifications?status=all"),
    enabled,
  });
  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest<NotificationPayload>(`/notifications/${id}/read`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const markAllRead = useMutation({
    mutationFn: () =>
      apiRequest<{ updatedCount: number }>("/notifications/read-all", {
        method: "PATCH",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!enabled || !user) {
      return;
    }

    const socket = io({
      withCredentials: true,
      transports: ["polling", "websocket"],
    });

    socket.on(NOTIFICATION_EVENT, (notification: NotificationPayload) => {
      queryClient.setQueryData<NotificationPage>(
        ["notifications", "all"],
        (current) => {
          if (!current) {
            return {
              items: [notification],
              page: 1,
              limit: 20,
              total: 1,
              unreadCount: 1,
            };
          }

          if (current.items.some((item) => item.id === notification.id)) {
            return current;
          }

          return {
            ...current,
            items: [notification, ...current.items].slice(0, current.limit),
            total: current.total + 1,
            unreadCount: current.unreadCount + 1,
          };
        },
      );
      showToast({
        title:
          notification.type === "FOLLOW_UP_REMINDER"
            ? "Assignment reminder"
            : "New assignment",
        message: notification.message,
        tone: "info",
      });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["assignments", "me"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled, queryClient, showToast, user]);

  return {
    notifications: query.data?.items ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    markRead: markRead.mutateAsync,
    markAllRead: markAllRead.mutateAsync,
    isMarkingAll: markAllRead.isPending,
  };
}
