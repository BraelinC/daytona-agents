"""
Test network connectivity and find working download method
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

    # Test various network connectivity
    tests = [
        "curl -I https://google.com 2>&1 | head -5",
        "curl -I https://api.github.com 2>&1 | head -5",
        "wget --spider https://github.com 2>&1",
        "python3 -c \"import urllib.request; print(urllib.request.urlopen('https://httpbin.org/ip').read())\"",
        "pip3 download opencode --no-deps -d /tmp 2>&1 | tail -5",
    ]

    for cmd in tests:
        print(f"\n--- Testing: {cmd[:50]}... ---")
        result = sandbox.process.code_run(f"import os; print(os.popen('{cmd}').read())")
        print(result.result if result.result else "(no output)")

    # Try pip install
    print("\n--- Trying pip install ---")
    result = sandbox.process.code_run("""
import subprocess
result = subprocess.run(['pip3', 'install', 'opencode', '--user'], capture_output=True, text=True)
print('STDOUT:', result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
print('STDERR:', result.stderr[-500:] if len(result.stderr) > 500 else result.stderr)
""")
    print(result.result)

if __name__ == "__main__":
    main()
