"""
OpenCode Runner on Daytona

This script creates a Daytona sandbox, installs OpenCode, and runs it
with a web interface you can access from anywhere.

Usage:
    python run_opencode.py [--repo <git-url>] [--keep-alive]

Requirements:
    - pip install daytona-sdk python-dotenv
    - DAYTONA_API_KEY in .env file
"""

import os
import sys
import time
import argparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_opencode_sandbox(repo_url: str = None, keep_alive: bool = False):
    """
    Create a Daytona sandbox with OpenCode running.

    Args:
        repo_url: Optional Git repo to clone into the sandbox
        keep_alive: If True, keeps the sandbox alive indefinitely

    Returns:
        dict with sandbox info and web URL
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

    print("Creating sandbox...")
    sandbox = daytona.create(
        language="python",  # Base environment
        # Auto-stop disabled if keep_alive, otherwise 60 min timeout
        auto_stop_interval=0 if keep_alive else 60
    )

    print(f"Sandbox created: {sandbox.id}")

    # Install OpenCode
    print("Installing OpenCode...")
    result = sandbox.process.exec(
        "curl -fsSL https://opencode.ai/install | bash",
        timeout=120
    )
    if result.exit_code != 0:
        print(f"Warning: OpenCode install returned code {result.exit_code}")
        print(result.output)

    # Add opencode to PATH (it installs to ~/.local/bin)
    sandbox.process.exec("echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc")

    # Clone repo if provided
    if repo_url:
        print(f"Cloning repository: {repo_url}")
        result = sandbox.process.exec(
            f"cd /home/daytona && git clone {repo_url} project",
            timeout=300
        )
        if result.exit_code != 0:
            print(f"Warning: Git clone returned code {result.exit_code}")
            print(result.output)
        workdir = "/home/daytona/project"
    else:
        workdir = "/home/daytona"

    # Create a session for the long-running OpenCode server
    print("Starting OpenCode web server...")
    session_id = "opencode-server"
    sandbox.process.create_session(session_id)

    # Start OpenCode web server in background
    # Using --hostname 0.0.0.0 to allow external access
    sandbox.process.execute_session_command(
        session_id,
        f"cd {workdir} && ~/.local/bin/opencode web --hostname 0.0.0.0 --port 4096",
        var_async=True  # Run async so we don't block
    )

    # Wait for server to start
    print("Waiting for OpenCode to start...")
    time.sleep(5)

    # Get the preview URL for the web interface
    web_url = sandbox.get_preview_link(4096)
    terminal_url = sandbox.get_preview_link(22222)

    print("\n" + "=" * 60)
    print("OpenCode is running!")
    print("=" * 60)
    print(f"\nWeb Interface URL: {web_url}")
    print(f"Terminal URL: {terminal_url}")
    print(f"Sandbox ID: {sandbox.id}")
    print(f"\nWorkspace: {workdir}")
    if keep_alive:
        print("\nSandbox will stay alive indefinitely.")
        print("To stop: use Daytona dashboard or run stop_sandbox.py")
    else:
        print("\nSandbox will auto-stop after 60 minutes of inactivity.")
    print("=" * 60)

    return {
        "sandbox_id": sandbox.id,
        "web_url": web_url,
        "terminal_url": terminal_url,
        "workdir": workdir
    }


def main():
    parser = argparse.ArgumentParser(
        description="Run OpenCode coding agent on Daytona cloud"
    )
    parser.add_argument(
        "--repo", "-r",
        help="Git repository URL to clone into the sandbox"
    )
    parser.add_argument(
        "--keep-alive", "-k",
        action="store_true",
        help="Keep sandbox alive indefinitely (no auto-stop)"
    )

    args = parser.parse_args()

    result = create_opencode_sandbox(
        repo_url=args.repo,
        keep_alive=args.keep_alive
    )

    # Save sandbox info for later reference
    with open("sandbox_info.txt", "w") as f:
        f.write(f"Sandbox ID: {result['sandbox_id']}\n")
        f.write(f"Web URL: {result['web_url']}\n")
        f.write(f"Terminal URL: {result['terminal_url']}\n")
        f.write(f"Workspace: {result['workdir']}\n")

    print("\nSandbox info saved to sandbox_info.txt")
    print(f"\nOpen this URL in your browser: {result['web_url']}")


if __name__ == "__main__":
    main()
