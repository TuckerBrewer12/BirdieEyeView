import { useState } from "react";
import { PasswordField } from "../components/PasswordField";

export default function PasswordFieldPreview() {
  const [password, setPassword] = useState("birdie123");
  const [confirm, setConfirm] = useState("birdie");

  return (
    <>
      <PasswordField
        id="preview-password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <PasswordField
        id="preview-confirm"
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error="Passwords do not match."
        revealName="confirm password"
      />
    </>
  );
}
