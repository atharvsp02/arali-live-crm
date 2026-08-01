import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@live-crm/shared";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiClientError } from "../api/client";
import { AraliLogo } from "../components/AraliLogo";
import { useAuth } from "../hooks/useAuth";

const demoAccounts = [
  {
    label: "Admin",
    detail: "Manage customers and assignments",
    email: "admin@crm.local",
    password: "Admin123!",
  },
  {
    label: "Atharv",
    detail: "Open the account owner workspace",
    email: "atharv@crm.local",
    password: "User123!",
  },
  {
    label: "Maya",
    detail: "Open the contact owner workspace",
    email: "maya@crm.local",
    password: "User123!",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
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

  function selectDemoAccount(email: string, password: string) {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-card">
          <div className="brand login-brand">
            <AraliLogo />
          </div>

          <div className="login-heading">
            <span className="eyebrow">Secure account access</span>
            <h1>Sign in to your workspace</h1>
            <p>Enter your account credentials to continue.</p>
          </div>

          <form
            onSubmit={handleSubmit(submit)}
            className="form-stack login-form"
          >
            <div className="form-field">
              <label htmlFor="login-email">Email address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={Boolean(errors.email)}
                />
              </div>
              {errors.email ? (
                <span className="field-error">{errors.email.message}</span>
              ) : null}
            </div>
            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <LockKeyhole size={18} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password ? (
                <span className="field-error">{errors.password.message}</span>
              ) : null}
            </div>
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
              {!isSubmitting ? <ArrowRight size={17} /> : null}
            </button>
          </form>

          <div className="mobile-demo-section">
            <span>Optional demo access</span>
            <div className="demo-grid">
              {demoAccounts.map((account) => (
                <button
                  type="button"
                  className="demo-account"
                  key={account.email}
                  onClick={() =>
                    selectDemoAccount(account.email, account.password)
                  }
                >
                  <strong>{account.label}</strong>
                  <small>{account.email}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="login-story">
        <div className="story-content">
          <span className="login-story-marker">One secure sign-in</span>
          <span className="eyebrow">Role-aware access</span>
          <h2>Customer ownership, kept in sync.</h2>
          <p>
            Admins assign companies and contacts. Team members receive private
            updates and keep their work moving from one secure workspace.
          </p>
          <ul className="story-features">
            <li>Private assignment alerts</li>
            <li>Persistent notification history</li>
          </ul>
        </div>

        <div className="demo-section">
          <div>
            <strong>Optional demo access</strong>
            <span>Choose an account to continue.</span>
          </div>
          <div className="demo-grid">
            {demoAccounts.map((account) => (
              <button
                type="button"
                className="demo-account"
                key={account.email}
                onClick={() =>
                  selectDemoAccount(account.email, account.password)
                }
              >
                <span className="demo-avatar">{account.label.slice(0, 1)}</span>
                <span>
                  <strong>{account.label}</strong>
                  <small>{account.detail}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
