"""
OpenCode Runner - Simple Web UI

Run with: python app.py
Then open: http://localhost:8000

This gives you a web interface to:
- Create Daytona sandboxes with OpenCode
- View the terminal in your browser
- Stop sandboxes when done
"""

import os
import json
import time
import urllib.request
import ssl
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from dotenv import load_dotenv

load_dotenv()

# Log file for debugging
LOG_FILE = "sandbox_log.txt"

def log(msg):
    """Log to both console and file"""
    print(msg, flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(f"{time.strftime('%H:%M:%S')} - {msg}\n")

# Store multiple sandbox instances
SANDBOXES = {}  # id -> {sandbox_id, terminal_url, vnc_base_url, vnc_token}
NEXT_ID = 1


class OpenCodeHandler(SimpleHTTPRequestHandler):
    """HTTP handler for the OpenCode web UI"""

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/" or path == "/index.html":
            self.serve_ui()
        elif path == "/api/status":
            self.serve_status()
        elif path.startswith("/vnc/"):
            # /vnc/1, /vnc/2, etc.
            self.handle_vnc_proxy()
        elif path.startswith("/static/"):
            super().do_GET()
        else:
            self.send_error(404)

    def handle_vnc_proxy(self):
        """Serve a custom noVNC page that connects directly to Daytona"""
        # Extract instance ID from path: /vnc/1 -> 1
        path = urlparse(self.path).path
        try:
            instance_id = int(path.split("/")[2])
        except (IndexError, ValueError):
            self.send_error(400, "Invalid instance ID")
            return

        sandbox = SANDBOXES.get(instance_id)
        if not sandbox or not sandbox.get("vnc_base_url"):
            self.send_error(404, "No VNC URL available for this instance")
            return

        base = sandbox["vnc_base_url"].rstrip("/")
        ws_base = base.replace("https://", "wss://").replace("http://", "ws://")
        token = sandbox.get("vnc_token", "")

        # Serve a minimal noVNC page that connects directly to Daytona
        html = f'''<!DOCTYPE html>
<html>
<head>
    <title>VNC Desktop</title>
    <meta charset="utf-8">
    <style>
        * {{ margin: 0; padding: 0; }}
        html, body {{ width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }}
        #screen {{ width: 100%; height: 100%; }}
        #status {{
            position: fixed; top: 10px; left: 10px;
            background: rgba(0,0,0,0.7); color: #0f0;
            padding: 8px 16px; border-radius: 4px; font-family: monospace;
            z-index: 1000;
        }}
        #status.error {{ color: #f55; }}
        #status.connected {{ display: none; }}
    </style>
    <script type="module" crossorigin="anonymous">
        import RFB from 'https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/core/rfb.js';

        const status = document.getElementById('status');
        const wsUrl = '{ws_base}/websockify?token={token}';

        status.textContent = 'Connecting to VNC...';

        try {{
            const rfb = new RFB(
                document.getElementById('screen'),
                wsUrl,
                {{ credentials: {{ password: '' }} }}
            );

            rfb.scaleViewport = true;
            rfb.resizeSession = true;

            rfb.addEventListener('connect', () => {{
                status.textContent = 'Connected!';
                status.className = 'connected';
            }});

            rfb.addEventListener('disconnect', (e) => {{
                status.textContent = 'Disconnected' + (e.detail.clean ? '' : ' (error)');
                status.className = 'error';
            }});

            rfb.addEventListener('securityfailure', (e) => {{
                status.textContent = 'Security error: ' + e.detail.reason;
                status.className = 'error';
            }});

        }} catch (err) {{
            status.textContent = 'Error: ' + err.message;
            status.className = 'error';
        }}
    </script>
</head>
<body>
    <div id="status">Initializing...</div>
    <div id="screen"></div>
</body>
</html>'''

        content = html.encode('utf-8')
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", len(content))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/create":
            self.handle_create()
        elif path == "/api/stop":
            self.handle_stop()
        else:
            self.send_error(404)

    def serve_ui(self):
        """Serve the main HTML UI"""
        html = self.get_ui_html()
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", len(html))
        self.end_headers()
        self.wfile.write(html.encode())

    def serve_status(self):
        """Return all sandboxes status as JSON"""
        self.send_json({"sandboxes": SANDBOXES})

    def handle_create(self):
        """Create a new Daytona sandbox"""
        global NEXT_ID

        # Read request body for repo URL
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else "{}"

        try:
            data = json.loads(body) if body else {}
        except:
            data = {}

        repo_url = data.get("repo_url")

        try:
            result = create_sandbox(repo_url)
            instance_id = NEXT_ID
            NEXT_ID += 1

            SANDBOXES[instance_id] = {
                "sandbox_id": result["sandbox_id"],
                "terminal_url": result["terminal_url"],
                "vnc_base_url": result.get("vnc_base_url"),
                "vnc_token": result.get("vnc_token")
            }
            self.send_json({"instance_id": instance_id, **SANDBOXES[instance_id]})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_stop(self):
        """Stop a specific sandbox by instance_id"""
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else "{}"

        try:
            data = json.loads(body) if body else {}
        except:
            data = {}

        instance_id = data.get("instance_id")
        if not instance_id or instance_id not in SANDBOXES:
            self.send_json({"error": "Invalid instance_id"}, 400)
            return

        try:
            sandbox = SANDBOXES[instance_id]
            stop_sandbox(sandbox["sandbox_id"])
            del SANDBOXES[instance_id]
            self.send_json({"success": True})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def send_json(self, data, status=200):
        """Send JSON response"""
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def get_ui_html(self):
        """Return the HTML for the web UI"""
        # Build instance cards
        instance_count = len(SANDBOXES)

        return f'''<!DOCTYPE html>
<html>
<head>
    <title>OpenCode Runner</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0d1117;
            color: #c9d1d9;
            min-height: 100vh;
        }}
        .header {{
            padding: 16px 24px;
            background: #161b22;
            border-bottom: 1px solid #30363d;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .header h1 {{ font-size: 20px; color: #f0f6fc; }}
        .instance-count {{ color: #8b949e; font-size: 14px; }}
        .controls {{
            padding: 16px 24px;
            display: flex;
            gap: 12px;
            align-items: center;
            border-bottom: 1px solid #30363d;
        }}
        input {{
            padding: 10px 14px;
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            color: #c9d1d9;
            font-size: 14px;
            width: 300px;
        }}
        input:focus {{ outline: none; border-color: #58a6ff; }}
        button {{
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
        }}
        .btn-primary {{ background: #238636; color: white; }}
        .btn-primary:hover {{ background: #2ea043; }}
        .btn-danger {{ background: #da3633; color: white; padding: 6px 12px; font-size: 12px; }}
        .btn-danger:hover {{ background: #f85149; }}
        .instances {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: 16px;
            padding: 16px 24px;
        }}
        .instance {{
            border: 1px solid #30363d;
            border-radius: 8px;
            overflow: hidden;
            background: #161b22;
        }}
        .instance-header {{
            padding: 8px 12px;
            background: #21262d;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
        }}
        .instance-header span {{ color: #58a6ff; }}
        .instance iframe {{
            width: 100%;
            height: 500px;
            border: none;
        }}
        .empty-state {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 24px;
            color: #8b949e;
        }}
        .empty-state h2 {{ margin-bottom: 8px; color: #c9d1d9; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>OpenCode Runner</h1>
        <span class="instance-count">{instance_count} instance(s) running</span>
    </div>

    <div class="controls">
        <input type="text" id="repo-url" placeholder="Git repo URL (optional)" />
        <button class="btn-primary" id="start-btn" onclick="createSandbox()">
            + New Instance
        </button>
    </div>

    <div class="instances">
        {self._render_instances()}
    </div>

    {'''<div class="empty-state">
        <h2>No instances running</h2>
        <p>Click "+ New Instance" to create a sandbox with VNC desktop</p>
    </div>''' if not SANDBOXES else ''}

    <script>
        async function createSandbox() {{
            const repoUrl = document.getElementById('repo-url').value;
            const btn = document.getElementById('start-btn');
            btn.disabled = true;
            btn.textContent = 'Creating...';

            try {{
                const res = await fetch('/api/create', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ repo_url: repoUrl || null }})
                }});
                const data = await res.json();
                if (data.error) {{
                    alert('Error: ' + data.error);
                    btn.disabled = false;
                    btn.textContent = '+ New Instance';
                }} else {{
                    window.location.reload();
                }}
            }} catch (e) {{
                alert('Error: ' + e.message);
                btn.disabled = false;
                btn.textContent = '+ New Instance';
            }}
        }}

        async function stopInstance(instanceId) {{
            if (!confirm('Stop this instance?')) return;

            try {{
                await fetch('/api/stop', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ instance_id: instanceId }})
                }});
                window.location.reload();
            }} catch (e) {{
                alert('Error: ' + e.message);
            }}
        }}
    </script>
</body>
</html>'''

    def _render_instances(self):
        """Render HTML for all running instances"""
        if not SANDBOXES:
            return ""

        html_parts = []
        for instance_id, sandbox in SANDBOXES.items():
            html_parts.append(f'''
            <div class="instance">
                <div class="instance-header">
                    <span>Instance #{instance_id}</span>
                    <div>
                        <a href="{sandbox.get('terminal_url', '#')}" target="_blank" style="color: #8b949e; margin-right: 12px; text-decoration: none;">Open in Tab</a>
                        <button class="btn-danger" onclick="stopInstance({instance_id})">Stop</button>
                    </div>
                </div>
                <iframe src="/vnc/{instance_id}" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
            </div>
            ''')
        return "\n".join(html_parts)


def get_tool_scripts():
    """Read all tool scripts from the tools directory"""
    from pathlib import Path
    tools_dir = Path(__file__).parent / "tools"
    scripts = {}
    for script_file in tools_dir.glob("*.sh"):
        scripts[script_file.name] = script_file.read_text()
    return scripts


# Default quiz URL for computer agent
DEFAULT_QUIZ_URL = "https://www.buzzfeed.com/luisdelvalle/this-is-not-the-quiz-youre-looking-for"


def create_sandbox(repo_url=None):
    """Create a Daytona sandbox with VNC desktop and terminal running OpenCode"""
    try:
        from daytona import Daytona, DaytonaConfig, CreateSandboxBaseParams
    except ImportError:
        raise Exception("daytona not installed. Run: pip install daytona")

    api_key = os.getenv("DAYTONA_API_KEY")
    api_url = os.getenv("DAYTONA_API_URL", "https://app.daytona.io/api")
    target = os.getenv("DAYTONA_TARGET", "us")

    if not api_key:
        raise Exception("DAYTONA_API_KEY not set in .env file")

    log("=" * 50)
    log("[1/4] Creating Daytona sandbox...")

    # Initialize Daytona client
    config = DaytonaConfig(
        api_key=api_key,
        api_url=api_url,
        target=target
    )
    daytona = Daytona(config)

    # Create public sandbox
    params = CreateSandboxBaseParams(public=True)
    sandbox = daytona.create(params)
    sandbox_id = sandbox.id
    log(f"       Sandbox ID: {sandbox_id}")

    # Start VNC desktop
    log("[2/4] Starting VNC desktop...")
    try:
        result = sandbox.computer_use.start()
        log(f"       VNC started: {result}")
    except Exception as e:
        log(f"       VNC error: {e}")

    log("       Waiting for VNC to initialize...")
    time.sleep(5)

    # Install OpenCode using npm
    log("[3/5] Installing OpenCode via npm...")
    try:
        result = sandbox.process.exec("npm install -g opencode-ai@latest", timeout=180)
        log(f"       OpenCode install: exit_code={result.exit_code}")
    except Exception as e:
        log(f"       Install error: {e}")

    # Open terminal via Daytona keyboard API
    log("[4/5] Opening terminal via Ctrl+Alt+T...")
    try:
        sandbox.computer_use.keyboard.hotkey("ctrl+alt+t")
        log("       Sent ctrl+alt+t")
        time.sleep(3)
    except Exception as e:
        log(f"       Hotkey error: {e}")

    # Click to focus terminal
    log("[5/6] Clicking to focus...")
    try:
        sandbox.computer_use.mouse.click(x=500, y=350, button="left")
        time.sleep(1)
        log("       Clicked")
    except Exception as e:
        log(f"       Click error: {e}")

    # Type opencode and press Enter (using Ctrl+M which works in terminals)
    log("[6/6] Typing opencode and pressing Enter...")
    try:
        # Click to focus
        sandbox.computer_use.mouse.click(x=500, y=350, button="left")
        time.sleep(0.5)

        # Type opencode
        sandbox.computer_use.keyboard.type("opencode")
        log("       Typed 'opencode'")
        time.sleep(0.3)

        # Ctrl+M = Enter in terminals (ASCII carriage return)
        sandbox.computer_use.keyboard.press("m", ["ctrl"])
        log("       Pressed Enter (Ctrl+M)")

    except Exception as e:
        log(f"       Error: {e}")

    time.sleep(2)

    # Get VNC URL
    terminal_url = None
    vnc_base_url = None
    vnc_token = None
    try:
        preview = sandbox.get_preview_link(6080)
        vnc_base_url = str(preview.url) if hasattr(preview, 'url') else str(preview)
        vnc_token = str(preview.token) if hasattr(preview, 'token') else None

        if vnc_base_url.endswith('/'):
            terminal_url = f"{vnc_base_url}vnc.html"
        else:
            terminal_url = f"{vnc_base_url}/vnc.html"

        if vnc_token:
            terminal_url += f"?token={vnc_token}"

        log(f"       VNC URL: {terminal_url}")
    except Exception as e:
        log(f"       VNC URL error: {e}")

    log("=" * 50)
    log("  DONE! Check VNC in browser.")
    log("=" * 50)

    return {
        "sandbox_id": sandbox_id,
        "terminal_url": terminal_url,
        "vnc_base_url": vnc_base_url,
        "vnc_token": vnc_token
    }


def stop_sandbox(sandbox_id):
    """Stop and delete a Daytona sandbox"""
    try:
        from daytona import Daytona, DaytonaConfig
    except ImportError:
        raise Exception("daytona not installed")

    api_key = os.getenv("DAYTONA_API_KEY")
    api_url = os.getenv("DAYTONA_API_URL", "https://app.daytona.io/api")
    target = os.getenv("DAYTONA_TARGET", "us")

    if not api_key:
        raise Exception("DAYTONA_API_KEY not set")

    config = DaytonaConfig(api_key=api_key, api_url=api_url, target=target)
    daytona = Daytona(config)

    print(f"Stopping sandbox: {sandbox_id}")
    daytona.delete(sandbox_id)
    print("Sandbox stopped")


def main():
    port = int(os.getenv("PORT", 8000))

    print("")
    print("=" * 50)
    print("  OpenCode Runner - Web UI")
    print("=" * 50)
    print("")
    print(f"  Open in browser: http://localhost:{port}")
    print("")
    print("  Make sure you have:")
    print("  1. DAYTONA_API_KEY in .env file")
    print("  2. pip install daytona-sdk python-dotenv")
    print("")
    print("=" * 50)
    print("")

    server = HTTPServer(("0.0.0.0", port), OpenCodeHandler)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
