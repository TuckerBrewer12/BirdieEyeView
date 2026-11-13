import { useLocation, useNavigate } from "react-router-dom";
import { AuthCard, Button, Field, FieldLabel, Input } from "@/brand";
import { useAuth } from "@/context/auth";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { PasswordField } from "../components/PasswordField";
import { useLoginViewModel, type LoginArrival } from "./useLoginViewModel";

export function LoginPage() {
  const navigate = useNavigate();
  const arrival = (useLocation().state ?? {}) as LoginArrival;
  const viewModel = useLoginViewModel(useAuth(), arrival);

  return (
    <AuthCard
      title="Sign in"
      description="Pick up where you left off: your rounds, your stats, your game."
      footer={
        <p>
          Don't have an account? <AuthLink to="/register">Create one</AuthLink>
        </p>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submit(() => void navigate("/"));
        }}
      >
        <AuthNotice tone="success">{viewModel.notice}</AuthNotice>
        <AuthNotice tone="error">{viewModel.error}</AuthNotice>

        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
           
            value={viewModel.email}
            onChange={(event) => viewModel.setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>

        <PasswordField
          id="login-password"
          label="Password"
          value={viewModel.password}
          onChange={viewModel.setPassword}
          autoComplete="current-password"
          placeholder="••••••••"
        >
          <div className="text-right">
            <AuthLink to="/forgot-password">Forgot password?</AuthLink>
          </div>
        </PasswordField>

        <Button type="submit" size="cta" disabled={viewModel.submitting}>
          {viewModel.submitting ? "Signing in…" : "Sign in"}
        </Button>

        {viewModel.canResendVerification && (
          <Button
            variant="outline"
            size="cta"
            disabled={viewModel.resending}
            onClick={viewModel.resendVerification}
          >
            {viewModel.resending ? "Sending…" : "Resend verification email"}
          </Button>
        )}
      </form>
    </AuthCard>
  );
}
