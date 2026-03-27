#!/usr/bin/env python3
"""
Validation script for HeyGen automation setup.
Checks Python version, dependencies, and Chrome profile.
Exit code 0 = ready, 1 = setup incomplete.
"""

import sys
import os
from pathlib import Path

def check_python_version():
    """Verify Python 3.8+"""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✅ Python version: {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"❌ Python version: {version.major}.{version.minor}.{version.micro} (requires 3.8+)")
        return False

def check_playwright():
    """Verify Playwright installed"""
    try:
        import playwright
        print(f"✅ Playwright installed: {playwright.__version__}")
        return True
    except ImportError:
        print("❌ Playwright not installed")
        print("   Fix: pip install playwright && playwright install chromium")
        return False

def check_chrome_profile():
    """Verify HeyGen Chrome profile exists"""
    profile_path = Path(__file__).parent / "heygen-chrome-profile"
    if profile_path.exists():
        print(f"✅ Chrome profile exists: {profile_path}")
        return True
    else:
        print(f"❌ Chrome profile missing: {profile_path}")
        print("   Fix: python setup_profile.py")
        return False

def check_script_files():
    """Verify required Python scripts exist"""
    script_dir = Path(__file__).parent
    required_files = [
        "setup_profile.py",
        "heygen_automation.py",
        "requirements.txt"
    ]

    all_exist = True
    for filename in required_files:
        filepath = script_dir / filename
        if filepath.exists():
            print(f"✅ {filename} found")
        else:
            print(f"❌ {filename} missing")
            all_exist = False

    if not all_exist:
        print("\n⚠️  Clone the repository:")
        print("   cd integrations")
        print("   git clone https://github.com/marifaceless/heygen-web-automation.git heygen-automation")

    return all_exist

def main():
    print("🔍 Validating HeyGen Automation Setup\n")

    checks = [
        check_python_version(),
        check_playwright(),
        check_script_files(),
        check_chrome_profile()
    ]

    print("\n" + "="*50)
    if all(checks):
        print("✅ All checks passed - Ready for automated avatar generation")
        return 0
    else:
        print("❌ Setup incomplete - Fix errors above")
        return 1

if __name__ == "__main__":
    sys.exit(main())
