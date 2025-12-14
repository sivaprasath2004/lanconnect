const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const mime = require('mime');
const url = require('url');
const querystring = require('querystring');
const cookie = require('cookie');
const { pipeline } = require('stream');
const { promisify } = require('util');
const qrcode = require('qrcode-terminal');
const pump = promisify(pipeline);
const startCloudflareTunnel=require("./startCloudFare")
const isWindows = os.platform() === 'win32';
// const ROOT_DIR = isWindows ? 'C:\\' : '/';
const customRoot = process.argv[5];
const defaultRoot = isWindows ? 'C:\\' : '/';
const ROOT_DIR = customRoot && fs.existsSync(customRoot)
  ? path.resolve(customRoot)
  : defaultRoot; 
const PORT = parseInt(process.argv[2]) || 9012;
const USERNAME = process.argv[3];
const PASSWORD = process.argv[4];

const isAuthEnabled = !!(USERNAME && PASSWORD);
const SESSION_COOKIE = 'lanConnectAuth'+PORT;

const HOST = getLocalIp();
let HOSTNAME = HOST;


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
    if (name.toLowerCase().includes('recycle')) return `<svg xmlns="http://www.w3.org/2000/svg"
     width="30"
     height="30"
     viewBox="0 0 24 24"
     aria-hidden="true">
  <path d="M21.5,4h-3.551c-.252-2.244-2.139-4-4.449-4h-3c-2.31,0-4.197,1.756-4.449,4H2.5c-.276,0-.5,.224-.5,.5s.224,.5,.5,.5h1.5v14.5c0,2.481,2.019,4.5,4.5,4.5h7c2.481,0,4.5-2.019,4.5-4.5V5h1.5c.276,0,.5-.224,.5-.5s-.224-.5-.5-.5ZM10.5,1h3c1.758,0,3.204,1.308,3.449,3H7.051c.245-1.692,1.691-3,3.449-3Zm8.5,18.5c0,1.93-1.57,3.5-3.5,3.5h-7c-1.93,0-3.5-1.57-3.5-3.5V5h14v14.5ZM10,10.5v7c0,.276-.224,.5-.5,.5s-.5-.224-.5-.5v-7c0-.276,.224-.5,.5-.5s.5,.224,.5,.5Zm5,0v7c0,.276-.224,.5-.5,.5s-.5-.224-.5-.5v-7c0-.276,.224-.5,.5-.5s.5,.224,.5,.5Z"/>
</svg>
`;
    if (name.toLowerCase().includes('user')) return `<svg xmlns="http://www.w3.org/2000/svg"
     width="30"
     height="30"
     viewBox="0 0 24 24"
     aria-hidden="true">
  <path d="M12.003,11.774c3.5-.021,5.307-1.83,5.372-5.396-.06-3.446-1.967-5.356-5.378-5.378-3.452,.021-5.372,2.066-5.372,5.378,0,3.462,1.921,5.375,5.378,5.396Zm-.006-9.774c2.855,.019,4.328,1.498,4.378,4.378-.055,2.982-1.446,4.379-4.372,4.396-2.93-.017-4.321-1.411-4.378-4.387,.055-2.934,1.487-4.369,4.372-4.387Z"/>
  <path d="M11.997,14.294c-5.259,.033-8.089,2.867-8.185,8.197-.005,.276,.215,.504,.491,.509h.009c.272,0,.495-.218,.5-.491,.086-4.825,2.438-7.186,7.184-7.215,4.689,.03,7.109,2.458,7.191,7.215,.005,.276,.255,.505,.509,.491,.276-.005,.496-.232,.491-.509-.091-5.252-2.997-8.164-8.19-8.197Z"/>
</svg>
`;
    if (name.toLowerCase()=='desktop') return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30">
  <path d="M24,19V3.5c0-1.378-1.121-2.5-2.5-2.5H2.5C1.121,1,0,2.122,0,3.5v15.5H11.5v3H6v1h12v-1h-5.5v-3h11.5ZM2.5,2H21.5c.827,0,1.5,.673,1.5,1.5V14H1V3.5c0-.827,.673-1.5,1.5-1.5ZM1,15H23v3H1v-3Z"/>
