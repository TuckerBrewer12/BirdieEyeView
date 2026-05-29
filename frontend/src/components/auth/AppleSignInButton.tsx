import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AppleSignIn, ErrorCode, SignInScope } from "@capawesome/capacitor-apple-sign-in";
import { Apple } from "lucide-react";

interface AppleSignInButtonProps {
  disabled?: boolean;
  onCredential: (identityToken: string, name?: string) => Promise<void>;
  onError: (message: string) => void;
}

interface AppleAuthResponse {
  authorization?: {
    id_token?: string;
    state?: string;
  };
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface AppleAuth {
  init: (config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    state: string;
    usePopup: boolean;
  }) => void;
  signIn: () => Promise<AppleAuthResponse>;
}

declare global {
  interface Window {
    AppleID?: {
      auth?: AppleAuth;
    };
  }
}

let appleScriptPromise: Promise<void> | null = null;
let nativeAppleClientId: string | null = null;
let nativeAppleInitializePromise: Promise<void> | null = null;

function loadAppleScript(): Promise<void> {
  if (window.AppleID?.auth) return Promise.resolve();
  if (appleScriptPromise) return appleScriptPromise;

  appleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("appleid-auth-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Apple sign-in failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "appleid-auth-js";
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Apple sign-in failed to load."));
    document.head.appendChild(script);
  });

  return appleScriptPromise;
}

function getAppleClientId(): string {
  return ((import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined) ?? "").trim();
}

function getAppleRedirectUri(): string {
  const configured = ((import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined) ?? "").trim();
  return configured || window.location.origin;
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function initializeNativeApple(clientId: string): Promise<void> {
  if (Capacitor.getPlatform() === "ios") return;
  if (nativeAppleInitializePromise && nativeAppleClientId === clientId) {
    return nativeAppleInitializePromise;
  }

  nativeAppleClientId = clientId;
  nativeAppleInitializePromise = AppleSignIn.initialize({ clientId });
  return nativeAppleInitializePromise;
}

function getNativeErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object" || !("code" in err)) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function formatAppleName(response: AppleAuthResponse): string | undefined {
  const firstName = response.user?.name?.firstName?.trim() ?? "";
  const lastName = response.user?.name?.lastName?.trim() ?? "";
  return `${firstName} ${lastName}`.trim() || undefined;
}

function formatNativeAppleName(result: { givenName: string | null; familyName: string | null }): string | undefined {
  const firstName = result.givenName?.trim() ?? "";
  const lastName = result.familyName?.trim() ?? "";
  return `${firstName} ${lastName}`.trim() || undefined;
}

export function AppleSignInButton({
  disabled = false,
  onCredential,
  onError,
}: AppleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const stateRef = useRef<string>("");
  const clientId = getAppleClientId();
  const isNative = Capacitor.isNativePlatform();

  if (!clientId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Apple sign-in needs VITE_APPLE_CLIENT_ID.
      </div>
    );
  }

  const handleNativeSignIn = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      const state = randomState();
      await initializeNativeApple(clientId);
      const result = await AppleSignIn.signIn({
        redirectUrl: getAppleRedirectUri(),
        scopes: [SignInScope.Email, SignInScope.FullName],
        state,
      });
      if (result.state && result.state !== state) {
        onError("Apple sign-in state did not match.");
        return;
      }
      if (!result.idToken) {
        onError("Apple did not return a sign-in credential.");
        return;
      }
      await onCredential(result.idToken, formatNativeAppleName(result));
    } catch (err) {
      if (getNativeErrorCode(err) === ErrorCode.SignInCanceled) return;
      onError(err instanceof Error ? err.message : "Apple sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleWebSignIn = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      await loadAppleScript();
      if (!window.AppleID?.auth) {
        onError("Apple sign-in failed to load.");
        return;
      }

      const state = randomState();
      stateRef.current = state;
      window.AppleID.auth.init({
        clientId,
        scope: "name email",
        redirectURI: getAppleRedirectUri(),
        state,
        usePopup: true,
      });

      const result = await window.AppleID.auth.signIn();
      if (result.authorization?.state !== stateRef.current) {
        onError("Apple sign-in state did not match.");
        return;
      }

      const identityToken = result.authorization?.id_token;
      if (!identityToken) {
        onError("Apple did not return a sign-in credential.");
        return;
      }

      await onCredential(identityToken, formatAppleName(result));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Apple sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={isNative ? handleNativeSignIn : handleWebSignIn}
      disabled={disabled || loading}
      className="inline-flex min-h-[44px] w-full items-center justify-center gap-3 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-900 disabled:pointer-events-none disabled:opacity-60"
    >
      <Apple size={18} aria-hidden="true" />
      {loading ? "Connecting..." : "Sign in with Apple"}
    </button>
  );
}
