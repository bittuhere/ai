# BitBot AI - Complete Setup Guide for Linux Mint XFCE (4GB RAM)

This guide will take you from **zero to fully deployed** personal AI website: `https://bittuhere.github.io/ai`

Your laptop (Linux Mint XFCE, 4GB RAM) becomes the private server via Cloudflare Tunnels + Ollama. No Firebase, no paid hosting.

---

## 0. System Overview - How It Works

```
Your Laptop (Linux Mint)
├── Ollama serving on http://localhost:11434 (tinyllama + smollm)
├── tunnel_manager.py
│   ├── Spawns 2x cloudflared processes → https://xxxx.trycloudflare.com
│   ├── Rotates: Tunnel A on odd hours (1,3,5...), Tunnel B on even hours (2,4,6...)
│   ├── Health checks every 60s via POST /api/generate {"prompt":"ping"}
│   └── On new URL → updates config.json → git commit → git push to GitHub
│
GitHub Repo bittuhere/ai
├── index.html (frontend)
├── config.json {"tunnel_url": "https://...trycloudflare.com"}  ← auto-updated by laptop
└── Served via GitHub Pages at https://bittuhere.github.io/ai

User Browser
├── Loads index.html
├── Fetches https://raw.githubusercontent.com/bittuhere/ai/main/config.json?t=Date.now()
├── Gets tunnel_url
└── Sends chat directly to [tunnel_url]/api/generate → streams back to browser
```

**Key point:** Frontend never uses localhost. It always uses the dynamic tunnel URL from config.json. Config is re-fetched before every message + every 2 minutes.

---

## 1. Prerequisites on Your Linux Mint Laptop

Open Terminal (Ctrl+Alt+T).

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Git, Python3, Curl
```bash
sudo apt install git python3 python3-pip curl wget -y
python3 --version
git --version
```

### 1.3 Install Ollama (Local LLM Runner)
Ollama official install:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Verify:
```bash
ollama --version
```

Start Ollama service:
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

If you don't have systemd, run manually in a separate terminal:
```bash
ollama serve
```

Test Ollama:
```bash
curl http://localhost:11434/api/tags
# Should return {"models":[]} initially
```

### 1.4 Pull Required Models (Optimized for 4GB RAM)
```bash
ollama pull tinyllama
ollama pull smollm:135m
# Note: The code uses "smollm" as model name. If smollm:135m is the actual name,
# either rename or edit index.html. Let's create an alias:
ollama cp smollm:135m smollm
```

Check models:
```bash
ollama list
```

**RAM Tips for 4GB:**
- Only one model loads at a time. Ollama unloads idle models automatically.
- tinyllama is ~637MB, smollm:135m is ~92MB - both fine for 4GB.
- Close Firefox/Chrome tabs while testing.
- If OOM, add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`

### 1.5 Install cloudflared (Cloudflare Tunnel)
**Method A - .deb package (Recommended for Mint):**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
cloudflared --version
```

**Method B - Binary:**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
cloudflared --version
```

**Method C - If above fails:**
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/bin/
```

### 1.6 Install Python Dependency
```bash
pip3 install requests --break-system-packages
# If --break-system-packages not supported (older pip):
# pip3 install requests
# Or use venv (optional):
# python3 -m venv venv && source venv/bin/activate && pip install requests
```

