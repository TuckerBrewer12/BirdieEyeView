import { AuthLink } from "../components/AuthLink";

export default function AuthLinkPreview() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Don't have an account? <AuthLink to="/register">Create one</AuthLink>
      </p>
      <p className="text-right">
        <AuthLink to="/forgot-password">Forgot password?</AuthLink>
      </p>
    </>
  );
}
