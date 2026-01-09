# How to Check Google OAuth Production Status

## Important: OAuth Client IDs Don't Have "Testing/Production" Labels

Google Cloud Console doesn't mark individual OAuth Client IDs as "Testing" or "Production". Instead, the status is determined by:

1. **OAuth Consent Screen Status** (Testing vs Published)
2. **Authorized Redirect URIs** (Development vs Production URLs)
3. **App Bundle ID/Package Name** (Development vs Production)

---

## Where to Check Your OAuth Status

### 1. Check OAuth Consent Screen Status

**Location:** Google Cloud Console → APIs & Services → OAuth consent screen

**What to Look For:**
- **"Testing"** = Only works for test users (up to 100 test users)
- **"Published"** = Available to all users (Production ready)

**How to Check:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Look at the top of the page - it will show:
   - **"Publishing status: Testing"** (with a warning banner)
   - OR **"Publishing status: In production"** (green checkmark)

**For Production:**
- Status should be **"In production"** or **"Published"**
- If it's "Testing", you need to publish it (requires verification if you have sensitive scopes)

---

### 2. Check Your OAuth Client ID Configuration

**Location:** Google Cloud Console → APIs & Services → Credentials

**Steps:**
1. Find your OAuth 2.0 Client ID: `32648878488-c1epo6b84ibikaknfnu800f103p3j3cu`
2. Click on it to view details
3. Check the following:

**For iOS App:**
- **Application type:** Should be "iOS"
- **Bundle ID:** Should match your production bundle ID: `com.habibiswipe.app`
- **App Store ID:** (Optional, but recommended for production)

**For Web Application (used by Supabase):**
- **Application type:** Should be "Web application"
- **Authorized redirect URIs:** Should include:
  ```
  https://api.habibiswipe.com/auth/v1/callback
  ```
  **Note:** If using a custom domain (api.habibiswipe.com), use that instead of the default .supabase.co URL

---

### 3. Check Authorized Redirect URIs

**What to Look For:**

**Development/Test URIs:**
- `http://localhost:*` (local development)
- `https://*.supabase.co/auth/v1/callback` (if using dev Supabase project)

**Production URIs:**
- `https://api.habibiswipe.com/auth/v1/callback` (custom domain)
- OR `https://YOUR_PRODUCTION_SUPABASE_REF.supabase.co/auth/v1/callback` (default domain)
- Should NOT include `localhost` or test URLs

---

## Current Status Assessment

Based on your Client ID: `32648878488-c1epo6b84ibikaknfnu800f103p3j3cu`

### Questions to Answer:

1. **OAuth Consent Screen:**
   - [ ] Is it "Testing" or "Published/In production"?
   - [ ] How many test users are added? (if Testing)

2. **Client ID Type:**
   - [ ] Is there an iOS client ID configured?
   - [ ] Is there a Web application client ID configured?
   - [ ] What Bundle ID is configured for iOS?

3. **Redirect URIs:**
   - [ ] What Supabase callback URL is configured?
   - [ ] Is it pointing to production or development Supabase?

---

## What Makes OAuth "Production Ready"?

### ✅ Production Ready If:
1. OAuth consent screen is **"Published"** or **"In production"**
2. iOS Client ID has production Bundle ID: `com.habibiswipe.app`
3. Web Client ID has production Supabase callback URL
4. No `localhost` or test URLs in redirect URIs
5. App has been verified (if using sensitive scopes)

### ⚠️ Not Production Ready If:
1. OAuth consent screen is **"Testing"**
2. Only test users can sign in (limited to 100)
3. Redirect URIs point to development/test environments
4. Bundle ID doesn't match production app

---

## How to Make It Production Ready

### Step 1: Publish OAuth Consent Screen

1. Go to **OAuth consent screen**
2. If status is "Testing":
   - Review all settings
   - Add any required scopes
   - Click **"PUBLISH APP"** button
   - Note: May require app verification if using sensitive scopes

### Step 2: Verify Client IDs

1. **iOS Client ID:**
   - Ensure Bundle ID is: `com.habibiswipe.app`
   - Add App Store ID (optional but recommended)

2. **Web Client ID (for Supabase):**
   - Ensure redirect URI is production Supabase URL
   - Remove any test/localhost URIs

### Step 3: Update App Configuration

1. Update `app.config.js` with production Client ID
2. Update Supabase Dashboard with production credentials
3. Test thoroughly before deploying

---

## Quick Checklist

- [ ] OAuth consent screen is "Published" (not "Testing")
- [ ] iOS Client ID has Bundle ID: `com.habibiswipe.app`
- [ ] Web Client ID has production Supabase callback URL
- [ ] No test/localhost URLs in redirect URIs
- [ ] App is verified (if required for sensitive scopes)

---

## Need Help?

If you're unsure about any of these settings, you can:
1. Share a screenshot of your OAuth consent screen status
2. Share the redirect URIs configured in your Web Client ID
3. Check if your app is working in TestFlight (if it works, credentials are likely fine)

