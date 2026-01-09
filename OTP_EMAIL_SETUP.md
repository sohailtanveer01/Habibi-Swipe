# OTP Verification Email Setup
## Habibi Swipe - Custom Email Template Configuration

**Last Updated:** January 2025

---

## ✅ Custom OTP Email Template Created

I've created a professional, branded OTP verification email template that matches your Habibi Swipe gold/black theme.

---

## 📧 Template Features

- **Branded Design:** Gold (#B8860B) and black (#0A0A0A) color scheme
- **Clear OTP Display:** Large, easy-to-read 6-digit code
- **Security Notice:** Expiration time and security information
- **Mobile-Friendly:** Responsive design that works on all devices
- **Professional Layout:** Clean, modern design with clear instructions

---

## 🚀 How to Configure in Supabase

### Step 1: Access Email Templates

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Customize OTP Email Template

1. Find the **"Magic Link"** or **"OTP"** email template
2. Click **"Edit"** or **"Customize"**

### Step 3: Paste the Template

1. Open `OTP_EMAIL_TEMPLATE.html` from your project
2. Copy the entire HTML content
3. Paste it into the Supabase email template editor

### Step 4: Configure Variables

Supabase uses Go template syntax. The template includes:
- `{{ .Token }}` - The 6-digit OTP code (automatically replaced by Supabase)
- `{{ .Year }}` - Current year (automatically replaced)

**Note:** If Supabase uses different variable names, check their documentation and update accordingly.

---

## 🎨 Template Customization

### Change Colors

Edit the HTML template:
- **Gold:** `#B8860B` (primary brand color)
- **Black:** `#0A0A0A` (background/header)
- **Gray:** `#666666` (text color)

### Update Text

- **Subject Line:** Configure in Supabase Dashboard → Email Templates
- **Email Content:** Edit the HTML template directly
- **Support Links:** Update URLs in the footer section

### Add Logo

To add your logo image:
1. Host your logo on a CDN or Supabase Storage
2. Add this in the header section:
   ```html
   <img src="https://your-logo-url.png" alt="Habibi Swipe" style="max-width: 150px;">
   ```

---

## 📝 Supabase Email Template Variables

Supabase provides these variables (check your Supabase version):

- `{{ .Token }}` - OTP code
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL (if applicable)

**Important:** Verify the exact variable names in your Supabase Dashboard.

---

## ✅ Verification Checklist

After setup:

- [ ] Template pasted into Supabase Dashboard
- [ ] Variables verified ({{ .Token }} works)
- [ ] Subject line configured
- [ ] Test email sent and received
- [ ] OTP code displays correctly
- [ ] Mobile email clients render properly
- [ ] Links work correctly
- [ ] Brand colors match your app

---

## 🧪 Testing

### Send Test OTP

1. Use your app's login/signup flow
2. Enter your email address
3. Check your inbox for the OTP email
4. Verify:
   - Code is clearly visible
   - Design looks professional
   - All links work
   - Mobile view is correct

### Test Different Email Clients

- Gmail (web & mobile)
- Apple Mail
- Outlook
- Yahoo Mail

---

## 🔧 Troubleshooting

### OTP Code Not Showing

- **Check variable syntax:** Ensure `{{ .Token }}` matches Supabase's format
- **Verify template:** Check Supabase Dashboard for correct variable names
- **Test in Supabase:** Use Supabase's "Send test email" feature

### Design Not Rendering

- **Check HTML:** Ensure all HTML is properly formatted
- **Inline styles:** All styles are inline (required for email)
- **Test in email client:** Some clients strip certain CSS

### Links Not Working

- **Verify URLs:** Check all links point to correct destinations
- **HTTPS:** Use `https://` for all external links
- **Test clicks:** Click each link to verify

---

## 📱 Mobile Optimization

The template is mobile-responsive:
- ✅ Single-column layout on mobile
- ✅ Touch-friendly button sizes
- ✅ Readable font sizes
- ✅ Proper spacing

---

## 🔒 Security Best Practices

The template includes:
- ✅ Security notice about code expiration
- ✅ Warning if user didn't request code
- ✅ Support contact information

---

## 📊 Email Deliverability Tips

1. **Verify Domain:** Set up SPF, DKIM, and DMARC records
2. **Use Custom Domain:** Send from `noreply@habibiswipe.com` (not Supabase default)
3. **Warm Up Domain:** Start with low volume, gradually increase
4. **Monitor Bounce Rate:** Check Supabase Dashboard for delivery issues

---

## 🔗 Resources

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email HTML Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)
- [Email Testing Tools](https://www.litmus.com/)

---

## 📝 Notes

- **Template Location:** `OTP_EMAIL_TEMPLATE.html` in project root
- **Supabase Version:** Check your Supabase version for exact variable syntax
- **Backup:** Keep a backup of your original Supabase template
- **Updates:** Test after any Supabase updates

---

## 🎯 Next Steps

1. ✅ Copy template from `OTP_EMAIL_TEMPLATE.html`
2. ✅ Paste into Supabase Dashboard → Email Templates
3. ✅ Configure subject line
4. ✅ Test with a real OTP request
5. ✅ Verify mobile rendering
6. ✅ Monitor delivery rates

Your users will now receive a professional, branded OTP verification email! 🎉

