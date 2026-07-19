import { useEffect } from "react";

import { formatDocumentTitle } from "../config/navConfig";

/** Sync `document.title` for the active route or auth screen. */
export function useDocumentTitle(pageTitle: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = formatDocumentTitle(pageTitle);
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);
}
