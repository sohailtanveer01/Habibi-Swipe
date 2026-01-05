# Legal Documents Setup Guide

## Overview

I've created Privacy Policy and Terms of Service documents for Habibi Swipe. These documents are required for App Store submission and must be hosted on a publicly accessible website.

## Files Created

1. **`PRIVACY_POLICY.md`** - Comprehensive Privacy Policy covering:
   - Data collection and usage
   - Third-party services (Supabase, RevenueCat, Google)
   - User rights (including GDPR)
   - Data security and retention
   - Contact information

2. **`TERMS_OF_SERVICE.md`** - Complete Terms of Service covering:
   - User eligibility and account requirements
   - Acceptable use policy
   - Prohibited activities
   - Subscription terms
   - Intellectual property
   - Disclaimers and liability
   - Dispute resolution

## Next Steps

### 1. Customize the Documents

**Replace placeholder information in both documents:**

- `[your-email@habibiswipe.com]` → Your actual support email
- `[Your Company Address]` → Your company's physical address
- `[https://yourdomain.com]` → Your website URL
- `[Your Jurisdiction]` → Your legal jurisdiction (e.g., "State of California, United States")
- `[Arbitration Rules]` → Specific arbitration rules if applicable

**Review and customize:**
- Add any specific features or services unique to your app
- Adjust data collection sections if you collect additional information
- Update subscription terms if you have specific refund policies
- Add any additional disclaimers required by your jurisdiction

### 2. Host the Documents

**Option A: Host on Your Website (Recommended)**
1. Convert the markdown files to HTML or use a markdown renderer
2. Upload to your website at:
   - `https://yourdomain.com/privacy-policy`
   - `https://yourdomain.com/terms-of-service`
3. Ensure the pages are publicly accessible (no login required)
4. Test the URLs work on mobile browsers

**Option B: Use a Free Hosting Service**
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

**Option C: Use a Legal Document Service**
- TermsFeed
- iubenda
- Termly

### 3. Update the App

**Update `app/(main)/profile/settings.tsx`:**

Replace the placeholder URLs:
```typescript
const url = "https://yourdomain.com/terms-of-service"; // Replace with your actual URL
const url = "https://yourdomain.com/privacy-policy"; // Replace with your actual URL
```

### 4. App Store Connect Setup

**When submitting to App Store Connect:**

1. **Privacy Policy URL (REQUIRED):**
   - Go to App Store Connect → Your App → App Information
   - Add your Privacy Policy URL: `https://yourdomain.com/privacy-policy`
   - This is MANDATORY - your app will be rejected without it

2. **Terms of Service:**
   - While not always required in App Store Connect, it's best practice to include it
   - You can reference it in your app description
   - Ensure it's accessible from within the app

### 5. Legal Review (Recommended)

**Before publishing:**
- Review both documents with a lawyer familiar with:
  - App Store requirements
  - GDPR (if serving EU users)
  - CCPA (if serving California users)
  - Local laws in your jurisdiction
- Ensure compliance with all applicable regulations

### 6. Testing

**Before submission:**
- [ ] Test Privacy Policy link opens correctly in the app
- [ ] Test Terms of Service link opens correctly in the app
- [ ] Verify both URLs work on mobile browsers
- [ ] Ensure pages are mobile-friendly
- [ ] Check that all placeholder text has been replaced

## Important Notes

⚠️ **App Store Requirements:**
- Privacy Policy URL is **MANDATORY** for App Store submission
- Your app will be **REJECTED** if the Privacy Policy is not accessible
- The URL must be publicly accessible (no login required)

⚠️ **GDPR Compliance (EU Users):**
- If you serve users in the EU, ensure GDPR compliance
- Users must be able to:
  - Access their data
  - Request data deletion
  - Export their data
  - Withdraw consent

⚠️ **CCPA Compliance (California Users):**
- If you serve California users, ensure CCPA compliance
- Users must be able to opt-out of data sales (you don't sell data, but document this)

## Current Status

✅ Privacy Policy document created  
✅ Terms of Service document created  
✅ Settings screen updated to link to documents  
⚠️ **Action Required:** Replace placeholder URLs with your actual website URLs  
⚠️ **Action Required:** Host documents on your website  
⚠️ **Action Required:** Review with legal counsel (recommended)

## Quick Checklist

- [ ] Replace all placeholder text in both documents
- [ ] Host documents on your website
- [ ] Update URLs in `settings.tsx`
- [ ] Test links work in the app
- [ ] Add Privacy Policy URL to App Store Connect
- [ ] Review with legal counsel (recommended)
- [ ] Keep documents updated as your app evolves

---

**Note:** These documents are templates and should be reviewed by a legal professional before use. Laws vary by jurisdiction, and you are responsible for ensuring compliance with all applicable laws and regulations.

