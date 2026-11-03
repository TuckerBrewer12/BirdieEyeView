import { useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { AuthCard, Button, Field, FieldLabel, Input } from "@/brand";
import { cn } from "@/brand/cn";
import { useAuth } from "@/context/AuthContext";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { useVerifyPendingViewModel, type VerifyPendingArrival } from "./useVerifyPendingViewModel";

export function VerifyPendingPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = (useLocation().state ?? {}) as VerifyPendingArrival;
  const goHome = useCallback(() => navigate("/", { replace: true }), [navigate]);
  const viewModel = useVerifyPendingViewModel(
    auth,
    { userId: auth.userId, emailVerified: auth.emailVerified },
    { email: state.email ?? searchParams.get("email"), flash: state.flash },
    goHome,
  );

  return (
    <AuthCard
      title="Verify your email"
      description="We sent you a verification link. Open it to activate your account, then sign in."
      footer={
        <>
          <p>
            Already verified?{" "}
            <AuthLink to="/login" state={{ email: viewModel.email.trim() }}>
              Go to sign in
            </AuthLink>
          </p>
          <p>
            Need a different account? <AuthLink to="/register">Create one</AuthLink>
          </p>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.resend();
        }}
      >
        <AuthNotice tone="success">{viewModel.notice}</AuthNotice>
        <AuthNotice tone="error">{viewModel.error}</AuthNotice>

        <Field>
          <FieldLabel htmlFor="verify-email">Email</FieldLabel>
          <Input
            id="verify-email"
            type="email"
            value={viewModel.email}
            onChange={(event) => viewModel.setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>

        <Button type="submit" size="cta" disabled={viewModel.resending}>
          <RefreshCw data-icon="inline-start" className={cn(viewModel.resending && "animate-spin")} />
          {viewModel.resending ? "Sending…" : "Send another confirmation email"}
        </Button>
      </form>
    </AuthCard>
  );
}
