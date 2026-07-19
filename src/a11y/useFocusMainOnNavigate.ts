import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

/** Move focus to the main landmark after client-side navigation. */
export function useFocusMainOnNavigate() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const main = document.getElementById("portal-main");
    mainRef.current = main;
    if (main instanceof HTMLElement) {
      main.focus({ preventScroll: true });
    }
  }, [location.pathname, location.search]);

  return mainRef;
}
