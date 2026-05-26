import { useEffect, useRef, useState } from "react";

type GoogleButtonText = "signin_with" | "signup_with" | "continue_with";

interface GoogleSignInButtonProps {
  text: GoogleButtonText;
  disabled?: boolean;
  onCredential: (credential: string) => Promise<void>;
  onError: (message: string) => void;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      theme: "outline";
      size: "large";
      type: "standard";
      text: GoogleButtonText;
      shape: "rectangular";
      width: number;
    },
  ) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-identity-services");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-identity-services";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in failed to load."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function getGoogleClientId(): string {
  return ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "").trim();
}

export function GoogleSignInButton({
  text,
  disabled = false,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(false);
  const clientId = getGoogleClientId();

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    let renderedElement: HTMLDivElement | null = null;
    loadGoogleScript()
      .then(() => {
        const buttonElement = buttonRef.current;
        if (cancelled || !buttonElement || !window.google?.accounts?.id) return;

        renderedElement = buttonElement;
        buttonElement.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          use_fedcm_for_prompt: true,
          callback: (response) => {
            const credential = response.credential;
            if (!credential) {
              onErrorRef.current("Google did not return a sign-in credential.");
              return;
            }

            setLoading(true);
            onCredentialRef.current(credential)
              .catch((err) => {
                onErrorRef.current(err instanceof Error ? err.message : "Google sign-in failed.");
              })
              .finally(() => {
                if (!cancelled) setLoading(false);
              });
          },
        });
        window.google.accounts.id.renderButton(buttonElement, {
          theme: "outline",
          size: "large",
          type: "standard",
          text,
          shape: "rectangular",
          width: Math.min(buttonElement.clientWidth || 400, 400),
        });
      })
      .catch((err) => {
        if (!cancelled) {
          onErrorRef.current(err instanceof Error ? err.message : "Google sign-in failed to load.");
        }
      });

    return () => {
      cancelled = true;
      renderedElement?.replaceChildren();
      window.google?.accounts?.id?.cancel();
    };
  }, [clientId, text]);

  if (!clientId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Google sign-in needs VITE_GOOGLE_CLIENT_ID.
      </div>
    );
  }

  return (
    <div
      className={`min-h-[44px] w-full ${disabled || loading ? "pointer-events-none opacity-60" : ""}`}
      aria-busy={loading}
    >
      <div ref={buttonRef} className="w-full" />
    </div>
  );
}