</svg>`;
    if (name.toLowerCase()=='music') return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30">
  <path d="m15.5,11h-1c-1.379,0-2.5,1.121-2.5,2.5v2.012c-.419-.317-.935-.512-1.5-.512-1.379,0-2.5,1.121-2.5,2.5s1.121,2.5,2.5,2.5,2.5-1.121,2.5-2.5v-4c0-.827.673-1.5,1.5-1.5h1c.276,0,.5-.224.5-.5s-.224-.5-.5-.5Zm-5,8c-.827,0-1.5-.673-1.5-1.5s.673-1.5,1.5-1.5,1.5.673,1.5,1.5-.673,1.5-1.5,1.5Zm9.596-13.611l-3.484-3.484c-1.228-1.228-2.86-1.904-4.597-1.904h-5.515C4.019,0,2,2.019,2,4.5v15c0,2.481,2.019,4.5,4.5,4.5h11c2.481,0,4.5-2.019,4.5-4.5v-9.515c0-1.736-.677-3.369-1.904-4.597Zm-.707.707c.55.55.959,1.2,1.232,1.904h-5.121c-.827,0-1.5-.673-1.5-1.5V1.379c.704.273,1.354.682,1.904,1.232l3.484,3.484Zm1.611,13.404c0,1.93-1.57,3.5-3.5,3.5H6.5c-1.93,0-3.5-1.57-3.5-3.5V4.5c0-1.93,1.57-3.5,3.5-3.5h5.515c.335,0,.663.038.985.096v5.404c0,1.379,1.121,2.5,2.5,2.5h5.404c.058.323.096.651.096.985v9.515Z"/>
</svg>`;
    if (name.toLowerCase()=='videos') return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30"><path d="M14.707,0H4.5c-1.378,0-2.5,1.122-2.5,2.5V24H22V7.293L14.707,0Zm.293,1.707l5.293,5.293h-5.293V1.707ZM3,23V2.5c0-.827,.673-1.5,1.5-1.5H14v7h7v15H3ZM15,12H6v8H15v-1.75l3,2.25V11.5l-3,2.25v-1.75Zm-1,7H7v-6h7v6Zm3-5.5v5l-2-1.5v-2l2-1.5Z"/></svg>`;
    if (name.toLowerCase()=='pictures') return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30"><path d="m6,10c0-.552.448-1,1-1s1,.448,1,1-.448,1-1,1-1-.448-1-1Zm16-.015v9.515c0,2.485-2.015,4.5-4.5,4.5H6.5c-2.485,0-4.5-2.015-4.5-4.5V4.5C2,2.015,4.015,0,6.5,0h5.515c1.724,0,3.377.685,4.596,1.904l3.485,3.485c1.219,1.219,1.904,2.872,1.904,4.596Zm-6.096-7.375c-.551-.551-1.198-.97-1.904-1.243v5.132c0,.827.673,1.5,1.5,1.5h5.132c-.273-.706-.692-1.353-1.243-1.904l-3.485-3.485ZM3,19.5c0,.524.116,1.022.324,1.469l6.092-6.092c1.149-1.149,3.02-1.149,4.169,0l.615.615c.717.717,1.884.717,2.601,0l4.2-4.2v-1.308c0-.334-.03-.663-.088-.985h-5.412c-1.378,0-2.5-1.122-2.5-2.5V1.088c-.322-.058-.651-.088-.985-.088h-5.515c-1.93,0-3.5,1.57-3.5,3.5v15Zm18,0v-6.793l-3.493,3.493c-1.106,1.107-2.908,1.107-4.015,0l-.615-.615c-.76-.76-1.995-.76-2.755,0l-6.238,6.238c.642.722,1.576,1.177,2.616,1.177h11c1.93,0,3.5-1.57,3.5-3.5Z"/></svg>`;
    if (name.toLowerCase().includes('drive')) return `<svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" width="30" height="30">  <path d="M19.5,3h-7.028c-.231,0-.463-.055-.67-.158l-3.156-1.578c-.345-.172-.731-.264-1.117-.264h-3.028C2.019,1,0,3.019,0,5.5v13c0,2.481,2.019,4.5,4.5,4.5h15c2.481,0,4.5-2.019,4.5-4.5V7.5c0-2.481-2.019-4.5-4.5-4.5ZM4.5,2h3.028c.231,0,.463,.055,.67,.158l3.156,1.578c.345,.172,.731,.264,1.117,.264h7.028c1.758,0,3.204,1.308,3.449,3H1v-1.5c0-1.93,1.57-3.5,3.5-3.5Zm15,20H4.5c-1.93,0-3.5-1.57-3.5-3.5V8H23v10.5c0,1.93-1.57,3.5-3.5,3.5Z"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" width="30" height="30">  <path d="M19.5,3h-7.028c-.231,0-.463-.055-.67-.158l-3.156-1.578c-.345-.172-.731-.264-1.117-.264h-3.028C2.019,1,0,3.019,0,5.5v13c0,2.481,2.019,4.5,4.5,4.5h15c2.481,0,4.5-2.019,4.5-4.5V7.5c0-2.481-2.019-4.5-4.5-4.5ZM4.5,2h3.028c.231,0,.463,.055,.67,.158l3.156,1.578c.345,.172,.731,.264,1.117,.264h7.028c1.758,0,3.204,1.308,3.449,3H1v-1.5c0-1.93,1.57-3.5,3.5-3.5Zm15,20H4.5c-1.93,0-3.5-1.57-3.5-3.5V8H23v10.5c0,1.93-1.57,3.5-3.5,3.5Z"/></svg>`;
  }
  const ext = path.extname(name).toLowerCase();
  if ([".mp4", ".mkv", ".avi", ".mov"].includes(ext)) return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30"><path d="M14.707,0H4.5c-1.378,0-2.5,1.122-2.5,2.5V24H22V7.293L14.707,0Zm.293,1.707l5.293,5.293h-5.293V1.707ZM3,23V2.5c0-.827,.673-1.5,1.5-1.5H14v7h7v15H3ZM15,12H6v8H15v-1.75l3,2.25V11.5l-3,2.25v-1.75Zm-1,7H7v-6h7v6Zm3-5.5v5l-2-1.5v-2l2-1.5Z"/></svg>`;
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext)) return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30"><path d="m6,10c0-.552.448-1,1-1s1,.448,1,1-.448,1-1,1-1-.448-1-1Zm16-.015v9.515c0,2.485-2.015,4.5-4.5,4.5H6.5c-2.485,0-4.5-2.015-4.5-4.5V4.5C2,2.015,4.015,0,6.5,0h5.515c1.724,0,3.377.685,4.596,1.904l3.485,3.485c1.219,1.219,1.904,2.872,1.904,4.596Zm-6.096-7.375c-.551-.551-1.198-.97-1.904-1.243v5.132c0,.827.673,1.5,1.5,1.5h5.132c-.273-.706-.692-1.353-1.243-1.904l-3.485-3.485ZM3,19.5c0,.524.116,1.022.324,1.469l6.092-6.092c1.149-1.149,3.02-1.149,4.169,0l.615.615c.717.717,1.884.717,2.601,0l4.2-4.2v-1.308c0-.334-.03-.663-.088-.985h-5.412c-1.378,0-2.5-1.122-2.5-2.5V1.088c-.322-.058-.651-.088-.985-.088h-5.515c-1.93,0-3.5,1.57-3.5,3.5v15Zm18,0v-6.793l-3.493,3.493c-1.106,1.107-2.908,1.107-4.015,0l-.615-.615c-.76-.76-1.995-.76-2.755,0l-6.238,6.238c.642.722,1.576,1.177,2.616,1.177h11c1.93,0,3.5-1.57,3.5-3.5Z"/></svg>`;
  if ([".txt", ".md", ".log"].includes(ext)) return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30"><path d="M17.564,15.015c.581,.581,.581,1.524,0,2.105l-3.256,3.256-.707-.707,3.256-3.256c.19-.19,.19-.5,0-.691l-3.323-3.323,.707-.707,3.323,3.323Zm-7.098-2.616l-.707-.707-3.323,3.323c-.581,.581-.581,1.524,0,2.105l3.256,3.256,.707-.707-3.256-3.256c-.19-.19-.19-.5,0-.691l3.323-3.323Zm11.534-5.106V24H2V2.5C2,1.122,3.122,0,4.5,0H14.707l7.293,7.293Zm-7-.293h5.293L15,1.707V7Zm6,16V8h-7V1H4.5c-.827,0-1.5,.673-1.5,1.5V23H21Z"/></svg>`;
  if ([".pdf", ".docx", ".pptx", ".xlsx"].includes(ext)) return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30">
  <path d="M14.707,0H4.5c-1.378,0-2.5,1.122-2.5,2.5V24H22V7.293L14.707,0Zm.293,1.707l5.293,5.293h-5.293V1.707ZM3,23V2.5c0-.827,.673-1.5,1.5-1.5H14v7h7v15H3Z"/>
