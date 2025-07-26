const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const mime = require('mime');
const url = require('url');
const querystring = require('querystring');
const cookie = require('cookie');

const isWindows = os.platform() === 'win32';
// const ROOT_DIR = isWindows ? 'C:\\' : '/';
const customRoot = process.argv[5];
const defaultRoot = isWindows ? 'C:\\' : '/';
const ROOT_DIR = customRoot && fs.existsSync(customRoot)
  ? path.resolve(customRoot)
  : defaultRoot;
  console.log(ROOT_DIR)
const PORT = parseInt(process.argv[2]) || 9009;
const USERNAME = process.argv[3];
const PASSWORD = process.argv[4];

const isAuthEnabled = !!(USERNAME && PASSWORD);
const SESSION_COOKIE = 'lanConnectAuth'+PORT;

const HOST = getLocalIp();
let HOSTNAME = HOST;


function getLocalIp() {
  const interfaces = os.networkInterfaces(); 
  console.log(Object.keys(interfaces))
  let isWifi=Object.keys(interfaces).find(ele=>ele.toLowerCase().includes("wi-fi"))
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes("loopback") || name.toLowerCase().includes("virtual") || name.toLowerCase().includes("vmware") || name.toLowerCase().includes("vbox")) {
      continue; // skip virtual interfaces
    } 
    console.log(isWifi)
    if(isWifi && !name.toLowerCase().includes("wi-fi")){
      continue
    }
    console.log(name)
    for (const iface of interfaces[name]) {
      console.log(iface)
      if (
        iface.family === 'IPv4'
      ) {
        console.log(iface.address)
        return iface.address;
      }
    }
  }
   console.log('localhost')
  return 'localhost';
}


// function getLocalIp() {
//   const interfaces = os.networkInterfaces();
//   for (const name in interfaces) {
//     for (const iface of interfaces[name]) {
//       if (
//         iface.family === 'IPv4' &&
//         !iface.internal &&
//         !iface.address.startsWith('169.') &&
//         !name.toLowerCase().includes('virtual') &&
//         !name.toLowerCase().includes('vmware') &&
//         !name.toLowerCase().includes('vbox') &&
//         !name.toLowerCase().includes('loopback')
//       ) {
//         return iface.address;
//       }
//     }
//   }
//   return 'localhost';
// }

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function getEmojiIcon(name, isDir) {
  if (isDir) {
    if (name.toLowerCase().includes('recycle')) return '🗑️';
    if (name.toLowerCase().includes('user')) return '👥';
    if (name.toLowerCase()=='desktop') return '💻';
    if (name.toLowerCase().includes('drive')) return '🗃️';
    return '📁';
  }
  const ext = path.extname(name).toLowerCase();
  if ([".mp4", ".mkv", ".avi", ".mov"].includes(ext)) return "🎥";
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext)) return "📷";
  if ([".txt", ".md", ".log"].includes(ext)) return "📝";
  if ([".pdf", ".docx", ".pptx", ".xlsx"].includes(ext)) return "🖺";
  if ([".mp3", ".wav", ".ogg"].includes(ext)) return "🎶";
  if ([".iso"].includes(ext)) return "💿";
  if ([".json", ".zip", ".tar", ".rar"].includes(ext)) return "📦";
  if (name === ".gitignore") return "🔧";
  if (name.startsWith('.')) return '🔒️';
  return "📄";
}

