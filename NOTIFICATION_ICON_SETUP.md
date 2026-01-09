# Custom Notification Icon Setup
## Habibi Swipe - Push Notification Icon Configuration

**Last Updated:** January 2025

---

## ✅ Configuration Complete

I've configured your app to use a custom notification icon instead of the Expo icon.

### What Was Changed:

1. **Added notification icon configuration** in `app.config.js`:
   ```javascript
   notification: {
     icon: "./assets/images/android-icon-monochrome.png",
     color: "#B8860B", // Gold color for notification icon
   },
   ```

2. **iOS:** Uses app icon automatically (no extra config needed)
3. **Android:** Uses `android-icon-monochrome.png` as notification icon

---

## 📱 How It Works

### iOS:
- ✅ **Automatically uses your app icon** (`icon.png`)
- ✅ No additional configuration needed
- ✅ Shows full-color app icon in notifications

### Android:
- ✅ Uses `android-icon-monochrome.png` as the small notification icon
- ✅ Gold color (`#B8860B`) for notification accent
- ✅ Icon appears in notification tray and status bar

---

## 🎨 Notification Icon Requirements

### Android Notification Icon:
- **Format:** PNG
- **Size:** 96x96 pixels (recommended)
- **Design:** 
  - Monochrome (single color, usually white)
  - Transparent background
  - Simple design (details get lost at small sizes)
  - Should be recognizable at 24x24 pixels

### Current Icon:
- **File:** `./assets/images/android-icon-monochrome.png`
- **Status:** ✅ Configured

---

## 🔄 To Apply Changes:

1. **Rebuild your app** (required for icon changes):
   ```bash
   # iOS
   eas build --platform ios --profile production
   
   # Android
   eas build --platform android --profile production
   ```

2. **Test on real device:**
   - Install the new build
   - Send a test push notification
   - Verify your custom icon appears (not Expo icon)

---

## 🎨 Customizing the Icon

If you want to use a different icon:

1. **Create/Update Icon:**
   - Create a monochrome PNG (white on transparent)
   - Save to `./assets/images/notification-icon.png` (or your preferred name)
   - Recommended size: 96x96 pixels

2. **Update `app.config.js`:**
   ```javascript
   notification: {
     icon: "./assets/images/notification-icon.png", // Your custom icon
     color: "#B8860B", // Gold accent color
   },
   ```

3. **Rebuild app** to apply changes

---

## ✅ Verification Checklist

After rebuilding:

- [ ] iOS notifications show app icon (automatic)
- [ ] Android notifications show custom icon (not Expo icon)
- [ ] Icon is clear and recognizable at small size
- [ ] Gold accent color appears correctly
- [ ] Test on multiple Android devices (if possible)

---

## 📝 Notes

- **Icon changes require a rebuild** - won't work in Expo Go
- **Android notification icons must be monochrome** - color icons won't work
- **iOS uses app icon automatically** - no separate notification icon needed
- **Test on real devices** - simulators may not show accurate notification icons

---

## 🔗 Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Android Notification Icons Guide](https://developer.android.com/develop/ui/views/notifications/notification-design-guide)

