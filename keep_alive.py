"""
Keep a Daytona sandbox alive by periodically pinging it.

Usage:
    python keep_alive.py [sandbox_id]
    python keep_alive.py  # reads from sandbox_info.txt

This prevents the sandbox from auto-stopping due to inactivity.
"""

import os
import sys
import time
from dotenv import load_dotenv

load_dotenv()

PING_INTERVAL = 300  # 5 minutes


def keep_alive(sandbox_id: str = None):
    """Keep a sandbox alive by periodically updating activity timestamp."""
    try:
        from daytona_sdk import Daytona, DaytonaConfig
    except ImportError:
        print("Error: daytona-sdk not installed. Run: pip install daytona-sdk")
        sys.exit(1)

    api_key = os.getenv("DAYTONA_API_KEY")
    if not api_key:
        print("Error: DAYTONA_API_KEY not found in environment")
        sys.exit(1)

    # Try to get sandbox_id from file if not provided
    if not sandbox_id:
        try:
            with open("sandbox_info.txt", "r") as f:
                for line in f:
                    if line.startswith("Sandbox ID:"):
                        sandbox_id = line.split(":")[1].strip()
                        break
        except FileNotFoundError:
            print("Error: No sandbox_id provided and sandbox_info.txt not found")
            sys.exit(1)

    if not sandbox_id:
        print("Error: Could not determine sandbox ID")
        sys.exit(1)

    config = DaytonaConfig(api_key=api_key)
    daytona = Daytona(config)

    print(f"Keeping sandbox {sandbox_id} alive...")
    print(f"Pinging every {PING_INTERVAL} seconds. Press Ctrl+C to stop.")

    try:
        while True:
            try:
                # Get sandbox to update activity timestamp
                sandbox = daytona.get(sandbox_id)
                # Run a simple command to keep it active
                sandbox.process.exec("echo 'keepalive'", timeout=10)
                print(f"[{time.strftime('%H:%M:%S')}] Ping successful")
            except Exception as e:
                print(f"[{time.strftime('%H:%M:%S')}] Ping failed: {e}")

            time.sleep(PING_INTERVAL)
    except KeyboardInterrupt:
        print("\nStopped keep-alive.")


if __name__ == "__main__":
    sandbox_id = sys.argv[1] if len(sys.argv) > 1 else None
    keep_alive(sandbox_id)
