import { useCallback, useEffect, useState } from "react";

export type AppPath = "/" | "/termos" | "/privacidade";

function basePrefix(): string {
  const b = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return b || "";
}

function normalizePathname(): AppPath {
  let p = window.location.pathname;
  const base = basePrefix();
  if (base && (p === base || p.startsWith(`${base}/`))) {
    p = p.slice(base.length) || "/";
  }
  p = p.replace(/\/+$/, "") || "/";
  if (p === "/termos") return "/termos";
  if (p === "/privacidade") return "/privacidade";
  return "/";
}

export function useAppPath(): { path: AppPath; navigate: (to: AppPath) => void } {
  const [path, setPath] = useState<AppPath>(normalizePathname);

  useEffect(() => {
    const sync = () => setPath(normalizePathname());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = useCallback((to: AppPath) => {
    const base = basePrefix();
    const href = to === "/" ? (base ? `${base}/` : "/") : `${base}${to}`;
    window.history.pushState({}, "", href);
    setPath(normalizePathname());
  }, []);

  return { path, navigate };
}