function renderDirectory(res, filePath, requestUrl, query) { 
  fs.readdir(filePath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      res.writeHead(500);
      return res.end("Internal Server Error");
    }

    const filteredEntries = query
      ? entries.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
      : entries;

    const rows = filteredEntries.map(entry => { 
      const fullPath = path.join(filePath, entry.name);
      let stats
      try {
        stats = fs.statSync(fullPath);
      } catch (e) {
        return '';
      }

      const isDir = entry.isDirectory();
      const icon = getEmojiIcon(entry.name, isDir);
      const name = escapeHtml(entry.name);
      const encodedName = encodeURIComponent(entry.name);
      const href = `http://${HOSTNAME}:${PORT}${requestUrl}${encodedName}${isDir ? '/' : ''}${query ?`q=${encodeURIComponent(query)} `: ''}`;
      const size = isDir ? '--' :` ${stats.size.toLocaleString()} B`;
      const type = isDir ? 'Folder' : path.extname(entry.name).substring(1).toUpperCase() || 'File';
      const createdAt = new Date(stats.birthtime || stats.ctime).toLocaleString();

      return  `<tr>
          <td><a href="${href}">${icon} ${name}</a></td>
          <td>${type}</td>
          <td>${size}</td>
          <td>${createdAt}</td>
        </tr>
    `
    }).join("")

    const searchInput = `<form method="get" style="margin: 1em 0;">
      <input name="q" placeholder="🔍️ Search..." value="${escapeHtml(query || '')}" style="padding: 0.5em; width: 50%;">
      <button type="submit">Search</button>
    </form>`;

    const goUpLink = requestUrl !== '/'
      ? `<tr>
            <td><a href="http://${HOSTNAME}:${PORT}${path.dirname(requestUrl)}${query?`q=${encodeURIComponent(query)}` : ''}">⏪️ Go Up</a></td>
            <td>Folder</td><td>--</td><td>--</td>
         </tr>`
      : '';
      console.log(query?true:false)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Index of ${requestUrl}</title>
        <style>
          body { font-family: sans-serif; background: #f8f9fa; color: #212529; padding: 1rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 1em; }
          th, td { padding: 0.75em; border-bottom: 1px solid #dee2e6; text-align: left; font-size: 15px; }
          th { background-color: #e9ecef; }
          a { text-decoration: none; color: #007bff; }
          a:hover { text-decoration: underline; }
          h2 { margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <h2>📁 Index of ${escapeHtml(requestUrl)}</h2>
        ${searchInput}
        ${query && `<p>🔎 Showing results for: <strong>${escapeHtml(query)}</strong></p>`}
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Size</th><th>Created At</th></tr>
          </thead>
          <tbody>
            ${goUpLink}
            ${rows}
          </tbody>
        </table>
      </body>
      </html>`
    ;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
}

function streamVideo(req, res, filePath) {
  
  // if (!range) {
  //   res.writeHead(416);
  //   return res.end("Range header required");
  // }
const range = req.headers.range || "bytes=0-";
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const [startStr=1, endStr] = range?.replace(/bytes=/, "")?.split("-");
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : total - 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${total}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': mime.getType(filePath)
  });

  fs.createReadStream(filePath, { start, end }).pipe(res);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const requestUrl = parsedUrl.pathname;
  const query = parsedUrl.query.q || "";

  const cookies = cookie.parse(req.headers.cookie || '');

  if (isAuthEnabled && cookies[SESSION_COOKIE] !== PORT.toString()) {
    if (req.method === 'POST' && requestUrl === '/login') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const { username, password } = querystring.parse(body);
        if (username === USERNAME && password === PASSWORD) {
          res.writeHead(302, {
            'Set-Cookie': `${SESSION_COOKIE}=${PORT}; Path=/; HttpOnly`,
            'Location': '/'
          });
          res.end();
        } else {
          res.writeHead(401);
          res.end('<h1>Invalid credentials</h1>');
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><head><title>Login</title><style>
      body { font-family: sans-serif; background: #f9f9f9; padding: 2em; }
      form { background: white; padding: 2em; max-width: 400px; margin: auto; border-radius: 8px; }
      input, button { width: 100%; padding: 0.7em; margin-bottom: 1em; }
      .error { color: red; }
    </style></head>
    <body>
          <form method="POST" action="/login" style="margin-top:100px; text-align:center">
            <h2>🔐 lanConnect Login</h2>
            <input name="username" placeholder="Username" required /><br/><br/>
            <input type="password" name="password" placeholder="Password" required /><br/><br/>
            <button type="submit">Login</button>
          </form>
        </body>
        </html>
      `);
    }
    return;
  }

  // existing file serving logic...


  const decodedPath = decodeURIComponent(requestUrl);
  const safePath = path.normalize(path.join(ROOT_DIR, decodedPath));

  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    return res.end("Access denied");
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      res.writeHead(404);
      return res.end("File not found");
    }

    if (stats.isDirectory()) {
      renderDirectory(res, safePath, requestUrl, query);
    } else {
      const ext = path.extname(safePath);
      if ([".mp4", ".mkv", ".webm", ".mov"].includes(ext)) {
        return streamVideo(req, res, safePath);
      }

      const type = mime.getType(ext) || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      fs.createReadStream(safePath).pipe(res);
    }
  });
});

server.listen(PORT,'10.195.168.188', () => {
  HOSTNAME = getLocalIp();
  console.log(`✅ Server started: http://localhost:${PORT}/`);
  console.log(`🌐 LAN access:    http://${HOSTNAME}:${PORT}/`);
});

