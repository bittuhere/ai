#!/usr/bin/env python3
"""
BitBot AI - Tunnel Manager
Maintains two Cloudflare tunnels to Ollama (localhost:11434)
Rotates them on odd/even hours, health-checks every 60s, and auto-pushes URL to GitHub.

Author: bittuhere / Anurag
OS: Linux Mint XFCE (4GB RAM)
"""

import subprocess
import requests
import time
import re
import os
import json
import threading
import datetime
import sys
import signal

# ================= CONFIGURATION - EDIT THESE =================
GITHUB_USERNAME = "bittuhere"
GITHUB_EMAIL = "anurag670singh@gmail.com"  # <-- REPLACE WITH YOUR EMAIL
GITHUB_PAT = "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"  # <-- REPLACE WITH YOUR GITHUB PERSONAL ACCESS TOKEN
# Keep repo name as 'ai' . If you change repo name, update below
REPO_NAME = "ai"
OLLAMA_URL = "http://localhost:11434"
CONFIG_FILE_NAME = "config.json"
# ==============================================================

# Derived
GITHUB_REPO_URL = f"https://{GITHUB_PAT}@github.com/{GITHUB_USERNAME}/{REPO_NAME}.git"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, CONFIG_FILE_NAME)

# Tunnel state
tunnels = {
    "A": {"process": None, "url": None, "last_rotation_hour": None},
    "B": {"process": None, "url": None, "last_rotation_hour": None},
}
active_url = None
shutdown_flag = False

URL_REGEX = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

def log(message, level="INFO"):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}", flush=True)

