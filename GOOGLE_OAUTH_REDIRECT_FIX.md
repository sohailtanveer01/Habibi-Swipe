# Fix Google OAuth Redirect URI Mismatch Error

## Problem: "400 redirect URI mismatch" Error

When you try to login via Google, you're getting this error because:
- Your app is now using the custom domain: `https://api.habibiswipe.com`
- Google OAuth redirects to: `https://api.habibiswipe.com/auth/v1/callback`
- But Google Cloud Console still has the old `.supabase.co` URL configured

---

## ✅ Solution: Update Google Cloud Console

### Step 1: Go to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with your OAuth credentials)
3. Navigate to **APIs & Services** > **Credentials**

### Step 2: Find Your Web Application Client ID

1. Find your **Web application** OAuth 2.0 Client ID
   - It should be named something like "Habibi Swipe Web Client"
   - Or look for the Client ID that's configured in Supabase Dashboard > Authentication > Providers > Google

### Step 3: Edit the Client ID

1. Click on the **Web application** Client ID to open it
2. Click **EDIT** button

### Step 4: Update Authorized Redirect URIs

1. Scroll down to **Authorized redirect URIs**
2. **ADD** the new custom domain redirect URI:
   ```
   https://api.habibiswipe.com/auth/v1/callback
   ```
3. **IMPORTANT:** You can keep the old `.supabase.co` URI as well, or remove it if you're fully migrated to the custom domain
4. Click **SAVE** at the bottom

### Step 5: Verify Both URLs Are Added

Make sure you have **AT LEAST** this redirect URI:
- ✅ `https://api.habibiswipe.com/auth/v1/callback`

You can optionally keep the old one for backward compatibility:
- `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` (optional)

---

## ✅ Also Verify Supabase Dashboard

### Step 1: Check Supabase Redirect URLs

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **URL Configuration**
4. Under **Redirect URLs**, make sure you have:
   ```
   habibiswipe://auth/callback
   ```

### Step 2: Verify Custom Domain is Active

1. Go to **Settings** > **API**
2. Check that your custom domain `api.habibiswipe.com` is listed and **Active**
3. Verify the SSL certificate is provisioned (should be automatic)

---

## 🔄 After Making Changes

### Wait a Few Minutes

Changes in Google Cloud Console can take 1-5 minutes to propagate.

### Test Again

1. Try logging in with Google again
2. The redirect URI mismatch error should be resolved

---

## 🆘 Still Getting the Error?

### Check 1: Verify Exact Redirect URI

The redirect URI must match **EXACTLY** (case-sensitive, including protocol):
- ✅ Correct: `https://api.habibiswipe.com/auth/v1/callback`
- ❌ Wrong: `http://api.habibiswipe.com/auth/v1/callback` (http vs https)
- ❌ Wrong: `https://api.habibiswipe.com/Auth/v1/callback` (capital A)
- ❌ Wrong: `https://api.habibiswipe.com/auth/v1/callback/` (trailing slash)

### Check 2: Check Your Environment Variable

Make sure your app is using the correct Supabase URL:
```bash
# Check your .env file or eas.json
EXPO_PUBLIC_SUPABASE_URL=https://api.habibiswipe.com
```

### Check 3: Check Supabase Environment

In Supabase Dashboard:
1. Go to **Settings** > **API**
2. Verify the **Project URL** shows your custom domain
3. If it's still showing `.supabase.co`, the custom domain might not be fully configured

### Check 4: Browser/Device Cache

1. Clear browser cache (if testing in browser)
2. Restart the app (if testing on device)
3. Try again

---

## 📋 Quick Checklist

- [ ] Added `https://api.habibiswipe.com/auth/v1/callback` to Google Cloud Console
- [ ] Saved changes in Google Cloud Console
- [ ] Verified `habibiswipe://auth/callback` is in Supabase Dashboard > Redirect URLs
- [ ] Verified custom domain is active in Supabase Dashboard
- [ ] Checked `EXPO_PUBLIC_SUPABASE_URL` is set to `https://api.habibiswipe.com`
- [ ] Waited 1-5 minutes for changes to propagate
- [ ] Tried logging in again

---

## 🔗 Quick Links

- [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
- [Supabase Dashboard - Authentication](https://supabase.com/dashboard/project/_/auth/url-configuration)
- [Supabase Dashboard - API Settings](https://supabase.com/dashboard/project/_/settings/api)

