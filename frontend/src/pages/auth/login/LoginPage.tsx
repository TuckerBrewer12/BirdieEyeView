import { useLocation, useNavigate } from "react-router-dom";
import { AuthCard, Button, Field, FieldLabel, Input } from "@/brand";
import { useAuth } from "@/context/auth";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { PasswordField } from "../components/PasswordField";
import { useLoginViewModel, type LoginArrival } from "./useLoginViewModel";

const ERROR_ID = "login-error";

export function LoginPage() {
  const navigate = useNavigate();
  const arrival = (useLocation().state ?? {}) as LoginArrival;
  const viewModel = useLoginViewModel(useAuth(), arrival);

  return (
    <AuthCard
      title="Sign in"
      footer={
        <p>
          New here? <AuthLink to="/register">Create an account</AuthLink>
        </p>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submit(() => void navigate("/"));
        }}
      >
        <AuthNotice tone="success">{viewModel.notice}</AuthNotice>
        <AuthNotice tone="error" id={ERROR_ID}>
          {viewModel.error}
        </AuthNotice>

        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            value={viewModel.email}
            onChange={(event) => viewModel.setEmail(event.target.value)}
            required
            autoComplete="email"
            aria-invalid={viewModel.credentialsRefused ? true : undefined}
            aria-describedby={viewModel.credentialsRefused ? ERROR_ID : undefined}
          />
        </Field>

        <PasswordField
          id="login-password"
          label="Password"
          value={viewModel.password}
          onChange={viewModel.setPassword}
          autoComplete="current-password"
          invalid={viewModel.credentialsRefused}
          describedBy={viewModel.credentialsRefused ? ERROR_ID : undefined}
          labelAction={<AuthLink to="/forgot-password">Forgot?</AuthLink>}
        />

        <Button type="submit" size="lg" className="mt-1" disabled={viewModel.submitting}>
          {viewModel.submitting ? "Signing in…" : "Sign in"}
        </Button>

        {viewModel.canResendVerification && (
          <Button variant="outline" size="lg" disabled={viewModel.resending} onClick={viewModel.resendVerification}>
            {viewModel.resending ? "Sending…" : "Resend verification email"}
          </Button>
        )}
      </form>
    </AuthCard>
  );
}