def check_dependencies():
    log("Checking dependencies...")
    # Check cloudflared
    try:
        result = subprocess.run(["cloudflared", "--version"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            log(f"cloudflared found: {result.stdout.strip()}")
        else:
            log("cloudflared not found or not working", level="ERROR")
            return False
    except FileNotFoundError:
        log("cloudflared binary not found! Install it first. See full-guide.md", level="ERROR")
        return False
    except Exception as e:
        log(f"Error checking cloudflared: {e}", level="ERROR")
        return False

    # Check ollama
    try:
        resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        log(f"Ollama is running at {OLLAMA_URL} (status {resp.status_code})")
    except Exception as e:
        log(f"Ollama not reachable at {OLLAMA_URL}: {e}", level="WARN")
        log("Make sure Ollama is running: 'ollama serve' or 'sudo systemctl start ollama'", level="WARN")

    # Check git repo
    if not os.path.exists(os.path.join(SCRIPT_DIR, ".git")):
        log(f"No .git folder in {SCRIPT_DIR}. Make sure this script is inside your cloned repo folder!", level="WARN")
    else:
        log("Git repo found")

    # Check config.json exists
    if not os.path.exists(CONFIG_PATH):
        log(f"{CONFIG_FILE_NAME} not found, creating empty one")
        with open(CONFIG_PATH, "w") as f:
            json.dump({"tunnel_url": ""}, f, indent=2)

    # Check PAT placeholder
    if GITHUB_PAT == "YOUR_PAT_HERE" or "YOUR_PAT" in GITHUB_PAT:
        log("WARNING: You have not replaced YOUR_PAT_HERE! Git push will fail.", level="ERROR")
        log("Edit tunnel_manager.py and set GITHUB_PAT to your actual token", level="ERROR")
    if GITHUB_EMAIL == "your-email@example.com":
        log("WARNING: You have not replaced your-email@example.com", level="WARN")

    return True

def start_cloudflared_process():
    """Start cloudflared tunnel process"""
    try:
        proc = subprocess.Popen(
            ["cloudflared", "tunnel", "--url", OLLAMA_URL],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        return proc
    except Exception as e:
        log(f"Failed to start cloudflared: {e}", level="ERROR")
        return None

def extract_url_from_process(proc, timeout=45):
    """Read process output until trycloudflare URL is found"""
    url = None
    start = time.time()
    log("Waiting for tunnel URL from cloudflared output...")
    while time.time() - start < timeout:
        if proc.poll() is not None:
            log(f"cloudflared process exited early with code {proc.poll()}", level="ERROR")
            break
        line = proc.stdout.readline()
        if not line:
            time.sleep(0.2)
            continue
        line_stripped = line.strip()
        if line_stripped:
            log(f"[cloudflared] {line_stripped}")
        match = URL_REGEX.search(line)
        if match:
            found = match.group(0)
            if "api.trycloudflare.com" in found:
                log(f"Ignoring invalid URL: {found}", level="WARN")
                continue
            if found:
                url = found
                log(f"Found tunnel URL: {url}")
                break
    return url

def consume_remaining_output(proc, tunnel_name):
    """Background thread to keep reading output so pipe doesn't block"""
    try:
        for line in proc.stdout:
            if shutdown_flag:
                break
            line = line.strip()
            if line:
                log(f"[{tunnel_name} log] {line}")
    except Exception:
        pass

def health_check(url, timeout=5):
    """Ping Ollama through tunnel"""
    if not url:
        return False
    try:
        resp = requests.post(
            f"{url}/api/generate",
            json={"model": "tinyllama", "prompt": "ping", "stream": False},
            timeout=timeout,
        )
        if resp.status_code == 200:
            return True
        else:
            log(f"Health check for {url} returned {resp.status_code}: {resp.text[:200]}", level="WARN")
            return False
    except requests.exceptions.Timeout:
        log(f"Health check timeout for {url} (> {timeout}s)", level="WARN")
        return False
    except Exception as e:
        log(f"Health check exception for {url}: {e}", level="WARN")
        return False

def kill_tunnel(name):
    """Kill tunnel process"""
    proc = tunnels[name].get("process")
    if proc and proc.poll() is None:
        log(f"Killing tunnel {name} (PID {proc.pid})...")
        try:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                log(f"Tunnel {name} did not terminate, killing forcefully", level="WARN")
                proc.kill()
                proc.wait(timeout=2)
        except Exception as e:
            log(f"Error killing tunnel {name}: {e}", level="ERROR")
    tunnels[name]["process"] = None
    tunnels[name]["url"] = None

def update_config_and_push(new_url):
    """Validate URL, update config.json, git commit & push"""
    global active_url

    if not new_url:
        log("Refusing to push empty URL", level="ERROR")
        return False
    if "api.trycloudflare.com" in new_url:
        log(f"Refusing to push invalid URL: {new_url}", level="ERROR")
        return False
    if "trycloudflare.com" not in new_url:
        log(f"Refusing to push non-cloudflare URL: {new_url}", level="ERROR")
        return False

    # Write config.json
    try:
        config_data = {"tunnel_url": new_url}
        with open(CONFIG_PATH, "w") as f:
            json.dump(config_data, f, indent=2)
        log(f"Updated {CONFIG_PATH} with URL: {new_url}")

        # Also try to update in cwd if different (safety)
        cwd_config = os.path.join(os.getcwd(), CONFIG_FILE_NAME)
        if os.path.abspath(cwd_config) != os.path.abspath(CONFIG_PATH):
            try:
                with open(cwd_config, "w") as cf:
                    json.dump(config_data, cf, indent=2)
            except Exception:
                pass
    except Exception as e:
        log(f"Failed to write config.json: {e}", level="ERROR")
        return False

    # Git operations
    repo_dir = SCRIPT_DIR
    if not os.path.exists(os.path.join(repo_dir, ".git")):
        repo_dir = os.getcwd()

    def run_git(cmd, allow_fail=False):
        log(f"$ {cmd}")
        result = subprocess.run(cmd, shell=True, cwd=repo_dir, capture_output=True, text=True)
        if result.stdout.strip():
            log(f"  stdout: {result.stdout.strip()}")
        if result.stderr.strip():
            # git often prints to stderr even on success, so only log as WARN if failed
            if result.returncode != 0:
                log(f"  stderr: {result.stderr.strip()}", level="WARN" if allow_fail else "ERROR")
            else:
                log(f"  info: {result.stderr.strip()}")
        return result.returncode == 0, result

    try:
        # Configure git user
        run_git(f'git config user.name "{GITHUB_USERNAME}"')
        run_git(f'git config user.email "{GITHUB_EMAIL}"')

        run_git('git add config.json')

        # Check if there is anything to commit
        diff_check = subprocess.run('git diff --cached --quiet', shell=True, cwd=repo_dir)
        if diff_check.returncode == 0:
            log("No changes to commit (config already up to date)")
            active_url = new_url
            return True

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        commit_ok, _ = run_git(f'git commit -m "Update tunnel URL at {timestamp}"')
        if not commit_ok:
            log("Commit failed (maybe nothing to commit)", level="WARN")

        # Push
        # Using PAT in URL - be careful not to log PAT
        safe_log_url = f"https://***@github.com/{GITHUB_USERNAME}/{REPO_NAME}.git"
        log(f"Pushing to {safe_log_url} main...")
        push_cmd = f'git push {GITHUB_REPO_URL} main'
        push_ok, push_res = run_git(push_cmd, allow_fail=True)
        if not push_ok:
            log("Push to main failed, trying HEAD:main", level="WARN")
            push_ok, _ = run_git(f'git push {GITHUB_REPO_URL} HEAD:main', allow_fail=True)

        if push_ok:
            log(f"Successfully pushed new URL to GitHub: {new_url}")
            active_url = new_url
            return True
        else:
            log("Git push failed! Check your PAT and internet.", level="ERROR")
            return False

    except Exception as e:
        log(f"Exception during git operations: {e}", level="ERROR")
        return False

def create_tunnel(name, max_retries=3):
    """Create or recreate a tunnel with retries"""
    for attempt in range(1, max_retries + 1):
        log(f"Attempt {attempt}/{max_retries} to create tunnel {name}...")
        kill_tunnel(name)

        proc = start_cloudflared_process()
        if not proc:
            time.sleep(3)
            continue

        url = extract_url_from_process(proc, timeout=45)
        if not url:
            log(f"Failed to extract URL for tunnel {name} on attempt {attempt}", level="ERROR")
            try:
                proc.terminate()
                proc.kill()
            except Exception:
                pass
            time.sleep(3)
            continue

        # Start background consumer thread
        t = threading.Thread(target=consume_remaining_output, args=(proc, name), daemon=True)
        t.start()

        # Give tunnel a moment to become fully ready
        log(f"Tunnel {name} URL {url} found, waiting 3s for stabilization...")
        time.sleep(3)

        if health_check(url):
            tunnels[name]["process"] = proc
            tunnels[name]["url"] = url
            tunnels[name]["last_rotation_hour"] = datetime.datetime.now().hour
            log(f"Tunnel {name} is HEALTHY and UP: {url}")
            # Update GitHub config with this new healthy URL
            update_config_and_push(url)
            return True
        else:
            log(f"Tunnel {name} health check failed after creation: {url}", level="WARN")
            try:
                proc.terminate()
                proc.kill()
            except Exception:
                pass
            time.sleep(2)

    log(f"Failed to create tunnel {name} after {max_retries} attempts", level="ERROR")
    return False

def get_other_tunnel_name(name):
    return "B" if name == "A" else "A"

def main_loop():
    global active_url, shutdown_flag

    log("=== BitBot AI Tunnel Manager Starting ===")
    if not check_dependencies():
        log("Dependency check had errors, but continuing anyway...", level="WARN")

    # Initial creation of both tunnels
    log("Creating Tunnel A at startup...")
    create_tunnel("A")

    log("Creating Tunnel B at startup (staggered)...")
    time.sleep(2)
    create_tunnel("B")

    if not tunnels["A"]["url"] and not tunnels["B"]["url"]:
        log("Both tunnels failed at startup! Retrying in 10s...", level="ERROR")
        time.sleep(10)
        create_tunnel("A")
        create_tunnel("B")

    # Set active_url to whichever is available
    if tunnels["A"]["url"]:
        active_url = tunnels["A"]["url"]
    elif tunnels["B"]["url"]:
        active_url = tunnels["B"]["url"]

    log(f"Startup complete. Active URL: {active_url}")
    log("Entering main monitoring loop (60s interval)...")
    log("Rotation schedule: Tunnel A on odd hours (1,3,5...), Tunnel B on even hours (2,4,6...)")
    log("Press Ctrl+C to stop")

    while not shutdown_flag:
        try:
            now = datetime.datetime.now()
            current_hour = now.hour
            log(f"--- Heartbeat {now.strftime('%H:%M:%S')} | Active: {active_url} | A: {tunnels['A']['url']} | B: {tunnels['B']['url']} ---")

            # Check if processes are still alive
            for name in ["A", "B"]:
                proc = tunnels[name]["process"]
                if proc and proc.poll() is not None:
                    log(f"Tunnel {name} process died unexpectedly (exit code {proc.poll()})", level="WARN")
                    tunnels[name]["process"] = None
                    tunnels[name]["url"] = None

            # Rotation logic
            for name in ["A", "B"]:
                last_rot = tunnels[name]["last_rotation_hour"]
                should_rotate = False
                if name == "A" and current_hour % 2 == 1:  # odd hour
                    if last_rot != current_hour:
                        should_rotate = True
                elif name == "B" and current_hour % 2 == 0:  # even hour
                    if last_rot != current_hour:
                        should_rotate = True

                if should_rotate:
                    log(f"Rotation time for Tunnel {name}! Current hour {current_hour}, last rotation {last_rot}")
                    # Ensure other tunnel is healthy before rotating this one
                    other = get_other_tunnel_name(name)
                    other_url = tunnels[other]["url"]
                    if other_url and health_check(other_url):
                        log(f"Other tunnel {other} is healthy ({other_url}), safe to rotate {name}")
                    else:
                        log(f"Other tunnel {other} is NOT healthy, but proceeding with rotation of {name} anyway (will regenerate both if needed)", level="WARN")
                    create_tunnel(name)
                    # After rotation, small delay
                    time.sleep(2)

            # Health checks every loop (60s)
            for name in ["A", "B"]:
                url = tunnels[name]["url"]
                if not url:
                    log(f"Tunnel {name} has no URL, attempting to create...", level="WARN")
                    create_tunnel(name)
                    continue

                if not health_check(url):
                    log(f"Health check FAILED for Tunnel {name} ({url}), regenerating...", level="ERROR")
                    # If this failing tunnel is the active one, try to switch to other tunnel first
                    if active_url == url:
                        other = get_other_tunnel_name(name)
                        other_url = tunnels[other]["url"]
                        if other_url and health_check(other_url):
                            log(f"Switching active URL from failing {name} to healthy {other}: {other_url}")
                            update_config_and_push(other_url)
                        else:
                            log(f"Both tunnels unhealthy! Regenerating {name} immediately", level="ERROR")

                    create_tunnel(name)
                else:
                    log(f"Health check OK for Tunnel {name}: {url}")

            # Ensure active_url is healthy, if not switch
            if active_url and not health_check(active_url):
                log(f"Active URL {active_url} is now unhealthy!", level="WARN")
                # Try other tunnel
                found_healthy = False
                for name in ["A", "B"]:
                    url = tunnels[name]["url"]
                    if url and url != active_url and health_check(url):
                        log(f"Switching active URL to {name}: {url}")
                        update_config_and_push(url)
                        found_healthy = True
                        break
                if not found_healthy:
                    log("No healthy tunnel found for active URL! Will regenerate on next loop", level="ERROR")

            # If active_url is None but we have a healthy tunnel, push it
            if not active_url:
                for name in ["A", "B"]:
                    url = tunnels[name]["url"]
                    if url and health_check(url):
                        log(f"No active URL, setting to {name}: {url}")
                        update_config_and_push(url)
                        break

            log(f"Sleeping 60s... Next rotation check at next hour. Active: {active_url}")
            # Sleep 60s but check shutdown flag every second
            for _ in range(60):
                if shutdown_flag:
                    break
                time.sleep(1)

        except KeyboardInterrupt:
            log("KeyboardInterrupt received, shutting down...", level="WARN")
            shutdown_flag = True
            break
        except Exception as e:
            log(f"Exception in main loop: {e}", level="ERROR")
            import traceback
            traceback.print_exc()
            time.sleep(10)

    # Cleanup
    log("Shutting down tunnels...")
    for name in ["A", "B"]:
        kill_tunnel(name)
    log("Tunnel manager stopped")

def signal_handler(sig, frame):
    global shutdown_flag
    log(f"Received signal {sig}, shutting down...", level="WARN")
    shutdown_flag = True

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    main_loop()

