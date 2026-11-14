import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthCard, Button } from "@/brand";
import { useAuth } from "@/context/auth";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { PasswordField } from "../components/PasswordField";
import { useResetPasswordViewModel } from "./useResetPasswordViewModel";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewModel = useResetPasswordViewModel(useAuth(), searchParams.get("token") ?? "");
  const { fieldErrors } = viewModel;

  return (
    <AuthCard
      title="New password"
      footer={
        <p>
          Remembered it? <AuthLink to="/login">Back to sign in</AuthLink>
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
        <AuthNotice tone="error">
          {viewModel.tokenMissing
            ? "Missing reset token. Open the reset link from your email."
            : viewModel.error}
        </AuthNotice>

        {viewModel.done ? (
          <Button
            size="lg"
            onClick={() => void navigate("/login", { state: { flash: viewModel.notice } })}
          >
            Continue to sign in
          </Button>
        ) : (
          <>
            <PasswordField
              id="reset-password"
              label="New password"
              value={viewModel.password}
              onChange={viewModel.setPassword}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={fieldErrors.password}
            />
            <PasswordField
              id="reset-confirm"
              label="Confirm password"
              value={viewModel.confirm}
              onChange={viewModel.setConfirm}
              autoComplete="new-password"
              error={fieldErrors.confirm}
              revealName="confirm password"
            />
            <Button type="submit" size="lg" className="mt-1" disabled={!viewModel.canSubmit}>
              {viewModel.submitting ? "Saving…" : "Save password"}
            </Button>
          </>
        )}
      </form>
    </AuthCard>
  );
}
