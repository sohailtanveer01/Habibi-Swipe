# TestFlight + Production Configuration Guide
## How to Update Production Config While on TestFlight

**Yes, you can absolutely make these changes while your app is on TestFlight!** In fact, it's the **perfect place** to test production configurations before final App Store submission.

---

## ✅ What You Can Do Safely

### 1. **CORS Configuration** (Backend - No App Update Needed)
**Status:** ✅ **Can do immediately - no app rebuild required**

**Why:** CORS is configured in your Supabase Edge Functions (backend), not in the app bundle.

**Action:**
- Update all 25+ edge functions to restrict CORS
- Deploy updated functions to Supabase
- **All existing TestFlight users will immediately benefit** from the security fix
- No need to rebuild or resubmit the app

**Timeline:** Can be done right now, even while TestFlight is active

---

### 2. **Supabase Production Project** (Backend - No App Update Needed)
**Status:** ✅ **Can switch anytime - requires new build**

**Why:** You can use production Supabase for TestFlight testing (recommended).

**Action:**
- Switch to production Supabase project
- Update environment variables in EAS build
- Build new version for TestFlight with production Supabase
- Test thoroughly in TestFlight before App Store submission

**Timeline:** Can be done now, but requires new build for TestFlight

---

### 3. **Google OAuth Production Credentials** (Requires New Build)
**Status:** ✅ **Can update - requires new build**

**Options:**

**Option A: Use Production Credentials for TestFlight (Recommended)**
- Create production OAuth credentials
- Use the same credentials for both TestFlight and App Store
- Update `app.config.js` with production client ID
- Build new version for TestFlight
- Test Google Sign-In in TestFlight
- Same build can go to App Store

**Option B: Separate Credentials (Not Recommended)**
- Create separate TestFlight credentials (unnecessary complexity)
- Would need to switch again for App Store

**Recommended Approach:**
1. Create production Google OAuth credentials
2. Update `app.config.js` with production client ID
3. Configure Supabase with production credentials
4. Build new version: `eas build --platform ios --profile production`
5. Submit to TestFlight: `eas submit --platform ios`
6. Test Google Sign-In thoroughly
7. Once verified, same build can go to App Store

**Timeline:** Requires new build, but can test in TestFlight first

---

### 4. **Environment Variables + Validation** (Requires New Build)
**Status:** ✅ **Can add - requires new build**

**Action:**
1. Add validation to `lib/supabase.ts`
2. Create `eas.json` with production environment variables
3. Build new version with production env vars
4. Test in TestFlight
5. Verify all features work with production config

**Timeline:** Requires new build

---

## 📋 Recommended Strategy

### Phase 1: Backend Changes (No App Rebuild)
**Do These First - They Don't Require App Updates:**

1. ✅ **Fix CORS in all edge functions**
   - Update all 25+ functions
   - Deploy to Supabase
   - **Immediate security improvement for all users**

2. ✅ **Switch Supabase to production project**
   - Update Supabase dashboard settings
   - Configure production database
   - **Note:** Existing TestFlight users will need new build to connect

### Phase 2: App Configuration (Requires New Build)
**Do These Before Next TestFlight Build:**

1. ✅ **Add environment variable validation**
   - Update `lib/supabase.ts`
   - Create `eas.json` with production env vars

2. ✅ **Update Google OAuth to production**
   - Create production OAuth credentials
   - Update `app.config.js`
   - Configure Supabase with production credentials

3. ✅ **Build new version for TestFlight**
   ```bash
   eas build --platform ios --profile production
   ```

4. ✅ **Submit to TestFlight**
   ```bash
   eas submit --platform ios
   ```

5. ✅ **Test thoroughly in TestFlight**
   - Test Google Sign-In
   - Test email/OTP login
   - Test all features
   - Verify environment variables are correct

6. ✅ **Once verified, submit to App Store**
   - Same build that worked in TestFlight
   - No additional changes needed

---

## 🔧 EAS Build Configuration for TestFlight

Create `eas.json` with separate profiles:

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
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "your-production-url",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-production-key"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "your-production-url",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-production-key",
        "EXPO_PUBLIC_REVENUECAT_API_KEY": "your-revenuecat-key"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Strategy:**
- Use **`production`** profile for both TestFlight and App Store
- Same configuration = same build = tested before submission
- No surprises when submitting to App Store

---

## ⚠️ Important Considerations

### 1. **Existing TestFlight Users**
- If you change Supabase project or OAuth credentials, existing TestFlight users will need to update to the new build
- They won't be able to sign in with old credentials
- **Solution:** Build new version and push update to TestFlight

### 2. **Backward Compatibility**
- CORS changes are backward compatible (just more secure)
- Supabase project change requires new build
- OAuth credential change requires new build
- Environment variable changes require new build

### 3. **Testing Strategy**
- **Test in TestFlight first** with production config
- If something breaks, you catch it before App Store submission
- Once verified in TestFlight, same build goes to App Store

---

## 🚀 Step-by-Step Action Plan

### Week 1: Backend Security (No App Rebuild)
- [ ] Fix CORS in all 25+ edge functions
- [ ] Deploy updated functions to Supabase
- [ ] Verify CORS is restricted (test API calls)

### Week 2: App Configuration (New Build Required)
- [ ] Create production Google OAuth credentials
- [ ] Update `app.config.js` with production client ID
- [ ] Configure Supabase with production OAuth
- [ ] Add environment variable validation to `lib/supabase.ts`
- [ ] Create `eas.json` with production env vars
- [ ] Build new version: `eas build --platform ios --profile production`
- [ ] Submit to TestFlight: `eas submit --platform ios`

### Week 3: TestFlight Testing
- [ ] Test Google Sign-In in TestFlight
- [ ] Test email/OTP login
- [ ] Test all core features
- [ ] Verify production Supabase connection
- [ ] Verify environment variables
- [ ] Get feedback from TestFlight testers

### Week 4: App Store Submission
- [ ] Once verified in TestFlight, submit same build to App Store
- [ ] No additional changes needed
- [ ] Same build = already tested = confidence

---

## ✅ Benefits of This Approach

1. **Test Production Config Safely**
   - TestFlight is perfect for testing production settings
   - Catch issues before App Store submission

2. **No Surprises**
   - Same build that worked in TestFlight goes to App Store
   - Already tested with production credentials

3. **Security First**
   - CORS fix can be deployed immediately (backend only)
   - No app rebuild needed for security improvement

4. **Gradual Rollout**
   - Update backend first (CORS)
   - Then update app config
   - Test in TestFlight
   - Submit to App Store

---

## 📝 Summary

**Can you do these changes while on TestFlight?**
- ✅ **CORS:** Yes, immediately (backend only)
- ✅ **Supabase:** Yes, but requires new build
- ✅ **Google OAuth:** Yes, but requires new build
- ✅ **Environment Variables:** Yes, but requires new build

**Recommended Order:**
1. Fix CORS now (no rebuild needed)
2. Update app config (OAuth, env vars, Supabase)
3. Build new version for TestFlight
4. Test thoroughly in TestFlight
5. Submit same build to App Store

**Key Point:** TestFlight is the perfect place to test production configurations before App Store submission!

