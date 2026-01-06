"""
Start VNC desktop on existing Daytona sandbox
"""
import os
from dotenv import load_dotenv

load_dotenv()

SANDBOX_ID = "d6f494e6-8608-4f96-bacf-91493479ecd0"

def main():
    from daytona import Daytona, DaytonaConfig

    api_key = os.getenv("DAYTONA_API_KEY")
    api_url = os.getenv("DAYTONA_API_URL", "https://app.daytona.io/api")
    target = os.getenv("DAYTONA_TARGET", "us")

    config = DaytonaConfig(api_key=api_key, api_url=api_url, target=target)
    daytona = Daytona(config)

    print(f"Getting sandbox: {SANDBOX_ID}")
    sandbox = daytona.get(SANDBOX_ID)
    print(f"Sandbox state: {sandbox.state}")

    # Start VNC desktop
    print("\nStarting VNC desktop...")
    try:
        result = sandbox.computer_use.start()
        print(f"VNC started: {result.message if hasattr(result, 'message') else result}")
    except Exception as e:
        print(f"VNC start error: {e}")
        return

    # Get VNC URL using the proper SDK method
    print("\nGetting VNC URL...")
    try:
        vnc_url = sandbox.computer_use.get_base_vnc_url()
        print(f"VNC URL: {vnc_url}")
        print(f"\n{'='*50}")
        print(f"Open this URL in your browser to view VNC desktop:")
        print(f"{vnc_url}")
        print(f"{'='*50}\n")
    except Exception as e:
        print(f"get_base_vnc_url error: {e}")
        # Fallback: try preview link on port 6080
        print("\nFallback: trying preview link on port 6080...")
        try:
            preview = sandbox.get_preview_link(6080)
            url = str(preview.url) if hasattr(preview, 'url') else str(preview)
            print(f"VNC URL (fallback): {url}")
        except Exception as e2:
            print(f"Fallback failed: {e2}")

    # Check computer_use display info
    print("\nChecking display info...")
    try:
        info = sandbox.computer_use.display.get_info()
        print(f"Display info: {info}")
    except Exception as e:
        print(f"Display info error: {e}")

if __name__ == "__main__":
    main()
