import { Alert, AlertDescription } from "@/brand/components/Alert";
import { AuthCard } from "@/brand/components/AuthCard";
import { Button } from "@/brand/components/Button";
import { Field, FieldLabel } from "@/brand/components/Field";
import { Input } from "@/brand/components/Input";

/** The harness stage is a phone's width, so this is the screen as a phone shows it: no card edge. */
export default function AuthCardPreview() {
  return (
    <AuthCard
      className="min-h-0 pt-6 pb-6"
      title="Reset password"
      description="We’ll email you a reset link."
      footer={
        <p>
          Remembered it?{" "}
          <Button variant="link" size="inline" className="font-semibold">
            Back to sign in
          </Button>
        </p>
      }
    >
      <Alert tone="danger">
        <AlertDescription>We couldn't send that link. Try again.</AlertDescription>
      </Alert>
      <Field>
        <FieldLabel htmlFor="auth-card-email">Email</FieldLabel>
        <Input id="auth-card-email" type="email" />
      </Field>
      <Button size="lg">Send reset link</Button>
    </AuthCard>
  );
}
