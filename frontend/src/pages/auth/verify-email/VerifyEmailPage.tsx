import { useSearchParams } from "react-router-dom";
import { AuthCard, LoadingState } from "@/brand";
import { useAuth } from "@/context/AuthContext";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { useVerifyEmailViewModel } from "./useVerifyEmailViewModel";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const viewModel = useVerifyEmailViewModel(useAuth(), searchParams.get("token") ?? "");

  return (
    <AuthCard
      title="Email verification"
      description="Once your email is verified you can sign in and start tracking rounds."
      footer={
        <>
          <p>
            <AuthLink to="/login">Go to sign in</AuthLink>
          </p>
          <p>
            <AuthLink to="/verify-pending">Need another confirmation email?</AuthLink>
          </p>
        </>
      }
    >
      {viewModel.status === "verifying" ? (
        <LoadingState className="h-auto py-3">{viewModel.message}</LoadingState>
      ) : (
        <AuthNotice tone={viewModel.status === "verified" ? "success" : "error"}>
          {viewModel.message}
        </AuthNotice>
      )}
    </AuthCard>
  );
}
