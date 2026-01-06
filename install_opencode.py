"""
Install OpenCode using shell execution
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

    sandbox = daytona.get(SANDBOX_ID)
    print(f"Sandbox state: {sandbox.state}")

    # Try shell execution directly
    print("\nChecking if opencode is installed...")
    result = sandbox.process.code_run("import os; print(os.popen('which opencode || echo not_found').read())")
    print(f"Result: {result.result}")

    # Check what's in .local/bin
    print("\nChecking ~/.local/bin...")
    result = sandbox.process.code_run("import os; print(os.popen('ls -la ~/.local/bin 2>/dev/null || echo empty').read())")
    print(f"Result: {result.result}")

    # Try installing with wget instead
    print("\nTrying wget install...")
    result = sandbox.process.code_run("""
import subprocess
import os

# Install via go
cmd = '''
apt-get update && apt-get install -y golang xterm
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
go install github.com/opencode/opencode@latest 2>&1 || echo "go install failed"
ls -la $HOME/go/bin 2>/dev/null || echo "no go bin"
'''
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
""")
    print(f"Result: {result.result}")

    # Alternative: just open a terminal
    print("\nOpening terminal in VNC...")
    result = sandbox.process.code_run(
        "import os; os.system('DISPLAY=:1 xterm -fa Monospace -fs 14 -geometry 100x30 &')"
    )
    print(f"Terminal launched")

    print("\n" + "="*60)
    print(f"  VNC URL: https://6080-{SANDBOX_ID}.proxy.daytona.works")
    print("  A terminal window should be open in the VNC desktop.")
    print("  You can manually run: curl -fsSL https://opencode.ai/install | bash")
    print("="*60)

if __name__ == "__main__":
    main()
