# Whisk API Token Setup

Instead of complex browser automation, we use direct API calls to Whisk using your authentication token.

## Getting Your Token (5 minutes)

### Step 1: Open Whisk in Your Browser
1. Navigate to https://labs.google.com/whisk (or https://whisk.google.com)
2. Log into your Google account if needed
3. Press **F12** to open DevTools
4. Click the **Network** tab

### Step 2: Generate a Test Image
1. In Whisk, enter any prompt (e.g., "a beautiful sunset")
2. Click generate
3. Watch the Network tab for requests

### Step 3: Find the API Request
Look for a request named something like:
- `generate`
- `generate.image`
- `create`
- Or similar (POST request to an API endpoint)

Click on that request to view details.

### Step 4: Extract Token and Endpoint

#### Authorization Token
1. In the request details, find the **Headers** section
2. Look for `Authorization` header
3. Copy the value after "Bearer " (without "Bearer " itself)
   - Example: If you see `Authorization: Bearer abc123xyz...`
   - Copy only: `abc123xyz...`

Alternatively, look in the **Cookies** section for auth tokens.

#### API Endpoint
1. Note the **Request URL** from the General section
2. Example: `https://labs.google.com/api/whisk/generate`
3. We need both the base URL and the endpoint path

### Step 5: Add to .env

Add these to your `.env` file:

```bash
# Whisk API Configuration
WHISK_API_TOKEN=your_token_here
WHISK_API_BASE_URL=https://labs.google.com
WHISK_API_ENDPOINT=/api/whisk/generate
```

### Step 6: Test

Run the test script:
```bash
npm run test:whisk
```

If successful, you'll see:
```
✅ Whisk API token is valid
✅ Generated test image successfully
```

## Token Expiration

- Tokens may expire after some time (hours/days/weeks)
- If you get 401 Unauthorized errors, repeat these steps to get a fresh token
- Consider this a temporary solution until official API access is available

## Request Format

Once we have your actual request details, we'll update the API client to match the exact format Whisk expects.

Common fields to look for in the request payload:
- `prompt` - The text description
- `aspectRatio` or `aspect_ratio` - Image dimensions
- `numImages` or `num_images` - Count
- `model` - Which model to use
- Other parameters specific to Whisk
