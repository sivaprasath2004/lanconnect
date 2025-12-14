const { spawn } = require("child_process");

module.exports = function startCloudflareTunnel(cloudflarePath, url) {
  
  return new Promise((resolve, reject) => {
    let tunnelUrl = null;
    const urlRegex = /(https?:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/;

   const cloud = spawn(
  cloudflarePath,
  ["tunnel", "--url", url],
  {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  }
);
    cloud.unref();
    const handleOutput = (data) => { 
      const text = data.toString();
      const match = text.match(urlRegex);
      if (match && !tunnelUrl) {
        tunnelUrl = match[0];
        // console.log({
        //   tunnelUrl
        // })
        resolve({url:tunnelUrl,pid:cloud.pid});
      }
    };

    cloud.stdout.on("data", handleOutput);
    cloud.stderr.on("data", handleOutput);

    cloud.on("error", (err) => reject({err,pid:cloud.pid}));

    cloud.on("exit", (code) => {
      if (!tunnelUrl) reject({err:new Error("Cloudflare tunnel exited before URL was detected."),pid:cloud.pid});
    });
  });
};


// const { spawn } = require("child_process");
// const path=require("path")
// let url
// const cloudFarePath=path.join(__dirname,"CloudFared","cloudflared-windows-386.exe")
// const cloud = spawn(cloudFarePath, ["tunnel", "--url", "http://localhost:8899"]);
// const urlRegex = /(https?:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/;
// cloud.stdout.on("data", (data) => {
//     if(!url){
//   const text = data.toString();
//   const match = text.match(urlRegex);
//   if (match) {
//     url=match[0]
//     console.log("Detected Tunnel URL:", url);
//   }
// }
// });

// cloud.stderr.on("data", (data) => {
//      if(!url){
//     const text = data.toString();
//   const match = text.match(urlRegex);
//   if (match) {
//      url=match[0]
//     console.log("Detected Tunnel URL:", match[0]);
//   }
// }
// });
