"""
Download OpenCode locally and upload to sandbox
"""
import os
import urllib.request
import tempfile
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

    # Download locally first
    url = "https://github.com/anomalyco/opencode/releases/latest/download/opencode-linux-x64.tar.gz"
    print(f"\nDownloading locally: {url}")

    with tempfile.TemporaryDirectory() as tmpdir:
        tar_path = os.path.join(tmpdir, "opencode.tar.gz")

        try:
            urllib.request.urlretrieve(url, tar_path)
            print(f"Downloaded to: {tar_path}")
            print(f"File size: {os.path.getsize(tar_path)} bytes")

            # Extract locally
            import tarfile
            with tarfile.open(tar_path, "r:gz") as tar:
                tar.extractall(tmpdir)

            binary_path = os.path.join(tmpdir, "opencode")
            print(f"Binary extracted: {binary_path}")
            print(f"Binary size: {os.path.getsize(binary_path)} bytes")

            # Read binary
            with open(binary_path, "rb") as f:
                binary_content = f.read()

            # Upload to sandbox using fs API
            print("\nUploading to sandbox...")

            # First create the directory
            sandbox.process.code_run("import os; os.makedirs('/home/daytona/.local/bin', exist_ok=True)")

            # Upload file using fs.write
            sandbox.fs.write("/home/daytona/.local/bin/opencode", binary_content)
            print("File uploaded!")

            # Make executable
            sandbox.process.code_run("import os; os.chmod('/home/daytona/.local/bin/opencode', 0o755)")

            # Verify
            result = sandbox.process.code_run("import os; print(os.listdir('/home/daytona/.local/bin'))")
            print(f"Files in .local/bin: {result.result}")

            result = sandbox.process.code_run("import os; print(os.popen('/home/daytona/.local/bin/opencode --version 2>&1').read())")
            print(f"Version: {result.result}")

            # Launch in VNC
            print("\nLaunching OpenCode in VNC desktop...")
            sandbox.process.code_run("import os; os.system('DISPLAY=:1 xterm -fa Monospace -fs 12 -geometry 120x40 -e \"/home/daytona/.local/bin/opencode\" &')")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "="*60)
    print("  VNC URL: https://6080-" + SANDBOX_ID + ".proxy.daytona.works")
    print("="*60)

if __name__ == "__main__":
    main()
