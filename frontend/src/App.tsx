import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ScanPage, ScanSessionProvider } from "./pages/scan";
import { AppLayout } from "./app/AppLayout";
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
  VerifyPendingPage,
} from "./pages/auth";
import { needsSignIn, returnPathFrom, signInReturnFor } from "./pages/auth/signInReturnModel";
import { LandingPage } from "./pages/landing-page";

import { DashboardPage } from "./pages/dashboard";
import { RoundsPage, RoundDetailPage } from "./pages/rounds";
import { CoursesPage, CourseDetailPage } from "./pages/courses";
import { AnalyticsPage } from "./pages/analytics";
import { CareerPage } from "./pages/career";
import { TheLabPage } from "./pages/the-lab";
import { SettingsPage } from "./pages/settings";
import { SocialPage, FriendsInboxPage } from "./pages/social";
import { BrandHarness } from "./brand/BrandHarness";

function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType !== "POP") window.scrollTo(0, 0);
  }, [pathname, navType]);
  return null;
}

function BrandRoutes() {
  return (
    <Routes>
      <Route path="/__brand__/:story" element={<BrandHarness />} />
    </Routes>
  );
}

function RootRoutes() {
  const location = useLocation();

  if (import.meta.env.DEV && location.pathname.startsWith("/__brand__")) {
    return <BrandRoutes />;
  }

  return (
    <AuthProvider>
      <ScanSessionProvider>
        <AppRoutes />
      </ScanSessionProvider>
    </AuthProvider>
  );
}

/**
 * Signed out on a page nobody routes there: one of the app's pages goes to sign in and comes
 * back after, unless the golfer just signed out themselves; anything else goes to the landing page.
 */
function SignedOutRedirect({ signedOutByUser }: { signedOutByUser: boolean }) {
  const location = useLocation();
  if (!signedOutByUser && needsSignIn(location.pathname)) {
    return <Navigate to="/login" replace state={signInReturnFor(location)} />;
  }
  return <Navigate to="/" replace />;
}

function AppRoutes() {
  const { userId, loading, signedOutByUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-pending" element={<VerifyPendingPage />} />
        <Route path="*" element={<SignedOutRedirect signedOutByUser={signedOutByUser} />} />
      </Routes>
    );
  }

  if (location.pathname === "/verify-email") {
    return (
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage userId={userId} />} />
          <Route path="/rounds" element={<RoundsPage userId={userId} />} />
          <Route path="/rounds/:roundId" element={<RoundDetailPage userId={userId} />} />
          <Route path="/courses" element={<CoursesPage userId={userId} />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage userId={userId} />} />
          <Route path="/scan" element={<ScanPage userId={userId} />} />
          <Route path="/analytics" element={<AnalyticsPage userId={userId} />} />
          <Route path="/the-lab" element={<TheLabPage userId={userId} />} />
          <Route path="/social" element={<SocialPage userId={userId} />} />
          <Route path="/career" element={<CareerPage userId={userId} />} />
          <Route path="/inbox" element={<FriendsInboxPage userId={userId} />} />
          <Route path="/settings" element={<SettingsPage userId={userId} />} />
          {/* Just signed in from /login: back to the page that sent them there, else home.
              A new section here also goes in SIGNED_IN_SECTIONS (pages/auth/signInReturnModel.ts). */}
          <Route path="*" element={<Navigate to={returnPathFrom(location.state) ?? "/"} replace />} />
        </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RootRoutes />
    </BrowserRouter>
  );
}
