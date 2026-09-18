import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AuthSplitLayout,
  Button,
  Field,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  PageTitle,
} from "@/brand";
import { useAuth } from "@/context/AuthContext";
import { useLoginPageViewModel } from "./useLoginPageViewModel";

export function LoginPage() {
  const viewModel = useLoginPageViewModel(useAuth());

  return (
    <AuthSplitLayout
      headline={<>Welcome back.<br />Your game awaits.</>}
      body="Pick up where you left off — track rounds, review stats, and keep improving."
      mobileSubtitle="Sign in to your account"
    >
      <PageTitle size="lg" className="mb-8">Sign In</PageTitle>

      <form onSubmit={viewModel.submit} className="flex flex-col gap-5">
        {viewModel.flashMessage && (
          <Alert variant="success" role="status">
            <AlertDescription>{viewModel.flashMessage}</AlertDescription>
          </Alert>
        )}
        {viewModel.error && (
          <Alert variant="destructive">
            <AlertDescription>{viewModel.error}</AlertDescription>
          </Alert>
        )}
        {viewModel.resendMessage && (
          <Alert variant="success" role="status">
            <AlertDescription>{viewModel.resendMessage}</AlertDescription>
          </Alert>
        )}

        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            size="cta"
            value={viewModel.email}
            onChange={(event) => viewModel.setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <InputGroup size="cta">
            <InputGroupInput
              id="login-password"
              type={viewModel.passwordInputType}
              value={viewModel.password}
              onChange={(event) => viewModel.setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={viewModel.togglePasswordRevealed}
                aria-label={viewModel.revealLabel}
                aria-pressed={viewModel.passwordRevealed}
              >
                {viewModel.passwordRevealed ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Button variant="link" size="xs" className="self-end" render={<Link to="/forgot-password" />}>
            Forgot password?
          </Button>
        </Field>

        <Button type="submit" size="cta" disabled={viewModel.submitting}>
          {viewModel.submitLabel}
        </Button>

        {viewModel.canResendVerification && (
          <Button variant="outline" size="cta" disabled={viewModel.resending} onClick={viewModel.resendVerification}>
            {viewModel.resendLabel}
          </Button>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Button variant="link" size="xs" className="px-0" render={<Link to="/register" />}>
          Create one
        </Button>
      </p>
    </AuthSplitLayout>
  );
}
