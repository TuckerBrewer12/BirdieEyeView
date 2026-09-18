import { AuthSplitLayout } from "@/brand/components/AuthSplitLayout";

/** The harness slot is 390px, under the 48rem container break, so this pins the phone layout. */
export default function AuthSplitLayoutPreview() {
  return (
    <AuthSplitLayout
      headline={<>Welcome back.<br />Your game awaits.</>}
      body="Pick up where you left off."
      mobileSubtitle="Sign in to your account"
    >
      <div className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Form goes here
      </div>
    </AuthSplitLayout>
  );
}
