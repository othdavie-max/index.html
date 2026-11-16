// TEST TOOL, not part of the site. Serves a built site folder locally (node tests/serve.js <folder> 4173).
// Add ?mock=1 to a page address to load tests/mock.js first, which stands in for the Supabase server.
// A tiny static server for testing the built site folder locally. Usage: node serve.js <folder> <port>
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(process.argv[2]), port = Number(process.argv[3] || 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml", ".xlsx": "application/octet-stream", ".docx": "application/octet-stream" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  const type = types[path.extname(f)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  if (type.startsWith("text/html") && /[?&]mock=1/.test(req.url)) {
    // test only: put the stand-in server before everything else on the page
    const mock = fs.readFileSync(path.join(__dirname, "mock.js"), "utf8");
    return res.end(fs.readFileSync(f, "utf8").replace("<head>", "<head><script>" + mock + "</script>"));
  }
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log("serving " + root + " on " + port));
