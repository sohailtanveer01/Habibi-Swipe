# iOS Push Notification Icon - Blank Icon Fix

## Issue
iOS push notifications are showing a blank image instead of the app icon.

## Root Cause
iOS automatically uses your app icon for push notifications. If you see a blank icon, it's typically due to:

1. **Using Expo Go** - Expo Go always shows the Expo icon, not your app icon
2. **Icon not bundled in build** - The app icon wasn't included in the EAS build
3. **iOS caching** - iOS is caching an old/blank icon from a previous build
4. **Icon format issue** - The icon file might not be in the correct format or size

## Current Configuration

✅ **Icon File:** `./assets/images/icon.png` (1024x1024 PNG - verified)
✅ **iOS Configuration:** `ios.icon: "./assets/images/icon.png"` (in `app.config.js`)
✅ **Root Icon:** `icon: "./assets/images/icon.png"` (in `app.config.js`)

## Solutions

### Solution 1: Rebuild with EAS (Most Likely Fix)

If you're using **Expo Go**, the icon will **always be blank** because Expo Go uses the Expo icon. You **must use an EAS build** for your app icon to appear:

```bash
# Build iOS production app
eas build --platform ios --profile production
```

After building:
1. Install the new build on your device
2. Delete the old app first (to clear cache)
3. Install the new build
4. Test push notifications

### Solution 2: Clear iOS Icon Cache

iOS sometimes caches app icons. To clear:

1. **Delete the app** from your device completely
2. **Restart your device** (optional but recommended)
3. **Reinstall the app** with the new build
4. Test push notifications again

### Solution 3: Verify Icon Format

Ensure your icon meets Apple's requirements:

✅ **Format:** PNG
✅ **Size:** 1024x1024 pixels (current icon is verified at this size)
✅ **Color space:** RGB or sRGB
✅ **Alpha channel:** Can have transparency
✅ **File size:** Should be under 5MB (current: 334KB ✅)

Your current icon (`assets/images/icon.png`) meets all requirements.

### Solution 4: Verify App Icon in Xcode (If Building Locally)

If building locally with Xcode:

1. Open your project in Xcode
2. Select your project in the navigator
3. Go to **General** tab
4. Scroll to **App Icons and Launch Images**
5. Verify that all icon sizes are populated
6. If any are missing, drag your `icon.png` to the appropriate slots

## How iOS Push Notification Icons Work

- **iOS automatically uses your app icon** for push notifications
- There is **no separate notification icon configuration** for iOS
- The icon shown is the same as your home screen app icon
- iOS resizes the icon automatically to fit notification size

## Verification Steps

After rebuilding:

1. ✅ Install the new EAS build (not Expo Go)
2. ✅ Verify the app icon appears correctly on your home screen
3. ✅ Send a test push notification (from another account)
4. ✅ Check that the notification shows your app icon (not blank, not Expo icon)
5. ✅ If still blank, delete app, restart device, reinstall

## Common Mistakes

❌ **Using Expo Go** - Will always show Expo icon, not your app icon
❌ **Not rebuilding after icon changes** - Icon changes require a new build
❌ **Wrong icon path** - Must be relative to project root
❌ **Icon format issues** - Must be valid PNG, 1024x1024

## Current Status

- ✅ Icon file exists and is correctly sized (1024x1024 PNG)
- ✅ Icon path is correctly configured in `app.config.js`
- ✅ Icon file size is acceptable (334KB)
- ⚠️ **Action Required:** Rebuild app with EAS if using Expo Go
- ⚠️ **Action Required:** Clear iOS cache if icon still blank after rebuild

## Next Steps

1. **If using Expo Go:** Build with EAS immediately (`eas build --platform ios --profile production`)
2. **If using EAS build and still blank:** Delete app, restart device, reinstall
3. **If still blank:** Verify icon appears correctly on home screen - if not, there's a build issue

---

**Note:** iOS push notification icons cannot be customized separately from your app icon. If your app icon appears correctly on the home screen, push notifications should also show it correctly (may require a rebuild and cache clear).