### 1.7 Configure Ollama for CORS (CRITICAL!)
GitHub Pages (https://bittuhere.github.io) needs to call your tunnel, which forwards to Ollama. By default Ollama blocks cross-origin requests.

You must set `OLLAMA_ORIGINS=*` and `OLLAMA_HOST=0.0.0.0`.

**For systemd (default Ollama install):**
```bash
sudo systemctl edit ollama
```
This opens an editor. Paste:
```ini
[Service]
Environment="OLLAMA_ORIGINS=*"
Environment="OLLAMA_HOST=0.0.0.0"
```
Save (Ctrl+O, Enter, Ctrl+X if nano).

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
sudo systemctl status ollama
```

**Verify CORS is enabled:**
```bash
cat /etc/systemd/system/ollama.service.d/override.conf
# or
systemctl show ollama --property=Environment
```

**If you run `ollama serve` manually:**
```bash
OLLAMA_ORIGINS="*" OLLAMA_HOST=0.0.0.0 ollama serve
```

Always keep `OLLAMA_ORIGINS=*` otherwise browser will get CORS error.

---

## 2. GitHub Setup (From Scratch)

### 2.1 Create Repo `bittuhere/ai`
1. Go to https://github.com/new
2. Owner: `bittuhere`
3. Repository name: `ai`
4. Description: `BitBot AI - Private LLM via Cloudflare Tunnel`
5. Visibility: **Public** (required for GitHub Pages free + raw.githubusercontent)
6. **DO NOT** initialize with README, .gitignore (we will push our files)
7. Click Create repository

### 2.2 Create Personal Access Token (PAT)
1. Go to https://github.com/settings/tokens
2. Click **Developer settings** (bottom left) → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token → Generate new token (classic)**
4. Note: `ai-tunnel-manager`
5. Expiration: 90 days or No expiration (your choice, but note expiry)
6. Scopes: Check **repo** (full control of private repositories) - this includes repo push
7. Generate token
8. **COPY TOKEN IMMEDIATELY** - looks like `ghp_xxxxxxxxxxxxxxxxxxxx`
9. Save it in a temporary notepad - you will paste it in tunnel_manager.py

> **Security:** Never commit PAT to GitHub. The script uses it only in push URL, and config.json never contains it. If you accidentally push PAT, delete token and generate new one.

### 2.3 Enable GitHub Pages
1. Go to your repo: https://github.com/bittuhere/ai
2. Settings → Pages (left sidebar)
3. Build and deployment:
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
   - Save
4. Wait 1-2 minutes. Your site will be at `https://bittuhere.github.io/ai`
5. It will show 404 until you push index.html.

---

## 3. Clone Repo & Add Files on Your Laptop

### 3.1 Clone
```bash
cd ~/Documents
# or cd ~
git clone https://github.com/bittuhere/ai.git
cd ai
ls -la
```

### 3.2 Copy Provided Files
You have 3 files from this project:

- `index.html` (frontend)
- `config.json` (initial empty)
- `tunnel_manager.py` (backend)
- `full-guide.md` (this file)

If you downloaded this workspace, copy them:
```bash
# Assuming you have the files in ~/Downloads/ai or current workspace
cp /path/to/index.html .
cp /path/to/config.json .
cp /path/to/tunnel_manager.py .
cp /path/to/full-guide.md .
```

Or create them manually (copy-paste from the workspace).

### 3.3 Edit `tunnel_manager.py` - Insert Your PAT & Email
Open with text editor:
```bash
nano tunnel_manager.py
```
Or in XFCE: `mousepad tunnel_manager.py`

Find top section:
```python
GITHUB_USERNAME = "bittuhere"
GITHUB_EMAIL = "your-email@example.com"  # <-- REPLACE
GITHUB_PAT = "YOUR_PAT_HERE"  # <-- REPLACE
```

Replace:
- `GITHUB_EMAIL` with your GitHub email (e.g., `anurag@example.com`). Check via `git config --global user.email` or GitHub settings.
- `GITHUB_PAT` with your token `ghp_...` - keep the quotes.

Save: Ctrl+O, Enter, Ctrl+X.

### 3.4 First Commit & Push
```bash
# Inside ~/Documents/ai or wherever you cloned
git config user.name "bittuhere"
git config user.email "your-email@example.com"  # same as above

git add index.html config.json tunnel_manager.py full-guide.md
git commit -m "Initial deploy: BitBot AI frontend + tunnel manager"
git branch -M main
git remote -v
# Should show origin https://github.com/bittuhere/ai.git

# Push using PAT (first time)
git push https://YOUR_PAT@github.com/bittuhere/ai.git main
# Replace YOUR_PAT with actual token
# Example: git push https://ghp_abc123...@github.com/bittuhere/ai.git main
```

If it asks for password, use PAT not GitHub password.

Check GitHub repo online - files should appear.

Check GitHub Pages: Visit https://bittuhere.github.io/ai - you should see BitBot UI but status says "Could not connect" (because tunnel not running yet - normal).

### 3.5 Verify config.json Raw URL
Visit in browser:
```
https://raw.githubusercontent.com/bittuhere/ai/main/config.json
```
Should show `{"tunnel_url": ""}` initially.

Frontend fetches with `?t=Date.now()` to bypass cache, but raw.githubusercontent caches for ~5 minutes. Our script pushes new URL, but GitHub Pages + raw CDN may take 30-60s to update. That's okay - frontend retries.

---

## 4. Running the System

### 4.1 Make Script Executable
```bash
chmod +x tunnel_manager.py
```

### 4.2 Run in Terminal (Foreground - for testing)
```bash
cd ~/Documents/ai
python3 tunnel_manager.py
```

You should see logs like:
```
[2026-08-24 10:00:00] [INFO] === BitBot AI Tunnel Manager Starting ===
[2026-08-24 10:00:01] [INFO] Checking dependencies...
[2026-08-24 10:00:01] [INFO] cloudflared found: cloudflared version ...
[2026-08-24 10:00:02] [INFO] Creating Tunnel A at startup...
[2026-08-24 10:00:05] [INFO] Found tunnel URL: https://random-words-1234.trycloudflare.com
[2026-08-24 10:00:08] [INFO] Tunnel A is HEALTHY and UP: https://...
[2026-08-24 10:00:09] [INFO] Updated .../config.json with URL: https://...
[2026-08-24 10:00:10] [INFO] Successfully pushed new URL to GitHub
...
```

**Wait 30-60 seconds after first push**, then refresh https://bittuhere.github.io/ai - status should become green "● Connected" with tunnel URL.

Then try sending a message: "Hello".

If Ollama model not loaded, first request may take 10-20s (model loading). Subsequent faster.

### 4.3 Test Health Check Manually
In another terminal:
```bash
# Get current URL from config.json
cat config.json
# Test curl
curl -X POST https://YOUR-TUNNEL.trycloudflare.com/api/generate -H "Content-Type: application/json" -d '{"model":"tinyllama","prompt":"ping","stream":false}'
```

### 4.4 Running Continuously (Background)

**Option 1 - tmux (Recommended for beginners, survives terminal close):**
```bash
sudo apt install tmux -y
tmux new -s ai
cd ~/Documents/ai
python3 tunnel_manager.py
# Press Ctrl+B then D to detach (leave running)
# To re-attach later: tmux attach -t ai
# To list sessions: tmux ls
# To kill: tmux kill-session -t ai
```

**Option 2 - nohup:**
```bash
cd ~/Documents/ai
nohup python3 tunnel_manager.py > tunnel.log 2>&1 &
tail -f tunnel.log
# To stop: pkill -f tunnel_manager.py
```

**Option 3 - Systemd Service (Auto-start on boot - Advanced):**
Create service file:
```bash
sudo nano /etc/systemd/system/bitbot-tunnel.service
```
Paste (replace USER and paths):
```ini
[Unit]
Description=BitBot AI Tunnel Manager
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=YOUR_LINUX_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/Documents/ai
Environment="OLLAMA_ORIGINS=*"
ExecStart=/usr/bin/python3 /home/YOUR_USERNAME/Documents/ai/tunnel_manager.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable bitbot-tunnel
sudo systemctl start bitbot-tunnel
sudo systemctl status bitbot-tunnel
journalctl -u bitbot-tunnel -f
```

**Option 4 - XFCE Autostart:**
- Settings → Session and Startup → Application Autostart → Add
- Name: BitBot Tunnel
- Command: `bash -c 'cd /home/YOUR_USERNAME/Documents/ai && python3 tunnel_manager.py'`
- Or use: `xfce4-terminal -e "python3 /home/YOUR_USERNAME/Documents/ai/tunnel_manager.py"` to see window.

---

## 5. Frontend Usage & Customization

- **Mode Toggle:**
  - Fast = tinyllama, concise, direct
  - Thinking = smollm, shows `<thinking>` collapsible + `<answer>`
- **System Prompts:** Hardcoded in `index.html` as per your spec. Edit if you want different personality.
- **Auto-scroll, dark mode, bubbles** as specified.
- **Config sync:** Before every message + every 2 minutes + on page load. If tunnel rotates while user chatting, next message will fetch new URL automatically.

**If user sees "Could not connect":**
1. Check laptop is on and connected to internet
2. Check `tunnel_manager.py` still running (`ps aux | grep tunnel`)
3. Check `config.json` raw URL has valid URL
4. Wait 60s and refresh (GitHub raw cache delay)

---

## 6. Troubleshooting Checklist

| Problem | Cause | Fix |
|---------|-------|-----|
| `cloudflared not found` | Not installed | Re-install via Section 1.5 |
| `Ollama not reachable` | Ollama not running | `sudo systemctl start ollama` or `ollama serve` |
| `Health check FAILED` loop | Ollama CORS blocked or model missing | Set `OLLAMA_ORIGINS=*` and `ollama pull tinyllama` |
| Git push fails 403 | PAT wrong/expired or missing repo scope | Regenerate PAT with `repo` scope, update script |
| Git push fails 401 | PAT contains special chars not URL-encoded | Generate new PAT without special chars, or URL-encode |
| Frontend shows Connected but chat fails with CORS | Ollama CORS not set | Section 1.7, restart ollama |
| Frontend fetch fails with `Failed to fetch` | Tunnel URL stale, rotating | Wait 15s, try again. Check tunnel_manager logs |
| `No .git folder` warning | Script not inside repo | Move `tunnel_manager.py` inside cloned `ai` folder |
| Model slow on 4GB | RAM full | Close browser tabs, add swap, use smaller models |
| GitHub Pages 404 | Pages not enabled or branch wrong | Settings → Pages → main/root, wait 2 min |
| raw.githubusercontent returns old URL | CDN cache | Wait 60s, frontend uses `?t=Date.now()` but raw caches ~5 min. Our script pushes, Pages needs time. |

**Logs to check:**
```bash
# Tunnel manager logs (if foreground)
# If systemd:
journalctl -u bitbot-tunnel -f
# If nohup:
tail -f tunnel.log
# Ollama logs:
sudo journalctl -u ollama -f
# Or:
ollama logs
```

**Manual test of full chain:**
```bash
# 1. Ollama local
curl http://localhost:11434/api/generate -d '{"model":"tinyllama","prompt":"Hi","stream":false}'

# 2. Via tunnel (get URL from config.json)
curl https://YOUR_URL.trycloudflare.com/api/generate -d '{"model":"tinyllama","prompt":"Hi","stream":false}'

# 3. GitHub config
cat config.json
curl https://raw.githubusercontent.com/bittuhere/ai/main/config.json
```

---

## 7. Security & Privacy Notes

- **PAT:** Keep private. If exposed, revoke immediately at https://github.com/settings/tokens
- **Tunnel URL:** Anyone with URL can call your Ollama. Cloudflare URL is random and rotates every hour (by design). Don't share raw tunnel URL, share only GitHub Pages link.
- **Ollama:** With `OLLAMA_ORIGINS=*`, any website could call your tunnel if they know URL. Rotation mitigates. For extra security, you could set `OLLAMA_ORIGINS=https://bittuhere.github.io` but then raw.githubusercontent fetch might still need wildcard. For personal use, wildcard is okay.
- **GitHub repo:** Public, but only contains tunnel URL (temporary) and frontend. No secrets.
- **Laptop:** Your laptop must stay on. If you close lid, Mint may suspend - change Power settings: Settings → Power Manager → When lid closed → Do nothing (on AC).
- **Firewall:** No need to open ports, Cloudflare Tunnel is outbound only.

---

## 8. Updating & Maintenance

**Update frontend:**
```bash
cd ~/Documents/ai
nano index.html
# edit
git add index.html
git commit -m "Update frontend"
git push https://YOUR_PAT@github.com/bittuhere/ai.git main
```

**Update tunnel_manager.py:**
- Edit file, restart process: Ctrl+C and run again, or `sudo systemctl restart bitbot-tunnel`

**Change models:**
- Edit `index.html` JS: `const model = currentMode === 'fast' ? 'tinyllama' : 'smollm';` change to any Ollama model you pulled (e.g., `llama3.2:1b`, `phi3:mini`).
- Also update health check model in `tunnel_manager.py` if you want.

**Monitor RAM:**
```bash
htop
# or
free -h
watch -n 2 free -h
```

---

## 9. Quick Start Cheat Sheet (After First Setup)

```bash
# Terminal 1: Ensure Ollama running
sudo systemctl start ollama

# Terminal 2: Start tunnel manager (or use tmux)
cd ~/Documents/ai
python3 tunnel_manager.py

# Then open:
# https://bittuhere.github.io/ai
```

**Daily usage:**
1. Open laptop, ensure internet
2. `tmux attach -t ai` → check logs healthy
3. Share link `https://bittuhere.github.io/ai` with friends
4. When done, leave tmux detached - it keeps running

**To stop:**
```bash
tmux kill-session -t ai
# or
pkill -f tunnel_manager.py
sudo systemctl stop ollama
```

---

## 10. File Structure Final

```
/home/YOUR_USERNAME/Documents/ai/
├── index.html          ← Frontend, pushed to GitHub, served by Pages
├── config.json         ← Auto-updated by script, contains tunnel_url
├── tunnel_manager.py   ← Backend, runs on laptop, NOT served by Pages (but in repo for backup)
└── full-guide.md       ← This guide
```

GitHub repo `bittuhere/ai` should have same files (tunnel_manager.py can be in repo for backup, but not required for Pages).

---

## 11. Next Steps / Improvements (Optional)

- Add password protection to frontend (simple JS prompt)
- Add chat history localStorage
- Add markdown renderer (marked.js via CDN - but spec says avoid CDN, so keep simple)
- Add voice input (Web Speech API)
- Add model selector dropdown instead of just 2 modes
- Host Ollama on more powerful machine (e.g., old PC with 8GB RAM) for faster responses

---

## 12. Credits

- Developer: Anurag (bittuhere)
- Models: TinyLlama, SmolLM via Ollama
- Tunnel: Cloudflare Quick Tunnels (trycloudflare.com) - free, no account needed
- Hosting: GitHub Pages
- Frontend: Vanilla HTML/CSS/JS (no frameworks, no Firebase)

---

**You are done!** Run `python3 tunnel_manager.py` and open https://bittuhere.github.io/ai

If stuck, check logs, check Section 6 Troubleshooting, and ensure all steps in Section 1.7 (CORS) are done - that's the #1 reason for failure.

Good luck! 🚀
