#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const readline=require('readline') 
let SERVER_PATH=path.join(__dirname, 'server.js');
const startCloudflareTunnel=require("./startCloudFare")
 const qrcode = require('qrcode-terminal');

const PROCESS_TRACK_FILE = path.join(os.tmpdir(), '.lanConnect-processes.json');
const VERSION = '1.0.0';


function getQRLines(text) {
  let output = '';
  qrcode.generate(text, { small: true }, qr => {
    output = qr;
  });
  return output.trim().split('\n');
}

function printTwoColumn(leftTitle, rightTitle, leftQR, rightQR, leftURL, rightURL) {
  const colWidth = 45;

  // Titles
  console.log(
    leftTitle.padEnd(colWidth) +
    rightTitle
  );
  console.log('');

  // QR codes (side by side)
  const maxLines = Math.max(leftQR.length, rightQR.length);
  for (let i = 0; i < maxLines; i++) {
    const left = leftQR[i] || '';
    const right = rightQR[i] || '';
    console.log(
      left.padEnd(colWidth) +
      right
    );
  }

  console.log('');
  console.log(
    leftURL.padEnd(colWidth) +
    rightURL
  );
}


let PROCESS_TRACKING=[]

function readProcesses() {
  if (!fs.existsSync(PROCESS_TRACK_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PROCESS_TRACK_FILE));
  } catch {
    return [];
  }
}

function writeProcesses(data) {
  fs.writeFileSync(PROCESS_TRACK_FILE, JSON.stringify(data, null, 2));
}

function getLocalIp() {
  const interfaces = os.networkInterfaces(); 
  let isWifi=Object.keys(interfaces).find(ele=>ele.toLowerCase().includes("wi-fi"))
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes("loopback") || name.toLowerCase().includes("virtual") || name.toLowerCase().includes("vmware") || name.toLowerCase().includes("vbox")) {
      continue; // skip virtual interfaces
    }  
    if(isWifi && !name.toLowerCase().includes("wi-fi")){
      continue
    } 
    for (const iface of interfaces[name]) { 
      if (
        iface.family === 'IPv4' && iface.address && !iface.address.startsWith('169.') 
      ) { 
        return iface.address;
      }
    }
  } 
  return 'localhost';
}

function isPortInUse(port) {
  try {
    if (os.platform() === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`).toString();
      return output.includes(`:${port}`);
    } else {
      const output = execSync(`lsof -i :${port}`).toString();
      return output.includes(`:${port}`);
    }
  } catch {
    return false;
  }
}

function getAvailablePort(basePort = 3000) {
  let port = basePort;
  while (isPortInUse(port)) {
    port++;
  }
  return port;
}


function promptInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function promptRootPath() {
  while (true) {
    const input = await promptInput('Enter path (leave empty for default): ');
    const isWindows = os.platform() === 'win32'; 
    const customRoot = input;
    const defaultRoot = isWindows ? 'C:\\' : '/';
    const ROOT_DIR = customRoot && fs.existsSync(customRoot)
      ? path.resolve(customRoot)
      : defaultRoot;
    if (!input) return ROOT_DIR;
    if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
      return path.resolve(input);
    }
    console.log('❌ Invalid path. Please try again.\n');
  }
}



(async () => {
  const [,, cmd, arg1, arg2] = process.argv;

  switch (cmd) {
    case '--version':
      console.log(`lanConnect v${VERSION}`);
      break;

case 'start': {
  const port = await getAvailablePort(9009);
  const hostname = getLocalIp();
  const username = arg1 || '';
  const password = arg2 || '';

  if (username.length && !password.length) {
    console.log(`Password is Empty`);
    break;
  }

  const rootPath = await promptRootPath(); // Prompt user

  const serverArgs = [SERVER_PATH, port];
  if (username && password) serverArgs.push(username, password);
  if (rootPath) {
    if(serverArgs.length==4){
    serverArgs.push(rootPath)
    }else{
      serverArgs.push("")
      serverArgs.push("")
      serverArgs.push(rootPath)
    }
  }



function getCloudflaredPath() {
  if (process.pkg) {
    // pkg extracts assets near executable
    return path.join(
      path.dirname(process.execPath),
      "cloudflared"
    );
  }

  // dev mode
  return path.join(
    __dirname,
    "resources",
    "cloudflared"
  );
}

 try {

 const tunnel = await startCloudflareTunnel(
    getCloudflaredPath(),
    `http://${hostname}:${port}`
  );

  const lanURL = `http://${hostname}:${port}`;
  const tunnelURL = tunnel?.url;

  const lanQR = getQRLines(lanURL);
  const tunnelQR = getQRLines(tunnelURL); 
  printTwoColumn(
    '📡 LAN Access',
    '🌍 Tunnel Internet Access',
    lanQR,
    tunnelQR,
    lanURL,
    tunnelURL
  );
  


  const child = spawn('node', serverArgs, {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', data => {
  const text = data.toString();

  // Detect QR lines (block characters)
  if (text.includes('██') || text.includes('▄▄') || text.includes('▀')) {
    process.stdout.write(text); // ✅ raw
  } else {
    process.stdout.write(`[SERVER] ${text}`);
  }
});

child.stderr.on('data', data => {
  process.stderr.write(`[SERVER ERROR] ${data}`);
});

child.unref();

  const record = {
    pid: child.pid,
    port,
    tunnelId:tunnel?.pid,
    url: `http://${hostname}:${port}`,
    tunnelURL,
    username,
    password,
    root: rootPath || ''
  };
  const list = readProcesses();
  list.push(record);
  writeProcesses(list);

  console.log(`✅ Started on port ${port} - ${record.url}`);
   } catch (err) {
    console.error("❌ Tunnel failed:", err);
  }
  break;
}


    case 'list': {
      const list = readProcesses();
      if (list.length === 0) return console.log('No running servers.');
      console.table(list);
      break;
    }

    case 'kill': {
      const portToKill = parseInt(arg1);
      if (!portToKill) return console.error('Please provide a port.');
      const list = readProcesses();
      let idx = list.findIndex(p => p.port === portToKill);
      if (idx === -1) idx = list.findIndex(p => p.pid === portToKill);
      if (idx === -1 && portToKill < list.length) idx = portToKill;
      if (idx === -1) return console.error(`No process found on port ${portToKill}`);
      const pid = list[idx].pid;
      const pids = list[idx].tunnelId;
      try {
        if(pids){
          process.kill(pids)
        }
        process.kill(pid);
        list.splice(idx, 1);
        writeProcesses(list);
        console.log(`❌ Killed process on port ${portToKill}`);
      } catch (e) {
        console.error(`⚠️ Failed to kill PID ${pid}:`, e.message);
      }
      break;
    }

    default:
      console.log(`
Usage:
  lanConnect --version              Show version
  lanConnect start                 Start server (no login)
  lanConnect start <user> <pass>  Start with login
  lanConnect list                 List running servers
  lanConnect kill <port>          Kill server on that port
      `.trim());
  }
})();
