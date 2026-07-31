import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

interface Toast {
  id: number;
  title: string;
  message?: string;
  tone: "success" | "error" | "info";
}

interface ToastInput {
  title: string;
  message?: string;
  tone?: Toast["tone"];
}

const ToastContext = createContext<((input: ToastInput) => void) | undefined>(
  undefined,
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [
      ...current,
      { id, tone: input.tone ?? "info", ...input },
    ]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => showToast, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.tone}`} key={toast.id}>
            {toast.tone === "error" ? (
              <CircleAlert size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
            <div>
              <strong>{toast.title}</strong>
              {toast.message ? <p>{toast.message}</p> : null}
            </div>
            <button
              className="icon-button"
              onClick={() =>
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id),
                )
              }
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
