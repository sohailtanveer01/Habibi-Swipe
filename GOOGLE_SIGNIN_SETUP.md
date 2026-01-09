# Google Sign-In Setup Guide

This guide will help you configure Google OAuth for the Habibi Swipe app.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. Access to your Supabase project dashboard

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External (for public apps)
   - App name: Habibi Swipe
   - User support email: Your email
   - Developer contact: Your email
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: Habibi Swipe Web Client
   - Authorized redirect URIs: Add the following:
     ```
     https://api.habibiswipe.com/auth/v1/callback
     ```
     **Note:** If you're using a custom domain (api.habibiswipe.com), use that instead of the default .supabase.co URL
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list and click to enable it
4. Enter your Google OAuth credentials:
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
5. Click **Save**

## Step 3: Configure Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Add your app's redirect URLs to the **Redirect URLs** list:
   ```
   habibiswipe://auth/callback
   ```
   This is the deep link URL that your app uses to handle OAuth callbacks
   
   **Important**: Use the exact format `habibiswipe://auth/callback` (not `habibiswipe://` or paths with parentheses)

## Step 4: Verify App Configuration

Your `app.json` and `app.config.js` should already have the Google Sign-In plugin configured:

```json
{
  "plugins": [
    [
      "@react-native-google-signin/google-signin",
      {
        "iosUrlScheme": "com.googleusercontent.apps.YOUR_CLIENT_ID"
      }
    ]
  ]
}
```

**Note**: Replace `YOUR_CLIENT_ID` with your actual Google Client ID (the part after `com.googleusercontent.apps.`)

## Step 5: Test Google Sign-In

1. Run your app: `npm start` or `expo start`
2. Navigate to the login screen
3. Click "Continue with Google"
4. You should be redirected to Google's sign-in page
5. After signing in, you should be redirected back to the app

## Troubleshooting

### "Redirect URI mismatch" Error

- Make sure you've added the Supabase callback URL to Google OAuth settings:
  ```
  https://api.habibiswipe.com/auth/v1/callback
  ```
  **Note:** If using a custom domain, use that instead of .supabase.co URL
- Make sure you've added your app's deep link URLs to Supabase Redirect URLs:
  ```
  habibiswipe://
  habibiswipe:///(auth)/login
  ```

### "Configuration Error" Alert

- Check that your Google OAuth credentials are correctly entered in Supabase
- Verify that Google Sign-In is enabled in Supabase Authentication > Providers

### App Not Redirecting Back

- Ensure your app's deep link scheme (`habibiswipe://`) is properly configured
- Check that `expo-linking` and `expo-web-browser` are installed
- For iOS, make sure the URL scheme is in your `Info.plist` (handled by Expo)

## Additional Notes

- The Google Sign-In flow will:
  1. Create a new user account if one doesn't exist
  2. Link to an existing account if the email matches
  3. Automatically sync the user's Google profile picture (if available)
  4. Redirect to onboarding if the user hasn't completed their profile
  5. Redirect to the main app if the user has completed onboarding

- For production, make sure to:
  - Use production OAuth credentials (not test credentials)
  - Add your production app bundle ID/package name to Google OAuth settings
  - Test on both iOS and Android devices

