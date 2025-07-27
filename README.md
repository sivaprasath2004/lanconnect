 
### 📄 `README.md`

# lanConnect

`lanConnect` is a simple, portable HTTP file server that runs on your local network with optional login support. It is compiled into a single `.exe` file using Node.js and `pkg`, requiring **no installation** or external dependencies.

---

## 📦 Features

- 📁 Serve local folders over LAN
- 🔒 Optional username/password login
- 🌐 Access from other devices on the same network
- 🖥️ Portable `.exe` – no need for Node.js or npm
- 📊 Keeps track of running servers and allows listing/killing them

---

## 🚀 Usage

### 🖱️ Run from Command Prompt

```bash
lanConnect.exe start [port] [username] [password]

* `port` (optional): Port number to start the server (default: 9000)
* `username` and `password` (optional): If provided, login will be required in the browser.

Example:

```bash
lanConnect.exe start 8080 admin mypassword
```

### 🧾 List all running servers

```bash
lanConnect.exe list
```

### ❌ Kill a server running on a specific port

```bash
lanConnect.exe kill 8080
```

### 📦 Check version

```bash
lanConnect.exe --version
```

---

## 💡 Build Instructions (for developers)

> Only needed if you're modifying the source and want to recompile the `.exe`.

### 📁 Project Structure

```
/lanConnect 
  ├── server.js            # Server logic
  ├── lanConnect.js        # CLI logic
  ├── package.json
```

### 🛠️ Build the .exe with `pkg`

1. Install `pkg` globally (if not already):

   ```bash
   npm install -g pkg
   ```

2. Build the executable:

   ```bash
   pkg lanConnect.js --targets node18-win-x64 --output lanConnect.exe
   ```

3. (Optional) Compress with UPX for smaller size:

   ```bash
   upx --best lanConnect.exe
   ```

---

## 🔐 Security Notes

* The login credentials (username/password) are passed as command-line arguments.
* If no credentials are given, the server runs in open mode.

---

## 🧑‍💻 Author

Made by **sivaprasath**
📧 Contact: \[[prasathsiva2004@gmail.com](mailto:prasathsiva2004@gmail.com)]

--- 
