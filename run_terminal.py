"""
OpenCode Terminal Runner on Daytona

Creates a Daytona sandbox with TMUX + OpenCode, accessible via web terminal.
You get a browser-based terminal where you can manage multiple panes/windows.

Usage:
    python run_terminal.py [--repo <git-url>] [--keep-alive]

Requirements:
    - pip install daytona-sdk python-dotenv
    - DAYTONA_API_KEY in .env file
"""

import os
import sys
import time
import argparse
import webbrowser
from dotenv import load_dotenv

load_dotenv()


def create_terminal_sandbox(repo_url: str = None, keep_alive: bool = False):
    """
    Create a Daytona sandbox with TMUX and OpenCode ready to use.
    """
    try:
        from daytona_sdk import Daytona, DaytonaConfig
    except ImportError:
        print("Error: daytona-sdk not installed. Run: pip install daytona-sdk")
        sys.exit(1)

    api_key = os.getenv("DAYTONA_API_KEY")
    if not api_key:
        print("Error: DAYTONA_API_KEY not found in environment")
        print("Get your API key from: https://app.daytona.io")
        sys.exit(1)

    print("Initializing Daytona client...")
    config = DaytonaConfig(api_key=api_key)
    daytona = Daytona(config)

    print("Creating sandbox (this takes ~1-2 seconds)...")
    sandbox = daytona.create(
        language="python",
        auto_stop_interval=0 if keep_alive else 60
    )
    print(f"Sandbox ID: {sandbox.id}")

    # Install tmux and OpenCode
    print("Installing tmux...")
    sandbox.process.exec("apt-get update && apt-get install -y tmux", timeout=120)

    print("Installing OpenCode...")
    result = sandbox.process.exec(
        "curl -fsSL https://opencode.ai/install | bash",
        timeout=120
    )

    # Add to PATH
    sandbox.process.exec(
        "echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc && "
        "echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.profile"
    )

    # Clone repo if provided
    if repo_url:
        print(f"Cloning repository: {repo_url}")
        sandbox.process.exec(
            f"cd /home/daytona && git clone {repo_url} project",
            timeout=300
        )
        workdir = "/home/daytona/project"
    else:
        workdir = "/home/daytona"

    # Create a tmux session with OpenCode ready
    print("Setting up tmux session...")

    # Create tmux config for better experience
    tmux_conf = """
# Better prefix key
set -g prefix C-a
bind C-a send-prefix

# Mouse support
set -g mouse on

# Easier splits
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# Status bar
set -g status-style bg=blue,fg=white
set -g status-left '[#S] '
set -g status-right '%H:%M'

# Start windows at 1
set -g base-index 1
setw -g pane-base-index 1
"""

    sandbox.fs.upload_file(
        "/home/daytona/.tmux.conf",
        tmux_conf.encode()
    )

    # Create a startup script
    startup_script = f"""#!/bin/bash
export PATH=$HOME/.local/bin:$PATH
cd {workdir}

# Create tmux session with multiple windows
tmux new-session -d -s main -n opencode
tmux send-keys -t main:opencode 'cd {workdir} && opencode' Enter

# Create a second window for shell
tmux new-window -t main -n shell
tmux send-keys -t main:shell 'cd {workdir}' Enter

# Create third window for git/misc
tmux new-window -t main -n git
tmux send-keys -t main:git 'cd {workdir} && git status 2>/dev/null || echo "Not a git repo"' Enter

# Go back to opencode window
tmux select-window -t main:opencode

echo ""
echo "============================================"
echo "  TMUX session 'main' is ready!"
echo "============================================"
echo ""
echo "  Attach with: tmux attach -t main"
echo ""
echo "  Windows:"
echo "    1. opencode - OpenCode TUI"
echo "    2. shell    - General shell"
echo "    3. git      - Git operations"
echo ""
echo "  TMUX shortcuts (prefix is Ctrl+A):"
echo "    Ctrl+A |   - Split vertical"
echo "    Ctrl+A -   - Split horizontal"
echo "    Ctrl+A 1/2/3 - Switch windows"
echo "    Ctrl+A d   - Detach"
echo ""
echo "============================================"
"""

    sandbox.fs.upload_file(
        "/home/daytona/start_opencode.sh",
        startup_script.encode()
    )
    sandbox.process.exec("chmod +x /home/daytona/start_opencode.sh")

    # Run the startup script to create tmux session
    sandbox.process.create_session("tmux-setup")
    sandbox.process.execute_session_command(
        "tmux-setup",
        "bash /home/daytona/start_opencode.sh",
        var_async=True
    )

    time.sleep(3)

    # Get terminal URL
    terminal_url = sandbox.get_preview_link(22222)

    # Print results
    print("\n" + "=" * 60)
    print("  SANDBOX READY!")
    print("=" * 60)
    print(f"""
  Terminal URL: {terminal_url}

  Open the terminal URL, then run:

    tmux attach -t main

  This gives you 3 windows:
    [1] opencode - OpenCode TUI (coding agent)
    [2] shell    - General terminal
    [3] git      - Git operations

  Switch windows: Ctrl+A then 1, 2, or 3
  Split pane:     Ctrl+A then | or -
  Detach:         Ctrl+A then d

  Sandbox ID: {sandbox.id}
  Workspace:  {workdir}
""")
    if keep_alive:
        print("  Sandbox will stay alive indefinitely.")
    else:
        print("  Sandbox auto-stops after 60 min of inactivity.")
    print("=" * 60)

    return {
        "sandbox_id": sandbox.id,
        "terminal_url": terminal_url,
        "workdir": workdir
    }


def main():
    parser = argparse.ArgumentParser(
        description="Run OpenCode in Daytona with TMUX (web terminal)"
    )
    parser.add_argument(
        "--repo", "-r",
        help="Git repository URL to clone"
    )
    parser.add_argument(
        "--keep-alive", "-k",
        action="store_true",
        help="Keep sandbox alive indefinitely"
    )
    parser.add_argument(
        "--open", "-o",
        action="store_true",
        help="Automatically open terminal in browser"
    )

    args = parser.parse_args()

    result = create_terminal_sandbox(
        repo_url=args.repo,
        keep_alive=args.keep_alive
    )

    # Save info
    with open("sandbox_info.txt", "w") as f:
        f.write(f"Sandbox ID: {result['sandbox_id']}\n")
        f.write(f"Terminal URL: {result['terminal_url']}\n")
        f.write(f"Workspace: {result['workdir']}\n")

    print("\nSaved to sandbox_info.txt")

    if args.open:
        print("Opening browser...")
        webbrowser.open(result['terminal_url'])
    else:
        print(f"\nOpen this URL: {result['terminal_url']}")


if __name__ == "__main__":
    main()
