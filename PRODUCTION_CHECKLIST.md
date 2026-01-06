# Production Deployment Checklist
## Habibi Swipe - Pre-Launch Configuration

**Last Updated:** January 2025

---

## 🔴 CRITICAL - Must Fix Before Production

### 1. **Google OAuth Configuration** ⚠️
**Location:** `app.config.js:16`

**Current Issue:**
- Hardcoded iOS client ID: `com.googleusercontent.apps.32648878488-c1epo6b84ibikaknfnu800f103p3j3cu.apps.googleusercontent.com`
- This appears to be a development/test client ID

**Action Required:**
1. **Create Production OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a **new OAuth 2.0 Client ID** for production
   - Application type: **iOS** (for iOS app)
   - Bundle ID: `com.habibiswipe.app`
   - Copy the Client ID (the part after `com.googleusercontent.apps.`)

2. **Update `app.config.js`:**
   ```javascript
   [
     "@react-native-google-signin/google-signin",
     {
       iosUrlScheme: "com.googleusercontent.apps.YOUR_PRODUCTION_CLIENT_ID",
     },
   ],
   ```

3. **Configure Supabase:**
   - Go to Supabase Dashboard > Authentication > Providers > Google
   - Update with production **Client ID** and **Client Secret**
   - Add production redirect URLs:
     - `habibiswipe://auth/callback`
     - `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`

4. **Update Google OAuth Console:**
   - Add authorized redirect URI: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
   - Add authorized JavaScript origins if needed

---

### 2. **Supabase Environment Variables** ⚠️
**Location:** `lib/supabase.ts:3-4`

**Current Issue:**
- No validation for missing environment variables
- App will crash silently if env vars are missing

**Action Required:**
1. **Verify Production Supabase Project:**
   - Ensure you're using production Supabase project (not development)
   - Get production `EXPO_PUBLIC_SUPABASE_URL`
   - Get production `EXPO_PUBLIC_SUPABASE_ANON_KEY`

2. **Add Environment Variable Validation:**
   ```typescript
   const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
   const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
   
   if (!SUPABASE_URL || !SUPABASE_ANON) {
     throw new Error(
       "Missing required Supabase environment variables. " +
       "Please check your .env file or EAS build configuration."
     );
   }
   ```

3. **Configure EAS Build:**
   - Create `eas.json` if it doesn't exist
   - Add environment variables to production build profile:
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_SUPABASE_URL": "your-production-url",
           "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-production-anon-key"
         }
       }
     }
   }
   ```

---

### 3. **CORS Security Configuration** ⚠️ CRITICAL SECURITY ISSUE
**Location:** All 25+ edge functions in `supabase/functions/`

**Current Issue:**
- `"Access-Control-Allow-Origin": "*"` allows ANY website to call your API
- Major security vulnerability

**Action Required:**
1. **Update ALL Edge Functions:**
   - Replace `"Access-Control-Allow-Origin": "*"` with:
   ```typescript
   const corsHeaders = {
     "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://habibiswipe.com",
     "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
     "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
   };
   ```

2. **Set Environment Variable in Supabase:**
   - Go to Supabase Dashboard > Project Settings > Edge Functions
   - Add secret: `ALLOWED_ORIGIN` = `https://habibiswipe.com`
   - Or set it per function deployment

3. **Files to Update (25 files):**
   - `supabase/functions/get_swipe_feed/index.ts`
   - `supabase/functions/get-chat-list/index.ts`
   - `supabase/functions/get-chat/index.ts`
   - `supabase/functions/edit-profile/index.ts`
   - `supabase/functions/get-liked-me/index.ts`
   - `supabase/functions/block-user/index.ts`
   - `supabase/functions/delete-account/index.ts`
   - `supabase/functions/get-viewers/index.ts`
   - `supabase/functions/send-message/index.ts`
   - `supabase/functions/get-my-likes/index.ts`
   - `supabase/functions/get-passed-on/index.ts`
   - `supabase/functions/send-compliment/index.ts`
   - `supabase/functions/revenuecat-webhook/index.ts`
   - `supabase/functions/activate_profile_boost/index.ts`
   - `supabase/functions/delete-message/index.ts`
   - `supabase/functions/reject-rematch/index.ts`
   - `supabase/functions/unmatch/index.ts`
   - `supabase/functions/accept-compliment/index.ts`
   - `supabase/functions/send_swipe/index.ts`
   - `supabase/functions/accept-rematch/index.ts`
   - `supabase/functions/check-user-status/index.ts`
   - `supabase/functions/decline-compliment/index.ts`
   - `supabase/functions/request-rematch/index.ts`
   - `supabase/functions/create-profile-view/index.ts`
   - `supabase/functions/get-unmatches/index.ts`

---

### 4. **RevenueCat Configuration** (If Using Subscriptions)
**Location:** `app/_layout.tsx:52-55` (currently commented out)

**Action Required (if you plan to use subscriptions):**
1. **Get Production RevenueCat API Key:**
   - Go to RevenueCat Dashboard
   - Navigate to API Keys
   - Copy your **Production** API key (NOT the test key)

2. **Uncomment and Update:**
   ```typescript
   import Purchases from 'react-native-purchases';
   
   const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!;
   
   if (Platform.OS === 'ios' || Platform.OS === 'android') {
     Purchases.configure({ apiKey: REVENUECAT_API_KEY });
   }
   ```

3. **Add to EAS Build Environment:**
   - Add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `eas.json` production profile

---

## 🟡 HIGH PRIORITY - Should Fix Before Launch

### 5. **App Version & Build Number**
**Location:** `app.config.js` or `app.json`

