import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@live-crm/shared";
import { ArrowRight, BellRing, Building2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiClientError } from "../api/client";
import { useAuth } from "../hooks/useAuth";

const demoAccounts = [
  {
    label: "Admin",
    email: "admin@crm.local",
    password: "Admin123!",
  },
  {
    label: "Atharv",
    email: "atharv@crm.local",
    password: "User123!",
  },
  {
    label: "Maya",
    email: "maya@crm.local",
    password: "User123!",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@crm.local",
      password: "Admin123!",
    },
  });

  useEffect(() => {
    if (user) {
      navigate(user.systemRole === "ADMIN" ? "/admin" : "/dashboard", {
        replace: true,
      });
    }
  }, [navigate, user]);

  async function submit(input: LoginInput) {
    try {
      const authenticatedUser = await login(input);
      navigate(
        authenticatedUser.systemRole === "ADMIN" ? "/admin" : "/dashboard",
        { replace: true },
      );
    } catch (error) {
      setError("root", {
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to sign in. Please try again.",
      });
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand brand-light">
          <span className="brand-mark">
            <Building2 size={22} />
          </span>
          <span>Arali CRM</span>
        </div>
        <div className="story-copy">
          <span className="eyebrow eyebrow-light">Live customer ownership</span>
          <h1>Every assignment reaches the right person, instantly.</h1>
          <p>
            A focused CRM workspace with durable notifications, secure delivery,
            and reliable background follow-ups.
          </p>
        </div>
        <div className="story-features">
          <div>
            <BellRing size={20} />
            <span>Private real-time alerts</span>
          </div>
          <div>
            <ShieldCheck size={20} />
            <span>Role-based access</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-heading">
            <span className="eyebrow">Welcome back</span>
            <h2>Sign in to your workspace</h2>
            <p>Use one of the demo accounts below to test the complete flow.</p>
          </div>

          <form onSubmit={handleSubmit(submit)} className="form-stack">
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? (
                <span className="field-error">{errors.email.message}</span>
              ) : null}
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password ? (
                <span className="field-error">{errors.password.message}</span>
              ) : null}
            </label>
            {errors.root ? (
              <div className="form-error" role="alert">
                {errors.root.message}
              </div>
            ) : null}
            <button
              className="button button-primary button-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <span className="spinner spinner-small" /> : null}
              {isSubmitting ? "Signing in" : "Sign in"}
              {!isSubmitting ? <ArrowRight size={18} /> : null}
            </button>
          </form>

          <div className="demo-section">
            <span>Demo accounts</span>
            <div className="demo-grid">
              {demoAccounts.map((account) => (
                <button
                  type="button"
                  className="demo-account"
                  key={account.email}
                  onClick={() => {
                    setValue("email", account.email);
                    setValue("password", account.password);
                  }}
                >
                  <strong>{account.label}</strong>
                  <small>{account.email}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
