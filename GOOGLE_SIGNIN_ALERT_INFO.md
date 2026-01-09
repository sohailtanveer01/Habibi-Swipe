# Google Sign-In Alert Information
## Understanding the "wants to use supabase.co" Alert

**Last Updated:** January 2025

---

## ⚠️ About the Alert

When users tap "Continue with Google", they see a system alert:
- **iOS:** "Habibi Swipe" wants to use "api.habibiswipe.com" to sign in
- **Android:** Similar system permission dialog

**This is a system security feature and cannot be completely removed.**

### Why "api.habibiswipe.com" and not "google.com"?

The OAuth flow works like this:
1. App opens **Supabase's OAuth URL** first (api.habibiswipe.com)
2. Supabase then redirects to Google
3. Google authenticates
4. Google redirects back to Supabase
5. Supabase redirects back to the app

The system alert shows the **first URL** that opens, which is Supabase's (not Google's directly). This is why you see "api.habibiswipe.com" instead of "google.com".

---

## 🔍 Why This Happens

1. **System Security:** iOS and Android require apps to ask permission before opening external URLs in a browser
2. **OAuth Flow:** Google Sign-In requires opening a browser to authenticate
3. **Security Feature:** This protects users from malicious apps opening URLs without permission

---

## 📱 Production vs Development

### In Expo Go / Development Build:
- Alert shows: **"expo"** or **"Habibi Swipe"** wants to use "supabase.co"
- This is expected behavior

### In Production Build:
- Alert shows: **"Habibi Swipe"** wants to use "supabase.co"
- The "expo" part disappears
- This is the final user experience

---

## ✅ What You Can Do

### 1. Build Production App (Recommended)

The alert will only show "Habibi Swipe" (not "expo") in production:

```bash
# Build production app
eas build --platform ios --profile production
eas build --platform android --profile production
```

### 2. Customize App Display Name

Ensure your app name is correct in `app.config.js`:

```javascript
expo: {
  name: "Habibi Swipe", // This is what shows in the alert
  // ...
}
```

### 3. Use Custom Domain (Already Done ✅)

You're already using `api.habibiswipe.com` instead of `supabase.co`, which is better for branding.

---

## 🚫 Why We Can't Remove It

1. **System Requirement:** iOS and Android require this permission for security
2. **OAuth Requirement:** Google Sign-In must open a browser
3. **User Protection:** Prevents malicious apps from opening URLs silently

---

## 💡 User Experience

### First Time:
- User sees the alert
- Taps "Continue" or "Allow"
- Browser opens for Google Sign-In
- User signs in
- Redirects back to app

### Subsequent Times:
- On iOS, the system may remember the choice
- On Android, it may ask again (depends on system settings)
- The alert is quick and non-intrusive

---

## 🔧 Technical Details

### Current Implementation:
```typescript
const result = await WebBrowser.openAuthSessionAsync(
  data.url,
  redirectUrl
);
```

### Why This Method:
- Required for OAuth flows
- Handles redirects properly
- Secure and reliable
- Works with Supabase Auth

### Alternatives (Not Recommended):
- ❌ `WebBrowser.openBrowserAsync` - Doesn't handle OAuth redirects
- ❌ In-app WebView - Security concerns, not recommended
- ❌ Native SDKs - More complex, same system alerts

---

## 📊 Impact on Users

### Positive:
- ✅ Users understand what's happening
- ✅ Transparent security process
- ✅ Standard OAuth experience (users are familiar with it)
- ✅ Only appears once (or infrequently)

### Considerations:
- ⚠️ Some users might be confused
- ⚠️ Extra tap required
- ⚠️ Cannot be customized beyond app name

---

## ✅ Best Practices

1. **Clear UI:** Make sure your "Continue with Google" button is clear
2. **User Education:** Consider adding a brief explanation if needed
3. **Production Build:** Always test in production builds, not Expo Go
4. **App Name:** Ensure app name is correct and professional

---

## 🎯 Summary

- **Cannot be removed:** System security requirement
- **Production builds:** Only show "Habibi Swipe" (not "expo")
- **Standard behavior:** All OAuth apps show similar alerts
- **User-friendly:** Quick, one-time permission request
- **Secure:** Protects users from malicious apps

---

## 📝 Notes

- The alert text is controlled by the operating system
- App name comes from `app.config.js` → `expo.name`
- Domain name comes from your Supabase URL
- This is the same experience users get with other apps (Instagram, Facebook, etc.)

---

## 🔗 Resources

- [Expo WebBrowser Documentation](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [iOS ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)
- [Android Custom Tabs](https://developer.chrome.com/docs/android/custom-tabs/)

---

**Bottom Line:** This alert is a standard, secure, and expected part of the OAuth flow. In production builds, it will only show "Habibi Swipe" and provides a transparent, secure authentication experience.

