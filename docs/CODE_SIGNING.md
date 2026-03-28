# Code Signing Setup Guide

## Why Code Signing?

Without code signing, Windows SmartScreen will show:
- "Windows protected your PC" warning
- "Unknown publisher" message
- Users must click "More info" → "Run anyway"

With code signing:
- No SmartScreen warning
- Publisher name shown ("Obsidian News Desk")
- Higher user trust

## Certificate Options

### Option 1: Standard Code Signing Certificate
- **Provider:** DigiCert, Sectigo, GlobalSign
- **Cost:** $200-400/year
- **Validation:** Organization Validation (OV) required
- **Delivery:** 3-7 business days
- **Format:** .pfx file + password

### Option 2: EV Code Signing Certificate
- **Provider:** DigiCert, Sectigo
- **Cost:** $400-600/year
- **Validation:** Extended Validation (EV) - more strict
- **Delivery:** USB token (hardware)
- **Benefit:** Instant SmartScreen reputation (no waiting period)

### Option 3: Free Testing Certificate (NOT for production)
- Self-signed certificate for local testing only
- Users will still see SmartScreen warning
- Useful for validating build process

## Step-by-Step Setup

### 1. Purchase Certificate

1. Choose provider (recommended: DigiCert)
2. Complete organization validation (legal docs required)
3. Wait 3-7 days for approval
4. Download .pfx file + save password

### 2. Configure electron-builder

**File:** `electron-builder.yml`

```yaml
win:
  target: nsis
  icon: electron/build/icon.ico
  # NEW: Enable code signing
  certificateFile: certs/code-signing.pfx
  certificatePassword: ${env:CSC_KEY_PASSWORD}  # From environment variable
  signingHashAlgorithms:
    - sha256
  rfc3161TimeStampServer: http://timestamp.digicert.com
```

### 3. Store Certificate Securely

**DON'T commit certificate to git!**

```bash
# Create certs directory (ignored by git)
mkdir certs
echo "certs/" >> .gitignore

# Copy certificate
copy path\to\your-cert.pfx certs\code-signing.pfx
```

### 4. Set Environment Variable

**Windows:**
```cmd
# Temporary (current session)
set CSC_KEY_PASSWORD=your-password-here

# Permanent (for automated builds)
setx CSC_KEY_PASSWORD "your-password-here"
```

**PowerShell:**
```powershell
$env:CSC_KEY_PASSWORD="your-password-here"
```

### 5. Build Signed Installer

```bash
npm run electron:build

# Output: dist/Obsidian News Desk-Setup-1.0.0.exe (signed)
```

### 6. Verify Signature

**Option 1: Windows Properties**
- Right-click .exe → Properties
- Digital Signatures tab
- Should show your organization name

**Option 2: SignTool**
```cmd
signtool verify /pa "dist\Obsidian News Desk-Setup-1.0.0.exe"
```

## Testing Without Certificate

To test the build process without a certificate:

**File:** `electron-builder.yml`

```yaml
win:
  sign: null  # Disable signing
  signingHashAlgorithms: null
```

Build will succeed but installer will be unsigned.

## SmartScreen Reputation

**Important:** Even with a valid code signing certificate, new installers may still show SmartScreen warnings for the first few weeks. This is Microsoft's reputation system.

**How to build reputation:**
- Get 10-20+ users to download and run your installer
- No malware/PUP reports
- Wait 2-4 weeks
- SmartScreen will eventually whitelist your installer

**EV certificates bypass this** (instant reputation).

## Troubleshooting

### Error: "Certificate not found"
- Check certificate path in electron-builder.yml
- Ensure certificate file exists in certs/ directory

### Error: "Invalid password"
- Verify CSC_KEY_PASSWORD environment variable
- Check for typos in password

### Error: "Timestamp server unreachable"
- DigiCert server: http://timestamp.digicert.com
- Verisign server: http://timestamp.verisign.com/scripts/timstamp.dll
- Try alternative timestamp server

### Installer still shows warning after signing
- Normal for new certificates (reputation building)
- Verify signature is valid (Properties → Digital Signatures)
- Wait 2-4 weeks for SmartScreen to trust