</svg>`;
  if ([".mp3", ".wav", ".ogg"].includes(ext)) return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30">
  <path d="m15.5,11h-1c-1.379,0-2.5,1.121-2.5,2.5v2.012c-.419-.317-.935-.512-1.5-.512-1.379,0-2.5,1.121-2.5,2.5s1.121,2.5,2.5,2.5,2.5-1.121,2.5-2.5v-4c0-.827.673-1.5,1.5-1.5h1c.276,0,.5-.224.5-.5s-.224-.5-.5-.5Zm-5,8c-.827,0-1.5-.673-1.5-1.5s.673-1.5,1.5-1.5,1.5.673,1.5,1.5-.673,1.5-1.5,1.5Zm9.596-13.611l-3.484-3.484c-1.228-1.228-2.86-1.904-4.597-1.904h-5.515C4.019,0,2,2.019,2,4.5v15c0,2.481,2.019,4.5,4.5,4.5h11c2.481,0,4.5-2.019,4.5-4.5v-9.515c0-1.736-.677-3.369-1.904-4.597Zm-.707.707c.55.55.959,1.2,1.232,1.904h-5.121c-.827,0-1.5-.673-1.5-1.5V1.379c.704.273,1.354.682,1.904,1.232l3.484,3.484Zm1.611,13.404c0,1.93-1.57,3.5-3.5,3.5H6.5c-1.93,0-3.5-1.57-3.5-3.5V4.5c0-1.93,1.57-3.5,3.5-3.5h5.515c.335,0,.663.038.985.096v5.404c0,1.379,1.121,2.5,2.5,2.5h5.404c.058.323.096.651.096.985v9.515Z"/>
</svg>`;
  if ([".iso"].includes(ext)) return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30">
  <path d="M14.707,0H4.5c-1.378,0-2.5,1.122-2.5,2.5V24H22V7.293L14.707,0Zm.293,1.707l5.293,5.293h-5.293V1.707ZM3,23V2.5c0-.827,.673-1.5,1.5-1.5H14v7h7v15H3Z"/>
