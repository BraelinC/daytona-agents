"""
Setup sandbox with proper permissions
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

    sandbox = daytona.get(SANDBOX_ID)
    print(f"Sandbox state: {sandbox.state}")

    # Run commands with sudo
    commands = [
        "sudo apt-get update",
        "sudo apt-get install -y curl xterm",
        "curl -fsSL https://opencode.ai/install | bash",
        "echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc",
        "which opencode || ls ~/.local/bin/",
    ]

    for cmd in commands:
        print(f"\nRunning: {cmd}")
        result = sandbox.process.code_run(f"import os; print(os.popen('{cmd}').read())")
        if result.result:
            # Only show first 500 chars to avoid spam
            output = result.result[:500] if len(result.result) > 500 else result.result
            print(f"Output: {output}")

    # Launch xterm with OpenCode
    print("\nLaunching OpenCode in VNC...")
    sandbox.process.code_run(
        "import os; os.system('DISPLAY=:1 xterm -fa Monospace -fs 12 -geometry 120x40 -e \"export PATH=$HOME/.local/bin:$PATH && opencode\" &')"
    )

    print("\n" + "="*60)
    print(f"  VNC URL: https://6080-{SANDBOX_ID}.proxy.daytona.works")
    print("="*60)

if __name__ == "__main__":
    main()
