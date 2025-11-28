# Deploying the Get Swipe Feed Edge Function

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

## Deployment Steps

1. **Link your Supabase project**:
   ```bash
   cd "/Users/sohailtanveer/Desktop/Habibi Swipe/Habibi_Swipe"
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   To find your project ref:
   - Go to your Supabase dashboard
   - Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
   - Or go to Settings > API and find your Project URL

2. **Deploy the functions**:
   ```bash
   supabase functions deploy get_swipe_feed
   supabase functions deploy get_likes
   ```

3. **Verify deployment**:
   - Go to your Supabase dashboard
   - Navigate to Edge Functions
   - You should see both `get_swipe_feed` and `get_likes` listed

## Testing

After deployment, the functions will be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/get_swipe_feed
https://YOUR_PROJECT_REF.supabase.co/functions/v1/get_likes
```

The app will automatically use these functions when you:
- Open the swipe screen (uses `get_swipe_feed`)
- Open the likes screen (uses `get_likes`)

## Troubleshooting

If you get authentication errors:
- Make sure your Supabase project has the correct environment variables set
- Check that the function has the right permissions in your Supabase dashboard

If profiles still don't show:
- Check the function logs in Supabase dashboard > Edge Functions > get_swipe_feed > Logs
- Verify both user profiles have completed onboarding
- Check that both users have at least one photo uploaded