</svg>`;
  if ([".json", ".zip", ".tar", ".rar"].includes(ext)) return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30"><path d="M17.564,15.015c.581,.581,.581,1.524,0,2.105l-3.256,3.256-.707-.707,3.256-3.256c.19-.19,.19-.5,0-.691l-3.323-3.323,.707-.707,3.323,3.323Zm-7.098-2.616l-.707-.707-3.323,3.323c-.581,.581-.581,1.524,0,2.105l3.256,3.256,.707-.707-3.256-3.256c-.19-.19-.19-.5,0-.691l3.323-3.323Zm11.534-5.106V24H2V2.5C2,1.122,3.122,0,4.5,0H14.707l7.293,7.293Zm-7-.293h5.293L15,1.707V7Zm6,16V8h-7V1H4.5c-.827,0-1.5,.673-1.5,1.5V23H21Z"/></svg>`;
  if (name === ".gitignore") return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30"><path d="M17.564,15.015c.581,.581,.581,1.524,0,2.105l-3.256,3.256-.707-.707,3.256-3.256c.19-.19,.19-.5,0-.691l-3.323-3.323,.707-.707,3.323,3.323Zm-7.098-2.616l-.707-.707-3.323,3.323c-.581,.581-.581,1.524,0,2.105l3.256,3.256,.707-.707-3.256-3.256c-.19-.19-.19-.5,0-.691l3.323-3.323Zm11.534-5.106V24H2V2.5C2,1.122,3.122,0,4.5,0H14.707l7.293,7.293Zm-7-.293h5.293L15,1.707V7Zm6,16V8h-7V1H4.5c-.827,0-1.5,.673-1.5,1.5V23H21Z"/></svg>`;
  if (name.startsWith('.')) return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30">
  <path d="M14.707,0H4.5c-1.378,0-2.5,1.122-2.5,2.5V24H22V7.293L14.707,0Zm.293,1.707l5.293,5.293h-5.293V1.707ZM3,23V2.5c0-.827,.673-1.5,1.5-1.5H14v7h7v15H3Z"/>