**Action Required:**
1. **Set Initial Version:**
   ```javascript
   ios: {
     bundleIdentifier: "com.habibiswipe.app",
     buildNumber: "1", // Increment for each App Store submission
   },
   android: {
     package: "com.habibiswipe.app",
     versionCode: 1, // Increment for each Play Store submission
   },
   version: "1.0.0", // Semantic versioning
   ```

2. **Version Strategy:**
   - `version`: User-facing version (e.g., "1.0.0", "1.1.0")
   - `buildNumber`/`versionCode`: Internal build counter (increment each submission)

---

### 6. **Error Tracking & Monitoring**
**Current Status:** Not implemented

**Action Required:**
1. **Integrate Sentry (Recommended):**
   ```bash
   npx expo install @sentry/react-native
   ```

2. **Configure in `app/_layout.tsx`:**
   ```typescript
   import * as Sentry from "@sentry/react-native";
   
   Sentry.init({
     dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
     environment: __DEV__ ? "development" : "production",
     enableInExpoDevelopment: false,
   });
   ```

3. **Add DSN to EAS Build Environment**

---

### 7. **Privacy Policy & Terms of Service Links**
**Location:** `app/(main)/profile/settings.tsx`

**Action Required:**
1. **Verify Links are Working:**
   - Privacy Policy: `https://habibiswipe.com/privacy-policy`
   - Terms of Service: `https://habibiswipe.com/terms-of-service`
   - Help & Support: `https://habibiswipe.com`

2. **Add to App Store Connect:**
   - Privacy Policy URL is **REQUIRED** for App Store submission
   - Add in App Store Connect > App Information

---

### 8. **Push Notifications Configuration**
**Location:** `lib/pushNotifications.ts`

**Action Required:**
1. **Verify Expo Project ID:**
   - Already configured in `app.config.js:8`: `projectId: "5401771d-589a-47b5-8e0c-e0850eea1cc3"`
   - This should be correct for production

2. **Test Push Notifications:**
   - Test on real iOS device
   - Test on real Android device
   - Verify notifications are received

---

## 🟢 MEDIUM PRIORITY - Nice to Have

### 9. **Analytics Integration**
**Recommendation:** Add analytics for user behavior tracking

**Options:**
- Mixpanel
- Amplitude
- Firebase Analytics
- PostHog

---

### 10. **App Store Assets**
**Required for Submission:**
- [ ] App screenshots (all required sizes for iOS and Android)
- [ ] App preview video (optional but recommended)
- [ ] App description (compelling, keyword-optimized)
- [ ] Keywords (iOS only)
- [ ] Support URL: `https://habibiswipe.com`
- [ ] Marketing URL (optional)
- [ ] Age rating information
- [ ] App icon (already configured)
- [ ] Splash screen (already configured)

---

### 11. **EAS Build Configuration**
**Action Required:**
1. **Create `eas.json` if it doesn't exist:**
   ```json
   {
     "cli": {
       "version": ">= 5.0.0"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal",
         "ios": {
           "simulator": true
         }
       },
       "production": {
         "env": {
           "EXPO_PUBLIC_SUPABASE_URL": "your-production-url",
           "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-production-key",
           "EXPO_PUBLIC_REVENUECAT_API_KEY": "your-revenuecat-key",
           "ALLOWED_ORIGIN": "https://habibiswipe.com"
         }
       }
     },
     "submit": {
       "production": {}
     }
   }
   ```

---

## 📋 PRE-LAUNCH CHECKLIST

### Configuration
- [ ] Google OAuth production credentials configured
- [ ] Supabase production project configured
- [ ] Environment variables validated
- [ ] CORS restricted to your domain
- [ ] RevenueCat production key (if using subscriptions)
- [ ] App version and build number set

### Security
- [ ] All API keys moved to environment variables
- [ ] CORS restricted (not `*`)
- [ ] Environment variable validation added
- [ ] No hardcoded secrets in code

### Testing
- [ ] Test on real iOS device
- [ ] Test on real Android device
- [ ] Test Google Sign-In flow
- [ ] Test email/OTP login flow
- [ ] Test all core features
- [ ] Test push notifications

### App Store Preparation
- [ ] Privacy Policy URL added to App Store Connect
- [ ] Terms of Service accessible
- [ ] App screenshots prepared
- [ ] App description written
- [ ] Age rating configured
- [ ] Support URL configured

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured (optional)
- [ ] Alerts set up for critical errors

---

## 🚀 DEPLOYMENT STEPS

### 1. **Fix Critical Issues:**
   - Update Google OAuth config
   - Fix CORS in all edge functions
   - Add environment variable validation
   - Configure production Supabase

### 2. **Build Production App:**
   ```bash
   # iOS
   eas build --platform ios --profile production
   
   # Android
   eas build --platform android --profile production
   ```

### 3. **Test Production Build:**
   - Install on real devices
   - Test all features
   - Verify environment variables

### 4. **Submit to App Stores:**
   ```bash
   # iOS
   eas submit --platform ios
   
   # Android
   eas submit --platform android
   ```

---

## 📝 NOTES

- **Never commit `.env` files** to version control
- **Always use production credentials** for production builds
- **Test thoroughly** on real devices before submission
- **Monitor error tracking** after launch
- **Keep environment variables secure** - use EAS secrets or Supabase secrets

---

## 🔗 HELPFUL LINKS

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)

---

**Priority Order:**
1. ✅ Google OAuth production config
2. ✅ CORS security fix
3. ✅ Environment variable validation
4. ✅ Supabase production setup
5. ✅ Error tracking
6. ✅ App Store assets

