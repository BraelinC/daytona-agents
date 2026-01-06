"""
Install and launch OpenCode in the VNC desktop
"""
import os
import time
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
    print(f"State: {sandbox.state}")

    # Install OpenCode
    print("\nInstalling OpenCode...")
    result = sandbox.process.code_run(
        "import subprocess; subprocess.run('curl -fsSL https://opencode.ai/install | bash', shell=True)"
    )
    print(f"Install result: {result}")

    # Add to PATH
    print("\nAdding to PATH...")
    sandbox.process.code_run(
        "import subprocess; subprocess.run(\"echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc\", shell=True)"
    )

    # Install xterm if not present
    print("\nInstalling xterm...")
    sandbox.process.code_run(
        "import subprocess; subprocess.run('apt-get update && apt-get install -y xterm', shell=True)"
    )

    # Launch OpenCode in xterm on the VNC display
    print("\nLaunching OpenCode in VNC desktop...")
    launch_cmd = "DISPLAY=:1 xterm -fa 'Monospace' -fs 12 -geometry 120x40 -e 'export PATH=$HOME/.local/bin:$PATH && opencode' &"
    sandbox.process.code_run(
        f"import subprocess; subprocess.run(\"{launch_cmd}\", shell=True)"
    )

    print("\n" + "="*60)
    print("  OpenCode is now running in the VNC desktop!")
    print("="*60)
    print(f"\n  Open this URL in your browser:")
    print(f"  https://6080-{SANDBOX_ID}.proxy.daytona.works")
    print("\n  You should see an xterm window with OpenCode running.")
    print("="*60)

if __name__ == "__main__":
    main()
