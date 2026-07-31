import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthenticatedUser, LoginInput } from "@live-crm/shared";
import { apiRequest } from "../api/client";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest<AuthenticatedUser>("/auth/me"),
    retry: false,
  });
  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest<AuthenticatedUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
  const logoutMutation = useMutation({
    mutationFn: () =>
      apiRequest<null>("/auth/logout", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: sessionQuery.data ?? null,
        isLoading: sessionQuery.isLoading,
        login: loginMutation.mutateAsync,
        logout: async () => {
          await logoutMutation.mutateAsync();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
