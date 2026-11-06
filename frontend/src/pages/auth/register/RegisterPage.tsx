import { useNavigate } from "react-router-dom";
import {
  AuthCard,
  Button,
  CourseLinkSearch,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from "@/brand";
import { useAuth } from "@/context/auth";
import { AuthLink } from "../components/AuthLink";
import { AuthNotice } from "../components/AuthNotice";
import { PasswordField } from "../components/PasswordField";
import { useRegisterViewModel } from "./useRegisterViewModel";

export function RegisterPage() {
  const navigate = useNavigate();
  const viewModel = useRegisterViewModel(useAuth());
  const { fieldErrors } = viewModel;

  return (
    <AuthCard
      title="Create account"
      description="Scan scorecards, track every stat, and see where your game improves."
      footer={
        <p>
          Already have an account? <AuthLink to="/login">Sign in</AuthLink>
        </p>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          viewModel.submit((email, message) =>
            void navigate(`/verify-pending?email=${encodeURIComponent(email)}`, {
              state: { flash: message, email },
            }),
          );
        }}
      >
        <AuthNotice tone="error">{viewModel.error}</AuthNotice>

        <Field>
          <FieldLabel htmlFor="register-name">Name</FieldLabel>
          <Input
            id="register-name"
            size="cta"
            value={viewModel.name}
            onChange={(event) => viewModel.setName(event.target.value)}
            required
            autoComplete="name"
            placeholder="Tiger Woods"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="register-email">Email</FieldLabel>
          <Input
            id="register-email"
            type="email"
            size="cta"
            value={viewModel.email}
            onChange={(event) => viewModel.setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>

        <PasswordField
          id="register-password"
          label="Password"
          value={viewModel.password}
          onChange={viewModel.setPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={fieldErrors.password}
        />

        <PasswordField
          id="register-confirm"
          label="Confirm password"
          value={viewModel.confirm}
          onChange={viewModel.setConfirm}
          autoComplete="new-password"
          placeholder="••••••••"
          error={fieldErrors.confirm}
          revealName="confirm password"
        />

        <Field>
          <FieldLabel htmlFor="register-handicap">Handicap (optional)</FieldLabel>
          <Input
            id="register-handicap"
            size="cta"
            inputMode="decimal"
            value={viewModel.handicap}
            onChange={(event) => viewModel.setHandicap(event.target.value)}
            placeholder="e.g. 18.4 or +2.0"
            aria-invalid={fieldErrors.handicap ? true : undefined}
            aria-describedby={fieldErrors.handicap ? "register-handicap-error" : undefined}
          />
          <FieldError id="register-handicap-error">{fieldErrors.handicap}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="register-home-course">Home course (optional)</FieldLabel>
          <CourseLinkSearch
            inputId="register-home-course"
            query={viewModel.courseQuery}
            results={viewModel.courseResults}
            searching={viewModel.searchingCourses}
            onQueryChange={viewModel.setCourseQuery}
            onSelectCourse={viewModel.pickHomeCourse}
            onClose={viewModel.clearHomeCourse}
            linkedName={viewModel.homeCourse?.name}
            linkedTitle="Selected"
            onClear={viewModel.clearHomeCourse}
            clearLabel="Change home course"
          />
          <FieldDescription>
            Pick it from the list. Not there? Leave it blank and set it later in Settings.
          </FieldDescription>
        </Field>

        <Button type="submit" size="cta" disabled={viewModel.submitting}>
          {viewModel.submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
