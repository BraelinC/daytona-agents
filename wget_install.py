"""
Install OpenCode using wget
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

    # Use wget to download
    install_script = """
import subprocess
import os

# Create install directory
os.makedirs('/home/daytona/.local/bin', exist_ok=True)

# Download using wget (follows redirects by default)
url = 'https://github.com/anomalyco/opencode/releases/latest/download/opencode-linux-x64.tar.gz'
print(f'Downloading from: {url}')

cmd = '''
cd /tmp && \\
rm -f opencode.tar.gz opencode && \\
wget -O opencode.tar.gz "https://github.com/anomalyco/opencode/releases/latest/download/opencode-linux-x64.tar.gz" && \\
tar -xzf opencode.tar.gz && \\
mv opencode /home/daytona/.local/bin/ && \\
chmod +x /home/daytona/.local/bin/opencode && \\
ls -la /home/daytona/.local/bin/
'''
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print('STDOUT:', result.stdout)
print('STDERR:', result.stderr[-1000:] if len(result.stderr) > 1000 else result.stderr)
print('Return code:', result.returncode)
"""

    print("\nInstalling OpenCode using wget...")
    result = sandbox.process.code_run(install_script)
    print(f"Result: {result.result}")

    # Verify installation
    print("\nVerifying installation...")
    result = sandbox.process.code_run("import os; print(os.popen('/home/daytona/.local/bin/opencode --version 2>&1').read())")
    print(f"Version: {result.result}")

    # Launch in VNC
    print("\nLaunching OpenCode in VNC desktop...")
    launch_cmd = 'DISPLAY=:1 xterm -fa Monospace -fs 12 -geometry 120x40 -e "/home/daytona/.local/bin/opencode" &'
    sandbox.process.code_run(f"import os; os.system('{launch_cmd}')")

    print("\n" + "="*60)
    print("  VNC URL: https://6080-" + SANDBOX_ID + ".proxy.daytona.works")
    print("="*60)

if __name__ == "__main__":
    main()
