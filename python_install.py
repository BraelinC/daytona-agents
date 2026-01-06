"""
Install OpenCode using Python requests
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

    # Use Python to download directly
    install_script = '''
import urllib.request
import tarfile
import os
import ssl

# Create install directory
os.makedirs("/home/daytona/.local/bin", exist_ok=True)

# Try with default SSL context first
url = "https://github.com/anomalyco/opencode/releases/latest/download/opencode-linux-x64.tar.gz"
tar_path = "/tmp/opencode.tar.gz"

print(f"Downloading: {url}")

try:
    # Try without SSL verification first (for testing)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    urllib.request.urlretrieve(url, tar_path)
    print("Download completed!")

    # Extract
    print("Extracting...")
    with tarfile.open(tar_path, "r:gz") as tar:
        tar.extractall("/tmp")

    # Move binary
    os.rename("/tmp/opencode", "/home/daytona/.local/bin/opencode")
    os.chmod("/home/daytona/.local/bin/opencode", 0o755)

    # Verify
    print("Installed files:")
    print(os.listdir("/home/daytona/.local/bin"))

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
'''

    print("\nInstalling OpenCode using Python...")
    result = sandbox.process.code_run(install_script)
    print(f"Result: {result.result}")

    # Verify installation
    print("\nVerifying installation...")
    result = sandbox.process.code_run("import os; print(os.popen('/home/daytona/.local/bin/opencode --version 2>&1').read())")
    print(f"Version: {result.result}")

    # If version check works, launch in VNC
    if "not found" not in str(result.result).lower():
        print("\nLaunching OpenCode in VNC desktop...")
        launch_cmd = 'DISPLAY=:1 xterm -fa Monospace -fs 12 -geometry 120x40 -e "/home/daytona/.local/bin/opencode" &'
        sandbox.process.code_run(f"import os; os.system('{launch_cmd}')")

    print("\n" + "="*60)
    print("  VNC URL: https://6080-" + SANDBOX_ID + ".proxy.daytona.works")
    print("="*60)

if __name__ == "__main__":
    main()
