import { AuthNotice } from "../components/AuthNotice";

export default function AuthNoticePreview() {
  return (
    <>
      <AuthNotice tone="success">
        If this account exists, a password reset link has been sent.
      </AuthNotice>
      <AuthNotice tone="error">Invalid email or password</AuthNotice>
      {/* Renders nothing without a message. */}
      <AuthNotice tone="error">{null}</AuthNotice>
    </>
  );
}
