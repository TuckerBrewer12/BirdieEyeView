import { useLocation } from "react-router-dom";
import { AuthCard, Button, Field, FieldLabel, Input } from "@/brand";
import { useAuth } from "@/context/auth";
import { carryEmail } from "../authModel";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { useForgotPasswordViewModel, type ForgotPasswordArrival } from "./useForgotPasswordViewModel";

export function ForgotPasswordPage() {
  const routeState: unknown = useLocation().state;
  const viewModel = useForgotPasswordViewModel(useAuth(), (routeState ?? {}) as ForgotPasswordArrival);

  return (
    <AuthCard
      title="Reset password"
      description="We’ll email you a reset link."
      footer={
        <p>
          Remembered it?{" "}
          <AuthLink to="/login" state={carryEmail(routeState, viewModel.email)}>
            Back to sign in
          </AuthLink>
        </p>
      }
    >
      <form
        className="flex flex-col gap-4"
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
            value={viewModel.email}
            onChange={(event) => viewModel.setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <Button type="submit" size="lg" className="mt-1" disabled={viewModel.submitting}>
          {viewModel.submitting ? "Sending link…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
