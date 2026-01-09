# Welcome Email Setup Guide
## Habibi Swipe - Onboarding Welcome Email Configuration

**Last Updated:** January 2025

---

## ✅ What Was Implemented

A welcome email is now automatically sent to users after they complete onboarding. The email includes:

- Personalized greeting with the user's name
- Welcome message
- Next steps guide
- Branded design matching Habibi Swipe theme (gold/black)

---

## 📧 Email Service Configuration

The welcome email function supports two email services:

### Option 1: Resend (Recommended) ⭐

**Why Resend?**
- Easy setup
- Great developer experience
- Free tier: 3,000 emails/month
- Good deliverability

**Setup Steps:**

1. **Sign up for Resend:**
   - Go to [resend.com](https://resend.com)
   - Create an account
   - Get your API key from the dashboard

2. **Configure in Supabase:**
   - Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Add the following secrets:
     ```
     RESEND_API_KEY=re_your_api_key_here
     FROM_EMAIL=welcome@habibiswipe.com
     FROM_NAME=Habibi Swipe
     EMAIL_SERVICE=resend
     ```

3. **Verify your domain (for production):**
   - In Resend dashboard, add and verify your domain (`habibiswipe.com`)
   - This improves deliverability and allows custom "from" addresses

---

### Option 2: SendGrid

**Setup Steps:**

1. **Sign up for SendGrid:**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Create an account
   - Create an API key with "Mail Send" permissions

2. **Configure in Supabase:**
   - Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Add the following secrets:
     ```
     SENDGRID_API_KEY=SG.your_api_key_here
     FROM_EMAIL=welcome@habibiswipe.com
     FROM_NAME=Habibi Swipe
     EMAIL_SERVICE=sendgrid
     ```

3. **Verify your domain (for production):**
   - In SendGrid dashboard, authenticate your domain
   - This improves deliverability

---

## 🚀 Deployment

### Step 1: Deploy the Edge Function

```bash
# From your project root
supabase functions deploy send-welcome-email
```

### Step 2: Set Environment Variables

In Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the required secrets (see configuration above)

### Step 3: Test

1. Complete onboarding with a test account
2. Check the email inbox for the welcome email
3. Verify the email looks correct and links work

---

## 📝 Email Content

The welcome email includes:

- **Subject:** "Welcome to Habibi Swipe! 🎉"
- **Personalized greeting** with user's name
- **Welcome message**
- **Next steps:**
  - Start swiping to discover potential matches
  - Complete your profile to increase visibility
  - Be authentic and respectful
- **Support links**
- **Branded design** (gold/black theme)

---

## 🔧 Customization

### Update Email Content

Edit `supabase/functions/send-welcome-email/index.ts`:

1. **Change subject line:**
   ```typescript
   subject: "Your Custom Subject Here",
   ```

2. **Update HTML content:**
   - Modify the `html` field in `sendEmailWithResend()` or `sendEmailWithSendGrid()`
   - Keep the gold (#B8860B) and black (#0A0A0A) color scheme

3. **Update text version:**
   - Modify the `text` field for plain text email clients

### Change "From" Email/Name

Update environment variables:
```
FROM_EMAIL=your-email@habibiswipe.com
FROM_NAME=Your Custom Name
```

---

## 🛡️ Preventing Duplicate Emails

Currently, the function sends an email every time it's called. To prevent duplicates:

### Option 1: Add Database Field (Recommended)

1. **Add a column to the `users` table:**
   ```sql
   ALTER TABLE users ADD COLUMN welcome_email_sent BOOLEAN DEFAULT FALSE;
   ```

2. **Update the edge function** to check this field:
   ```typescript
   // Check if welcome email was already sent
   if (profile.welcome_email_sent) {
     return new Response(
       JSON.stringify({ message: "Welcome email already sent" }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }

   // After sending email, update the field
   await supabaseClient
     .from("users")
     .update({ welcome_email_sent: true })
     .eq("id", user.id);
   ```

### Option 2: Track in Separate Table

Create a `user_emails` table to track all sent emails.

---

## ✅ Verification Checklist

After setup:

- [ ] Email service account created (Resend or SendGrid)
- [ ] API key obtained
- [ ] Environment variables set in Supabase Dashboard
- [ ] Edge function deployed
- [ ] Domain verified (for production)
- [ ] Test email sent and received
- [ ] Email content looks correct
- [ ] Links work properly
- [ ] Mobile email clients display correctly

---

## 🆘 Troubleshooting

### Email Not Sending

1. **Check environment variables:**
   - Verify API key is correct
   - Check `FROM_EMAIL` is set
   - Ensure `EMAIL_SERVICE` matches your provider

2. **Check function logs:**
   - Go to Supabase Dashboard → Edge Functions → `send-welcome-email` → Logs
   - Look for error messages

3. **Test the function directly:**
   ```bash
   curl -X POST https://api.habibiswipe.com/functions/v1/send-welcome-email \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
   ```

### Email Going to Spam

1. **Verify your domain:**
   - Complete domain verification in your email service dashboard
   - Set up SPF, DKIM, and DMARC records

2. **Use a verified "from" address:**
   - Don't use generic addresses like `noreply@`
   - Use a real email address on your domain

3. **Warm up your domain:**
   - Start with low volume
   - Gradually increase sending volume

### Function Errors

1. **Check API key permissions:**
   - Resend: API key should have "Send Email" permission
   - SendGrid: API key should have "Mail Send" permission

2. **Check rate limits:**
   - Free tiers have limits
   - Upgrade if you're hitting limits

---

## 📊 Monitoring

### Track Email Delivery

1. **Resend Dashboard:**
   - View sent emails, opens, clicks
   - Check delivery status

2. **SendGrid Dashboard:**
   - View activity feed
   - Check delivery statistics

### Add Analytics

You can add tracking pixels or UTM parameters to links in the email to track opens and clicks.

---

## 🔗 Resources

- [Resend Documentation](https://resend.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Email Best Practices](https://www.campaignmonitor.com/resources/guides/email-marketing-best-practices/)

---

## 📝 Notes

- **Email is sent asynchronously** - onboarding completion is not blocked if email fails
- **Non-blocking** - if email fails, user can still complete onboarding
- **First-time only** - consider adding duplicate prevention (see above)
- **Production ready** - works with both Resend and SendGrid
- **Branded design** - matches Habibi Swipe gold/black theme

