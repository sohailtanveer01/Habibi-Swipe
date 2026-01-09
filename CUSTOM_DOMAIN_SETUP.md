# Custom Domain Setup Guide
## Habibi Swipe - Supabase Custom Domain Configuration

**Custom Domain:** `api.habibiswipe.com`

---

## ✅ What Needs to Be Updated

Since you've added `api.habibiswipe.com` as your Supabase custom domain, you need to update the following:

---

## 1. **Environment Variables** 🔴 CRITICAL

### Update `EXPO_PUBLIC_SUPABASE_URL`

**Location:** Environment variables (`.env`, EAS build config, local development)

**Current (old):**
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

**New:**
```
EXPO_PUBLIC_SUPABASE_URL=https://api.habibiswipe.com
```

### Where to Update:

1. **Local Development (`.env` file):**
   ```bash
   # Create or update .env file in project root
   EXPO_PUBLIC_SUPABASE_URL=https://api.habibiswipe.com
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. **EAS Build Config (`eas.json`):**
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_SUPABASE_URL": "https://api.habibiswipe.com",
           "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-production-key"
         }
       }
     }
   }
   ```

3. **TestFlight/Development Builds:**
   Update the same environment variables in your EAS build profiles.

---

## 2. **Google OAuth Configuration** 🔴 CRITICAL

### Update Google Cloud Console

**Action Required:** Update the authorized redirect URI in Google Cloud Console.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your **Web application** OAuth 2.0 Client ID
4. Click **Edit**
5. In **Authorized redirect URIs**, update:

   **Old:**
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   **New:**
   ```
   https://api.habibiswipe.com/auth/v1/callback
   ```

6. Click **Save**

---

## 3. **Supabase Dashboard Configuration** ✅

Supabase should automatically handle the custom domain for:
- ✅ Edge Functions (`https://api.habibiswipe.com/functions/v1/...`)
- ✅ Auth endpoints (`https://api.habibiswipe.com/auth/v1/...`)
- ✅ REST API (`https://api.habibiswipe.com/rest/v1/...`)
- ✅ Realtime (`wss://api.habibiswipe.com/realtime/v1/...`)

**Verify in Supabase Dashboard:**
1. Go to **Settings** > **API**
2. Check that your custom domain is listed and active
3. Ensure SSL certificate is provisioned (usually automatic)

---

## 4. **Edge Functions** ✅ Auto-Configured

**Good News:** Edge Functions use `Deno.env.get("SUPABASE_URL")` which Supabase automatically sets to your custom domain when configured. **No code changes needed!**

---

## 5. **App Code** ✅ Already Compatible

Your app code already uses environment variables correctly:
- `lib/supabase.ts` uses `process.env.EXPO_PUBLIC_SUPABASE_URL`
- `app/index.tsx` and `app/(auth)/signup.tsx` use `process.env.EXPO_PUBLIC_SUPABASE_URL` for Google OAuth

**No code changes needed** - just update the environment variable!

---

## 6. **Deep Links** ✅ No Changes

Deep links (`habibiswipe://auth/callback`) remain the same and work with custom domains.

---

## 📋 Verification Checklist

After making changes:

### Environment Variables:
- [ ] Updated `.env` file (local development)
- [ ] Updated `eas.json` production profile
- [ ] Updated any other EAS build profiles (preview, development)

### Google OAuth:
- [ ] Updated redirect URI in Google Cloud Console to `https://api.habibiswipe.com/auth/v1/callback`
- [ ] Removed old `.supabase.co` redirect URI (optional, but recommended)

### Supabase:
- [ ] Verified custom domain is active in Supabase Dashboard
- [ ] Tested authentication flow (email OTP, Google OAuth)
- [ ] Tested Edge Function calls
- [ ] Tested real-time subscriptions

### Testing:
- [ ] Test Google Sign-In flow
- [ ] Test email/OTP login
- [ ] Test Edge Function calls (swipe feed, chat, etc.)
- [ ] Test real-time updates (chat messages, likes, etc.)

---

## 🔧 Quick Fix Commands

### Update eas.json:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://api.habibiswipe.com"
      }
    }
  }
}
```

### Test Custom Domain:
```bash
# Test if custom domain is reachable
curl https://api.habibiswipe.com/rest/v1/

# Test Edge Function (replace with actual function name)
curl https://api.habibiswipe.com/functions/v1/get_swipe_feed
```

---

## ⚠️ Important Notes

1. **SSL Certificate:** Supabase automatically provisions SSL for custom domains. Wait a few minutes after adding the domain for SSL to activate.

2. **DNS Propagation:** After adding the custom domain in Supabase, it may take up to 48 hours for DNS to fully propagate globally (usually much faster).

3. **Old Domain:** The old `.supabase.co` domain will continue to work for backward compatibility, but you should update all references to use the custom domain.

4. **Build Cache:** After updating environment variables, you may need to clear build cache:
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

5. **Google OAuth:** Make sure to update BOTH the redirect URI in Google Cloud Console AND ensure Supabase Dashboard has the same callback URL configured.

---

## 🆘 Troubleshooting

### "Redirect URI mismatch" Error:
- Verify Google OAuth redirect URI is exactly: `https://api.habibiswipe.com/auth/v1/callback`
- Check Supabase Dashboard > Authentication > URL Configuration has the same URL
- Wait a few minutes after updating if DNS is still propagating

### "Failed to fetch" or Network Errors:
- Verify custom domain SSL is active in Supabase Dashboard
- Check DNS propagation: `nslookup api.habibiswipe.com`
- Ensure environment variable is set correctly

### Edge Functions Not Working:
- Edge Functions automatically use the custom domain via `Deno.env.get("SUPABASE_URL")`
- Verify Supabase Dashboard shows custom domain as active
- Check Edge Function logs in Supabase Dashboard

---

## 📝 Summary

**What Changed:**
- Supabase base URL: `https://YOUR_PROJECT_REF.supabase.co` → `https://api.habibiswipe.com`

**What Needs Manual Update:**
1. ✅ Environment variable: `EXPO_PUBLIC_SUPABASE_URL`
2. ✅ Google OAuth redirect URI in Google Cloud Console

**What's Automatic:**
- ✅ Edge Functions (uses `Deno.env.get("SUPABASE_URL")`)
- ✅ Supabase Dashboard configuration
- ✅ SSL certificate provisioning

**What Stays the Same:**
- ✅ App code (uses environment variables)
- ✅ Deep links (`habibiswipe://auth/callback`)
- ✅ API structure and endpoints

