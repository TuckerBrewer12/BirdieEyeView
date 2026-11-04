import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
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
import { LandingPage } from "./pages/landing-page";

import { DashboardPage } from "./pages/dashboard";
import { RoundsPage, RoundDetailPage } from "./pages/rounds";
import { CoursesPage, CourseDetailPage } from "./pages/courses";
import { AnalyticsPage } from "./pages/analytics";
import { CareerPage } from "./pages/career";
import { TheLabPage } from "./pages/the-lab";
import { SettingsPage } from "./pages/settings";
import { SocialPage, FriendsInboxPage } from "./pages/social";

// The preview harness eagerly imports every preview and test fixture. It only
// exists in dev (the screenshot tests run against the dev server), so a
// production build drops the import, and everything behind it, entirely.
const BrandHarness = import.meta.env.DEV
  ? lazy(() => import("./brand/BrandHarness").then((m) => ({ default: m.BrandHarness })))
  : () => null;

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
      <Route
        path="/__brand__/:story"
        element={
          <Suspense fallback={null}>
            <BrandHarness />
          </Suspense>
        }
      />
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

function AppRoutes() {
  const { userId, loading } = useAuth();
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
        <Route path="*" element={<Navigate to="/" replace />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
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
