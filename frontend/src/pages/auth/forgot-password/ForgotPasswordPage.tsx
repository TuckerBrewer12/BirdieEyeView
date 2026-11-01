import { AuthCard, Button, Field, FieldLabel, Input } from "@/brand";
import { useAuth } from "@/context/AuthContext";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { useForgotPasswordViewModel } from "./useForgotPasswordViewModel";

export function ForgotPasswordPage() {
  const viewModel = useForgotPasswordViewModel(useAuth());

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your email and we'll send a secure reset link."
      footer={
        <p>
          Remembered it? <AuthLink to="/login">Back to sign in</AuthLink>
        </p>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submit();
        }}
      >
        <AuthNotice tone="success">{viewModel.notice}</AuthNotice>
        <AuthNotice tone="error">{viewModel.error}</AuthNotice>

        <Field>
          <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
          <Input
            id="forgot-email"
            type="email"
            size="cta"
            value={viewModel.email}
            onChange={(event) => viewModel.setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>

        <Button type="submit" size="cta" disabled={viewModel.submitting}>
          {viewModel.submitting ? "Sending link…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
