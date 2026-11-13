import { Alert, AlertDescription } from "@/brand/components/Alert";
import { AuthCard } from "@/brand/components/AuthCard";
import { Button } from "@/brand/components/Button";
import { Field, FieldLabel } from "@/brand/components/Field";
import { Input } from "@/brand/components/Input";

/** The harness stage is a phone's width, so this is the card as a phone shows it. */
export default function AuthCardPreview() {
  return (
    <AuthCard
      className="min-h-0 py-0"
      title="Forgot password"
      description="Enter your email and we'll send a secure reset link."
      footer={
        <p>
          Remembered it?{" "}
          <Button variant="link" size="xs" className="px-0">
            Back to sign in
          </Button>
        </p>
      }
    >
      <Alert tone="danger">
        <AlertDescription>We couldn't complete this account request. Please try again.</AlertDescription>
      </Alert>
      <Field>
        <FieldLabel htmlFor="auth-card-email">Email</FieldLabel>
        <Input id="auth-card-email" type="email" size="cta" placeholder="you@example.com" />
      </Field>
      <Button size="cta">Send reset link</Button>
    </AuthCard>
  );
}
