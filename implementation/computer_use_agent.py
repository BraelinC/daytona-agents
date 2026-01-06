"""
Computer Use Agent - Implementation

Creates a Daytona sandbox with VNC desktop, installs OpenCode,
and launches it in a terminal ready for computer control tasks.

Usage:
    python implementation/computer_use_agent.py [--url URL] [--keep-alive]

See instruction/computer_use_agent.md for detailed documentation.
"""

import os
import sys
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Constants
TOOLS_DIR = Path(__file__).parent.parent / "tools"
DEFAULT_URL = "https://www.buzzfeed.com/luisdelvalle/this-is-not-the-quiz-youre-looking-for"


def log(msg: str):
    """Log message with timestamp"""
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")


def get_tool_scripts() -> dict:
    """Read all tool scripts from the tools directory"""
    scripts = {}
    if TOOLS_DIR.exists():
        for script_file in TOOLS_DIR.glob("*.sh"):
            scripts[script_file.name] = script_file.read_text()
    return scripts


def create_sandbox():
    """Create and configure a Daytona sandbox for computer use"""

    # Import Daytona SDK
    try:
        from daytona import Daytona, DaytonaConfig, CreateSandboxBaseParams
    except ImportError:
        log("ERROR: daytona not installed. Run: pip install daytona-sdk")
        sys.exit(1)

    # Check for API key
    api_key = os.getenv("DAYTONA_API_KEY")
    if not api_key:
        log("ERROR: DAYTONA_API_KEY not set in .env file")
        sys.exit(1)

    # Initialize Daytona client
    config = DaytonaConfig(
        api_key=api_key,
        api_url=os.getenv("DAYTONA_API_URL", "https://app.daytona.io/api"),
        target=os.getenv("DAYTONA_TARGET", "us")
    )
    daytona = Daytona(config)

    # Phase 1: Create sandbox
    log("[1/6] Creating Daytona sandbox...")
    params = CreateSandboxBaseParams(public=True)
    sandbox = daytona.create(params)
    log(f"       Sandbox ID: {sandbox.id}")

    # Phase 1: Start VNC desktop
    log("[2/6] Starting VNC desktop...")
    try:
        sandbox.computer_use.start()
        log("       VNC started")
    except Exception as e:
        log(f"       VNC error: {e}")

    log("       Waiting for desktop to initialize...")
    time.sleep(5)

    # Phase 2: Install OpenCode
    # ✅ BEST PRACTICE: Use npm instead of apt-get (permission issues)
    log("[3/6] Installing OpenCode via npm...")
    try:
        result = sandbox.process.exec("npm install -g opencode-ai@latest", timeout=180)
        log(f"       OpenCode installed (exit_code={result.exit_code})")
    except Exception as e:
        log(f"       Install error: {e}")

    # Phase 2: Upload tool scripts
    log("[4/6] Uploading tool scripts...")
    try:
        sandbox.process.exec("mkdir -p /home/daytona/tools")
        scripts = get_tool_scripts()
        for name, content in scripts.items():
            sandbox.fs.upload_file(f"/home/daytona/tools/{name}", content.encode())
            log(f"       Uploaded: {name}")
        sandbox.process.exec("chmod +x /home/daytona/tools/*.sh")
    except Exception as e:
        log(f"       Upload error: {e}")

    # Phase 3: Open terminal
    # ✅ BEST PRACTICE: Use Ctrl+Alt+T for xfce4 terminal
    log("[5/6] Opening terminal...")
    try:
        sandbox.computer_use.keyboard.hotkey("ctrl+alt+t")
        log("       Sent Ctrl+Alt+T")
        time.sleep(3)  # ✅ BEST PRACTICE: Wait for terminal to initialize
    except Exception as e:
        log(f"       Hotkey error: {e}")

    # Phase 3: Launch OpenCode
    log("[6/6] Launching OpenCode...")
    try:
        # ✅ BEST PRACTICE: Click to focus before typing
        sandbox.computer_use.mouse.click(x=500, y=350, button="left")
        time.sleep(0.5)

        # Type opencode
        sandbox.computer_use.keyboard.type("opencode")
        time.sleep(0.3)

        # ⚠️ CONSTRAINT: keyboard.press("Return") doesn't work
        # ✅ BEST PRACTICE: Use Ctrl+M for Enter
        sandbox.computer_use.keyboard.press("m", ["ctrl"])
        log("       OpenCode launched")
    except Exception as e:
        log(f"       Launch error: {e}")

    time.sleep(2)

    # Get VNC URL
    vnc_url = None
    try:
        preview = sandbox.get_preview_link(6080)
        base_url = str(preview.url) if hasattr(preview, 'url') else str(preview)
        token = str(preview.token) if hasattr(preview, 'token') else None

        vnc_url = f"{base_url.rstrip('/')}/vnc.html"
        if token:
            vnc_url += f"?token={token}"
    except Exception as e:
        log(f"       VNC URL error: {e}")

    return {
        "sandbox": sandbox,
        "sandbox_id": sandbox.id,
        "vnc_url": vnc_url,
        "daytona": daytona
    }


def open_browser(sandbox, url: str):
    """Open Firefox to a URL in the VNC desktop"""
    log(f"Opening browser to: {url}")
    try:
        # Open new terminal
        sandbox.computer_use.keyboard.hotkey("ctrl+alt+t")
        time.sleep(2)

        # Click to focus
        sandbox.computer_use.mouse.click(x=500, y=350, button="left")
        time.sleep(0.3)

        # Type firefox command
        sandbox.computer_use.keyboard.type(f"firefox {url}")
        time.sleep(0.3)

        # Press Enter (Ctrl+M)
        sandbox.computer_use.keyboard.press("m", ["ctrl"])
        log("       Firefox launched")
    except Exception as e:
        log(f"       Browser error: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Computer Use Agent - Control browser via Daytona VNC"
    )
    parser.add_argument(
        "--url",
        help="URL to open in browser"
    )
    parser.add_argument(
        "--keep-alive",
        action="store_true",
        help="Keep sandbox alive (prevents auto-stop)"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  Computer Use Agent")
    print("=" * 60)
    print()

    # Create sandbox
    result = create_sandbox()

    # Open browser if URL provided
    if args.url:
        open_browser(result["sandbox"], args.url)

    # Print results
    print()
    print("=" * 60)
    print("  Setup Complete!")
    print("=" * 60)
    print(f"\n  VNC Desktop: {result['vnc_url']}")
    print(f"  Sandbox ID:  {result['sandbox_id']}")
    print()
    print("  OpenCode is running in the terminal.")
    print("  Tool scripts are in /home/daytona/tools/")
    print()

    # Save sandbox info
    downloads_dir = Path(__file__).parent.parent / "downloads"
    downloads_dir.mkdir(exist_ok=True)
    info_file = downloads_dir / "sandbox_info.txt"
    with open(info_file, "w") as f:
        f.write(f"sandbox_id={result['sandbox_id']}\n")
        f.write(f"vnc_url={result['vnc_url']}\n")
    print(f"  Saved to: {info_file}")
    print()

    # Keep alive mode
    if args.keep_alive:
        print("  Keep-alive mode. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(300)
                result["sandbox"].process.exec("echo ping")
        except KeyboardInterrupt:
            print("\n  Stopping sandbox...")
            result["daytona"].delete(result["sandbox_id"])
            print("  Done.")
    else:
        print("  Sandbox will auto-stop after ~60 minutes.")
        print("  Use --keep-alive to prevent this.")


if __name__ == "__main__":
    main()
