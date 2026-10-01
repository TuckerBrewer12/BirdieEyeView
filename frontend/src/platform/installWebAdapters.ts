import { configureApiBaseUrl } from "@/lib/apiBase";
import { configureSessionStorage } from "@/lib/sessionToken";

configureApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);

function browserLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

configureSessionStorage(browserLocalStorage());