</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24" width="30" height="30">
  <path d="M14.707,0H4.5c-1.378,0-2.5,1.122-2.5,2.5V24H22V7.293L14.707,0Zm.293,1.707l5.293,5.293h-5.293V1.707ZM3,23V2.5c0-.827,.673-1.5,1.5-1.5H14v7h7v15H3Z"/>
</svg>`;
}

function renderDirectory(res, filePath, requestUrl, query) { 
  fs.readdir(filePath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      res.writeHead(500);
      return res.end("Cannot Access Files");
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
      const href = `${requestUrl.endsWith("/")?requestUrl:requestUrl+"/"}${encodedName}${query ?`/?q=${encodeURIComponent(query)} `: ''}`;
      const size = isDir ? '' :` ${stats.size.toLocaleString()} B`;
      const type = isDir ? 'Folder' : path.extname(entry.name).substring(1).toUpperCase() || 'File';
      const createdAt = new Date(stats.birthtime || stats.ctime).toLocaleString();

      return  `<div class="container-items">
       <a href="${href}" ${isDir?"":"download"}>
            ${icon}
        </a>
        <a href="${href}" class="flex-column" ${isDir?"":"download"}>
             <h4>${name}</h4> 
            ${size.length?`<p style="font-size: 11px;">${size}</p>`:""}
        </a>  
        </div>
    `
    }).join("")
//  <td><a href="${href}">${icon} ${name}</a></td>
//           <td class="hide-mobile">${type}</td>
//           <td class="hide-mobile">${size}</td>
//           <td class="hide-mobile">${createdAt}</td>
    const searchInput = `<form method="get" style="margin: 1em 0;">
      <input name="q" placeholder="🔍️ Search..." value="${escapeHtml(query || '')}" style="padding: 0.5em; width: 50%;">
      <button type="submit">Search</button>
    </form>`;

    const goUpLink = requestUrl !== '/'
      ? `<tr>
            <td><a href="http://${HOSTNAME}:${PORT}${path.dirname(requestUrl)}${query?`/?q=${encodeURIComponent(query)}` : ''}">⏪️ Go Up</a></td>
            <td class="hide-mobile"> </td><td class="hide-mobile">--</td><td class="hide-mobile">--</td>
         </tr>`
      : '';
      

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Loacal Beam</title> 
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
 
    <style>
       *{
             margin: 0;
             font-weight:400;
        }
        :root{
      font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;

        }
      .switch {
  font-size: 17px;
  position: relative;
  display: inline-block;
  width: 64px;
  height: 34px;
  position: absolute;
    top: 0%;
    right: 0%;
    scale: 0.75;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #73C0FC;
  transition: .4s;
  border-radius: 30px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 30px;
  width: 30px;
  border-radius: 20px;
  left: 2px;
  bottom: 2px;
  z-index: 2;
  background-color: #e8e8e8;
  transition: .4s;
}

.sun svg {
  position: absolute;
  top: 6px;
  left: 36px;
  z-index: 1;
  width: 24px;
  height: 24px;
}

.moon svg {
  fill: #73C0FC !important;
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 1;
  width: 24px;
  height: 24px;
}

/* .switch:hover */.sun svg {
  animation: rotate 15s linear infinite;
}

@keyframes rotate {
 
  0% {
    transform: rotate(0);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* .switch:hover */.moon svg {
  animation: tilt 5s linear infinite;
}

@keyframes tilt {
 
  0% {
    transform: rotate(0deg);
  }

  25% {
    transform: rotate(-10deg);
  }

  75% {
    transform: rotate(10deg);
  }

  100% {
    transform: rotate(0deg);
  }
}

.input:checked + .slider {
  background-color: #183153;
}

.input:focus + .slider {
  box-shadow: 0 0 1px #183153;
}

.input:checked + .slider:before {
  transform: translateX(30px);
}
      .container-items a{
       text-decoration: auto;
      }
        body{
            margin: 0;
            min-height: 100vh;
            color: #e6eef6;
            padding: 28px;
            -webkit-font-smoothing: antialiased;
            padding-top: 20px;
            padding-bottom: 20px;
        }
        .dark{
            background: linear-gradient(180deg, #071028 0%, #051025 60%), radial-gradient(600px 400px at 10% 10%, rgba(124, 92, 255, 0.06), transparent 20%);
            color: #e6eef6; 
        }
            .dark *{
            color: #e6eef6;
            }
        .dark svg{
            fill: #fff;
        }
            button{
            min-width:115px;
            margin-left:15px;
            display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    user-select: none;
    border: 0;
    font-weight: 600;
        background: linear-gradient(90deg, #7c5cff, #5e44ff);
    color: white !important;
    box-shadow: 0 6px 18px rgba(124, 92, 255, 0.12);
            }
            input{
            background:transparent;
            border:1px solid #e1e1e1;
            border-radius:10px;
            } 
        .white{
            background: #fff;
            color: #000;  
        }
            .white *{
               color: #000;
            }
        .white svg{
            fill: #000;
        }
        .grid-container{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 26px 40px;
            width: 100%;
        }
        .container-items{
            display: flex; 
            gap: 5px;
            position: relative;
        }
        .flex-column{
            display: flex; 
            flex-direction: column; 
            height: 100%;
            justify-content: center;
        }
        .flex-column *{
             width: 120px;  
  white-space: nowrap;  /* single line */
  overflow: hidden;     /* hide overflow */
  text-overflow: ellipsis;
        }
        .download-btn{
            position: absolute;
            right: 0%;
            bottom: 0%;
        }
           @media (max-width: 500px) {
   .grid-container{
     gap: 26px 30px;
  }
           }
    </style>
  </head>
  <body class="white">
  <label class="switch">
  <span class="sun"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#ffd43b"><circle r="5" cy="12" cx="12"></circle><path d="m21 13h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm-17 0h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm13.66-5.66a1 1 0 0 1 -.66-.29 1 1 0 0 1 0-1.41l.71-.71a1 1 0 1 1 1.41 1.41l-.71.71a1 1 0 0 1 -.75.29zm-12.02 12.02a1 1 0 0 1 -.71-.29 1 1 0 0 1 0-1.41l.71-.66a1 1 0 0 1 1.41 1.41l-.71.71a1 1 0 0 1 -.7.24zm6.36-14.36a1 1 0 0 1 -1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 -1 1zm0 17a1 1 0 0 1 -1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 -1 1zm-5.66-14.66a1 1 0 0 1 -.7-.29l-.71-.71a1 1 0 0 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1 -.71.29zm12.02 12.02a1 1 0 0 1 -.7-.29l-.66-.71a1 1 0 0 1 1.36-1.36l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1 -.71.24z"></path></g></svg></span>
  <span class="moon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="m223.5 32c-123.5 0-223.5 100.3-223.5 224s100 224 223.5 224c60.6 0 115.5-24.2 155.8-63.4 5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6-96.9 0-175.5-78.8-175.5-176 0-65.8 36-123.1 89.3-153.3 6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"></path></svg></span>   
  <input type="checkbox" class="input">
  <span class="slider"></span>
</label>
    <div style="display:flex;gap:10px;align-items:center"><svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" width="25" height="25">  <path d="M19.5,3h-7.028c-.231,0-.463-.055-.67-.158l-3.156-1.578c-.345-.172-.731-.264-1.117-.264h-3.028C2.019,1,0,3.019,0,5.5v13c0,2.481,2.019,4.5,4.5,4.5h15c2.481,0,4.5-2.019,4.5-4.5V7.5c0-2.481-2.019-4.5-4.5-4.5ZM4.5,2h3.028c.231,0,.463,.055,.67,.158l3.156,1.578c.345,.172,.731,.264,1.117,.264h7.028c1.758,0,3.204,1.308,3.449,3H1v-1.5c0-1.93,1.57-3.5,3.5-3.5Zm15,20H4.5c-1.93,0-3.5-1.57-3.5-3.5V8H23v10.5c0,1.93-1.57,3.5-3.5,3.5Z"/></svg><h2>Index of /${requestUrl.split("/").pop()}</h2></div>
    ${searchInput}
    ${query ? `<p>🔎 Showing results for: <strong>${escapeHtml(query)}</strong></p>` : ''}
    <div class="table-wrapper"> 
      <div class="grid-container">
      <div class="container-items">
       <a href="${path.dirname(requestUrl)}${query?`/?q=${encodeURIComponent(query)}` : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" width="30" height="30">  <path d="M19.5,3h-7.028c-.231,0-.463-.055-.67-.158l-3.156-1.578c-.345-.172-.731-.264-1.117-.264h-3.028C2.019,1,0,3.019,0,5.5v13c0,2.481,2.019,4.5,4.5,4.5h15c2.481,0,4.5-2.019,4.5-4.5V7.5c0-2.481-2.019-4.5-4.5-4.5ZM4.5,2h3.028c.231,0,.463,.055,.67,.158l3.156,1.578c.345,.172,.731,.264,1.117,.264h7.028c1.758,0,3.204,1.308,3.449,3H1v-1.5c0-1.93,1.57-3.5,3.5-3.5Zm15,20H4.5c-1.93,0-3.5-1.57-3.5-3.5V8H23v10.5c0,1.93-1.57,3.5-3.5,3.5Z"/></svg>
        </a>
        <a href="${path.dirname(requestUrl)}${query?`/?q=${encodeURIComponent(query)}` : ''}" class="flex-column">
             <h4>....</h4>  
        </a>  
        </div> 
          ${rows}
         </div> 
    </div>
   <script>
   const links = document.querySelectorAll("a");
   const isDark = localStorage.getItem("dark");
const input = document.querySelector(".input");

if (!isDark && input) {
document.body.classList.toggle("white", false);
document.body.classList.toggle("dark", true);
  input.checked = true;   // set checkbox ON
  input.focus();          // focus the input
}
links.forEach(link => {
  if (link.getAttribute("href")?.startsWith("/")) {
    link.href = window.location.origin + link.getAttribute("href");
  }
});
  const switchBtn = document.querySelector(".switch");

if (!switchBtn.dataset.bound) {
  switchBtn.dataset.bound = "true";
  let data=false
  switchBtn.addEventListener("click", () => { 
    if(!data || (new Date().getTime()-data>150)){
    data=new Date().getTime()
    const isWhite = document.body.classList.contains("white");  
    if(!isWhite){
    localStorage.setItem("dark",true)
    }else {
    localStorage.removeItem("dark")
    }

    document.body.classList.toggle("white", !isWhite);
    document.body.classList.toggle("dark", isWhite);
}
  });
}
</script>
  </body>
  </html>
`;
     // ${goUpLink}

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

