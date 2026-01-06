"""
Computer Use Agent - OpenCode controlling a browser via Daytona

This script:
1. Creates a Daytona sandbox with VNC desktop
2. Installs OpenCode and browser automation tools (xdotool, scrot)
3. Opens Firefox to the target quiz URL
4. Launches OpenCode in a terminal ready to control the browser

Usage:
    python computer_agent.py [--url URL] [--keep-alive]

Example:
    python computer_agent.py --url "https://www.buzzfeed.com/luisdelvalle/this-is-not-the-quiz-youre-looking-for"
"""

import os
import sys
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Default quiz URL
DEFAULT_QUIZ_URL = "https://www.buzzfeed.com/luisdelvalle/this-is-not-the-quiz-youre-looking-for"

# Tool scripts to upload
TOOLS_DIR = Path(__file__).parent / "tools"


def get_tool_scripts():
    """Read all tool scripts from the tools directory"""
    scripts = {}
    for script_file in TOOLS_DIR.glob("*.sh"):
        scripts[script_file.name] = script_file.read_text()
    return scripts


def create_computer_agent_sandbox(quiz_url=None, keep_alive=False):
    """Create a Daytona sandbox configured for computer use agent"""

    try:
        from daytona import Daytona, DaytonaConfig, CreateSandboxBaseParams
    except ImportError:
        print("ERROR: daytona not installed. Run: pip install daytona-sdk")
        sys.exit(1)

    api_key = os.getenv("DAYTONA_API_KEY")
    api_url = os.getenv("DAYTONA_API_URL", "https://app.daytona.io/api")
    target = os.getenv("DAYTONA_TARGET", "us")

    if not api_key:
        print("ERROR: DAYTONA_API_KEY not set in .env file")
        sys.exit(1)

    quiz_url = quiz_url or DEFAULT_QUIZ_URL

    print("=" * 60)
    print("  Computer Use Agent - OpenCode + Daytona")
    print("=" * 60)
    print(f"\n  Target URL: {quiz_url}\n")

    # Initialize Daytona client
    config = DaytonaConfig(
        api_key=api_key,
        api_url=api_url,
        target=target
    )
    daytona = Daytona(config)

    # Step 1: Create sandbox
    print("[1/7] Creating Daytona sandbox...")
    params = CreateSandboxBaseParams(public=True)
    sandbox = daytona.create(params)
    sandbox_id = sandbox.id
    print(f"       Sandbox ID: {sandbox_id}")

    # Step 2: Start VNC desktop
    print("[2/7] Starting VNC desktop...")
    try:
        result = sandbox.computer_use.start()
        print(f"       VNC started successfully")
    except Exception as e:
        print(f"       VNC start error: {e}")

    time.sleep(3)

    # Step 3: Install dependencies (xdotool, scrot, firefox)
    print("[3/7] Installing tools (xdotool, scrot, firefox)...")
    try:
        result = sandbox.process.exec(
            "apt-get update && apt-get install -y xdotool scrot firefox-esr xterm",
            timeout=180
        )
        print(f"       Tools installed")
    except Exception as e:
        print(f"       Install error: {e}")

    # Step 4: Install OpenCode
    print("[4/7] Installing OpenCode...")
    try:
        result = sandbox.process.exec(
            "curl -fsSL https://opencode.ai/install | bash",
            timeout=120
        )
        print(f"       OpenCode installed")
    except Exception as e:
        print(f"       OpenCode install error: {e}")

    # Add OpenCode to PATH
    try:
        sandbox.process.exec("echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc")
    except:
        pass

    # Step 5: Upload tool scripts
    print("[5/7] Uploading computer control tools...")
    try:
        # Create tools directory
        sandbox.process.exec("mkdir -p /home/daytona/tools")

        # Upload each script
        scripts = get_tool_scripts()
        for name, content in scripts.items():
            sandbox.fs.upload_file(f"/home/daytona/tools/{name}", content.encode())
            print(f"       Uploaded: {name}")

        # Make scripts executable
        sandbox.process.exec("chmod +x /home/daytona/tools/*.sh")
        print(f"       Made {len(scripts)} scripts executable")
    except Exception as e:
        print(f"       Upload error: {e}")

    # Step 6: Open browser to quiz URL
    print("[6/7] Opening Firefox to quiz URL...")
    try:
        # Launch Firefox in background
        sandbox.process.exec(f'DISPLAY=:1 firefox-esr "{quiz_url}" &')
        time.sleep(5)  # Give Firefox time to load
        print(f"       Firefox launched")
    except Exception as e:
        print(f"       Firefox launch error: {e}")

    # Step 7: Launch OpenCode in xterm
    print("[7/7] Launching OpenCode in terminal...")

    # Create a startup message for OpenCode
    startup_message = f'''
echo "=========================================="
echo "  Computer Use Agent Ready!"
echo "=========================================="
echo ""
echo "Target: {quiz_url}"
echo ""
echo "Available tools in /home/daytona/tools/:"
echo "  ./tools/screenshot.sh     - Take screenshot to /tmp/screen.png"
echo "  ./tools/click.sh X Y      - Click at coordinates"
echo "  ./tools/type_text.sh TEXT - Type text"
echo "  ./tools/scroll.sh up/down - Scroll the page"
echo "  ./tools/key.sh KEY        - Press a key (e.g., Return, ctrl+l)"
echo "  ./tools/screen_info.sh    - Get screen dimensions"
echo ""
echo "Example workflow:"
echo "  1. ./tools/screenshot.sh"
echo "  2. View /tmp/screen.png to see the page"
echo "  3. ./tools/click.sh 500 300 to click"
echo ""
echo "Starting OpenCode..."
echo ""
'''

    try:
        # Create startup script
        startup_script = f'''#!/bin/bash
cd /home/daytona
export PATH=$HOME/.local/bin:$PATH
export DISPLAY=:1
{startup_message}
exec opencode
'''
        sandbox.fs.upload_file("/home/daytona/start_agent.sh", startup_script.encode())
        sandbox.process.exec("chmod +x /home/daytona/start_agent.sh")

        # Launch xterm with the startup script
        sandbox.process.exec(
            'DISPLAY=:1 xterm -fa "Monospace" -fs 11 -geometry 100x35+50+50 -e "/home/daytona/start_agent.sh" &'
        )
        print(f"       OpenCode terminal launched")
    except Exception as e:
        print(f"       Launch error: {e}")

    time.sleep(2)

    # Get VNC URL
    vnc_url = None
    try:
        preview = sandbox.get_preview_link(6080)
        base_url = str(preview.url) if hasattr(preview, 'url') else str(preview)
        token = str(preview.token) if hasattr(preview, 'token') else None

        if base_url.endswith('/'):
            vnc_url = f"{base_url}vnc.html"
        else:
            vnc_url = f"{base_url}/vnc.html"

        if token:
            vnc_url += f"?token={token}"
    except Exception as e:
        print(f"       VNC URL error: {e}")
        try:
            vnc_url = sandbox.computer_use.get_base_vnc_url()
        except:
            pass

    # Print results
    print("\n" + "=" * 60)
    print("  Setup Complete!")
    print("=" * 60)
    print(f"\n  VNC Desktop (watch the agent):")
    print(f"  {vnc_url}")
    print(f"\n  Sandbox ID: {sandbox_id}")
    print("\n" + "-" * 60)
    print("  INSTRUCTIONS:")
    print("  1. Open the VNC URL in your browser")
    print("  2. You'll see Firefox with the quiz and an xterm with OpenCode")
    print("  3. In OpenCode, give it a task like:")
    print('     "Complete the BuzzFeed quiz. Take screenshots with')
    print('      ./tools/screenshot.sh, analyze them, and click answers')
    print('      with ./tools/click.sh X Y"')
    print("-" * 60 + "\n")

    # Save sandbox info
    with open("sandbox_info.txt", "w") as f:
        f.write(f"sandbox_id={sandbox_id}\n")
        f.write(f"vnc_url={vnc_url}\n")
        f.write(f"quiz_url={quiz_url}\n")
    print("  Sandbox info saved to sandbox_info.txt\n")

    if keep_alive:
        print("  Keep-alive mode enabled. Press Ctrl+C to stop.\n")
        try:
            while True:
                time.sleep(300)  # Ping every 5 minutes
                try:
                    sandbox.process.exec("echo ping")
                except:
                    pass
        except KeyboardInterrupt:
            print("\n  Stopping sandbox...")
            daytona.delete(sandbox_id)
            print("  Sandbox stopped.")
    else:
        print("  NOTE: Sandbox will auto-stop after ~60 minutes of inactivity.")
        print("  Run with --keep-alive to prevent this.\n")

    return {
        "sandbox_id": sandbox_id,
        "vnc_url": vnc_url,
        "quiz_url": quiz_url
    }


def main():
    parser = argparse.ArgumentParser(
        description="Launch a computer use agent with OpenCode on Daytona"
    )
    parser.add_argument(
        "--url",
        default=DEFAULT_QUIZ_URL,
        help=f"URL to open in the browser (default: BuzzFeed quiz)"
    )
    parser.add_argument(
        "--keep-alive",
        action="store_true",
        help="Keep the sandbox alive (prevents auto-stop)"
    )

    args = parser.parse_args()

    create_computer_agent_sandbox(
        quiz_url=args.url,
        keep_alive=args.keep_alive
    )


if __name__ == "__main__":
    main()
