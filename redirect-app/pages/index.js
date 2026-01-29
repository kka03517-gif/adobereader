import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Preserve full query string
    const query = window.location.search || "";

    // Preserve hash if present
    const hash = window.location.hash || "";

    // Forward everything to the API
    window.location.replace(`/api/redirect${query}${hash}`);
  }, []);

  return null;
}