function getFilePath() {
  if (process.pkg) {
    // pkg extracts assets near executable
    return path.dirname(process.execPath)
  }

  // dev mode
  return path.join( __dirname);
}

const server = http.createServer({
  key: fs.readFileSync(path.join(getFilePath(),"key.pem")),
  cert: fs.readFileSync(path.join(getFilePath(),"cert.pem"))
},(req, res) => {
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
        <html>
            <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width,initial-scale=1" />
        <head>
         <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
        <title>LocalBeam Login</title><style>
        *{
        color:white}
      body { font-family: sans-serif; background: linear-gradient(180deg, #071028 0%, #051025 60%), radial-gradient(600px 400px at 10% 10%, rgba(124,92,255,0.06), transparent 20%); padding: 2em; }
      form {background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
    border-radius: 12px;
        max-width: 30rem;
    margin: 0 auto;
    padding: 16px;
    box-shadow: 0 6px 18px rgba(2, 6, 23, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.03); }
      input, button { width: 100%; padding: 0.7em; margin-bottom: 1em;    box-shadow: 0 6px 18px rgba(2, 6, 23, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.03);background:transparent }
    button{
    background:linear-gradient(90deg,#7c5cff, #5e44ff) !important;
    font-weight:bold
    }
      .error { color: red; }
    </style></head>
    <body>
          <form method="POST" action="/login" style="margin-top:100px; text-align:center">
            <h2>LocalBeam Login</h2>
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



//   function streamFile(req, res, filePath) {
//   const stat = fs.statSync(filePath);
//   const range = req.headers.range;
//   const type = mime.getType(filePath) || 'application/octet-stream';

//   // Large files (video/audio)
//   if (range) {
//     const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
//     const start = parseInt(startStr, 10);
//     const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
//     const chunkSize = end - start + 1;

//     const stream = fs.createReadStream(filePath, { start, end });
//     res.writeHead(206, {
//       'Content-Range': `bytes ${start}-${end}/${stat.size}`,
//       'Accept-Ranges': 'bytes',
//       'Content-Length': chunkSize,
//       'Content-Type': type
//     });
//     return stream.pipe(res);
//   }

//   // Normal file download
//   res.writeHead(200, {
//     'Content-Type': type,
//     'Content-Length': stat.size,
//     'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
//     'Cache-Control': 'no-cache'
//   });

//   fs.createReadStream(filePath).pipe(res);
// }


async function streamFile(req, res, filePath) {
  try {
    const stat = await fs.promises.stat(filePath);
    const type = mime.getType(filePath) || "application/octet-stream";
    const range = req.headers.range;

    res.setHeader("Connection", "keep-alive");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", type);

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10) || 0;
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": chunkSize,
        "Content-Type": type
      });

      const readStream = fs.createReadStream(filePath, {
        start,
        end,
        highWaterMark: 32 * 1024 * 1024 // 16 MB buffer
      });

      await pump(readStream, res);
      return;
    }

    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Disposition": `inline; filename="${path.basename(filePath)}"`
    });

    const readStream = fs.createReadStream(filePath, {
      highWaterMark: 32 * 1024 * 1024 // 16 MB chunks
    });

    await pump(readStream, res);
  } catch (err) {
    console.error("Send error:", err);
    if (!res.headersSent) res.writeHead(404);
    res.end("File not found");
  }
}

  const decodedPath = decodeURIComponent(requestUrl);
  const safePath = path.normalize(path.join(ROOT_DIR, decodedPath)) 
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
      streamFile(req, res, safePath);
      // const ext = path.extname(safePath);
      // if ([".mp4", ".mkv", ".webm", ".mov"].includes(ext)) {
      //   return streamVideo(req, res, safePath);
      // }

      // const type = mime.getType(ext) || 'application/octet-stream';
      // res.writeHead(200, { 'Content-Type': type });
      // fs.createReadStream(safePath).pipe(res);
    }
  });
});

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

server.listen(PORT,HOST, async() => {
 const HOSTNAME = getLocalIp();
console.log(`http://${HOSTNAME}:${PORT}`)
  // const tunnel = await startCloudflareTunnel(
  //   path.join(__dirname, "resources", "cloudflared-windows-386.exe"),
  //   `http://${HOSTNAME}:${PORT}`
  // );

  // const lanURL = `http://${HOSTNAME}:${PORT}`;
  // const tunnelURL = tunnel;

  // const lanQR = getQRLines(lanURL);
  // const tunnelQR = getQRLines(tunnelURL); 
  // printTwoColumn(
  //   '📡 LAN Access',
  //   '🌍 Tunnel Internet Access',
  //   lanQR,
  //   tunnelQR,
  //   lanURL,
  //   tunnelURL
  // );
  
});

// server.listen(PORT,HOST, () => {
//   HOSTNAME = getLocalIp();
//   console.log(`✅ Server started: http://localhost:${PORT}/`);
//   console.log(`🌐 LAN access:    http://192.168.56.1:${PORT}/`);
// })