import { useNavigate } from "react-router-dom";
import { AuthCard, Button, Field, FieldLabel, Input } from "@/brand";
import { useAuth } from "@/context/auth";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { PasswordField } from "../components/PasswordField";
import { useRegisterViewModel } from "./useRegisterViewModel";

export function RegisterPage() {
  const navigate = useNavigate();
  const viewModel = useRegisterViewModel(useAuth());

  return (
    <AuthCard
      title="Create account"
      footer={
        <p>
          Have an account? <AuthLink to="/login">Sign in</AuthLink>
        </p>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submit((email, message) =>
            void navigate(`/verify-pending?email=${encodeURIComponent(email)}`, {
              state: { flash: message, email },
            }),
          );
        }}
      >
        <AuthNotice tone="error">{viewModel.error}</AuthNotice>

        <Field>
          <FieldLabel htmlFor="register-name">Name</FieldLabel>
          <Input
            id="register-name"
            value={viewModel.name}
            onChange={(event) => viewModel.setName(event.target.value)}
            required
            autoComplete="name"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="register-email">Email</FieldLabel>
          <Input
            id="register-email"
            type="email"
            value={viewModel.email}
            onChange={(event) => viewModel.setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <PasswordField
          id="register-password"
          label="Password"
          value={viewModel.password}
          onChange={viewModel.setPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={viewModel.fieldErrors.password}
        />

        <PasswordField
          id="register-confirm"
          label="Confirm password"
          value={viewModel.confirm}
          onChange={viewModel.setConfirm}
          autoComplete="new-password"
          error={viewModel.fieldErrors.confirm}
          revealName="confirm password"
        />

        <Button type="submit" size="lg" className="mt-1" disabled={viewModel.submitting}>
          {viewModel.submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
