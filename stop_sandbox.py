"""
Stop a running Daytona sandbox.

Usage:
    python stop_sandbox.py <sandbox_id>
    python stop_sandbox.py  # reads from sandbox_info.txt
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()


def stop_sandbox(sandbox_id: str = None):
    """Stop a Daytona sandbox."""
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
            print("Usage: python stop_sandbox.py <sandbox_id>")
            sys.exit(1)

    if not sandbox_id:
        print("Error: Could not determine sandbox ID")
        sys.exit(1)

    print(f"Stopping sandbox: {sandbox_id}")

    config = DaytonaConfig(api_key=api_key)
    daytona = Daytona(config)

    try:
        daytona.delete(sandbox_id)
        print("Sandbox stopped and deleted successfully.")
    except Exception as e:
        print(f"Error stopping sandbox: {e}")
        sys.exit(1)


if __name__ == "__main__":
    sandbox_id = sys.argv[1] if len(sys.argv) > 1 else None
    stop_sandbox(sandbox_id)
