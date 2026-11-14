import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { configureApiBaseUrl } from "./lib/apiBase";
import { configureSessionStorage } from "./lib/sessionToken";

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
}

const localStorage = memoryStorage();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorage });
Object.defineProperty(window, "localStorage", { configurable: true, value: localStorage });

configureApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
configureSessionStorage(localStorage);

afterEach(() => {
  localStorage.clear();
  cleanup();
});
