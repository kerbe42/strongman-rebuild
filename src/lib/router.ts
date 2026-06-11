import { useEffect, useState } from "react";

export interface Route {
  tab: string; // today | plan | meals | exercises | progress | settings
  param?: string; // e.g. an ISO date for a plan day
}

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  const [tab, param] = clean.split("/");
  return { tab: tab || "today", ...(param ? { param } : {}) };
}

/** Minimal hash router so deep links, refresh, and the back button all work
 *  under a GitHub Pages base path. */
export function useRoute(): [Route, (tab: string, param?: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = (tab: string, param?: string) => {
    window.location.hash = `#/${tab}${param ? `/${param}` : ""}`;
  };
  return [parse(hash), navigate];
}
