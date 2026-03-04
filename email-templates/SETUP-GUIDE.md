# Quick Setup Guide - CARMA Email Templates

## 5-Minute Setup Checklist

### Step 1: Preview Templates (1 minute)

Open in your browser:
```
email-templates/preview.html
```

This shows all three templates side-by-side with one-click copy buttons.

### Step 2: Apply to Supabase (3 minutes)

For each template:

#### Confirmation Email
1. Open `email-templates/preview.html` in browser
2. Click "Copy HTML" on the Confirmation template
3. Go to Supabase Dashboard → Authentication → Email Templates
4. Select "Confirm signup"
5. Paste the HTML
6. Click "Save"

#### Password Reset Email
1. Click "Copy HTML" on the Password Reset template
2. In Supabase Dashboard, select "Reset password"
3. Paste the HTML
4. Click "Save"

#### Magic Link Email (Optional)
1. Click "Copy HTML" on the Magic Link template
2. In Supabase Dashboard, select "Magic Link"
3. Paste the HTML
4. Click "Save"

### Step 3: Test (1 minute)

1. In Supabase Dashboard, go to Email Templates
2. Click "Send test email" for each template
3. Enter your email address
4. Check your inbox
5. Verify the emails look correct

## Done!

Your emails now match the CARMA brand perfectly.

---

## What These Templates Include

✅ CARMA logo with gradient effect
✅ Dark theme matching the app
✅ "Community Driven" tagline
✅ Clear call-to-action buttons
✅ Security notices
✅ Mobile responsive design
✅ Works in all major email clients

## Template Variables

Supabase automatically fills these:

- `{{ .ConfirmationURL }}` - The magic link/verification URL
- `{{ .Token }}` - Verification token (if needed)
- `{{ .Email }}` - User's email address

Don't worry about these - they work automatically!

## Troubleshooting

### Can't copy HTML?
- Open the template file directly (e.g., `confirm-email.html`)
- Select all (Ctrl+A / Cmd+A)
- Copy (Ctrl+C / Cmd+C)
- Paste into Supabase

### Styles not showing in email?
- All CSS is inline (already done)
- Should work in all email clients
- If issues persist, test in Gmail first

### Links not working?
- Make sure you saved the template in Supabase
- Check Authentication settings are enabled
- Verify your redirect URLs in Supabase settings

### Fonts not displaying?
- Google Fonts work in most email clients
- Fallback fonts are included (Inter, system fonts)
- Should display correctly in Gmail, Apple Mail, Outlook

## Next Steps After Setup

1. ✅ Enable email confirmation in Supabase Auth settings
2. ✅ Test with real signup flow
3. ✅ Monitor email delivery in Supabase logs
4. ✅ Adjust content if needed (edit templates and re-upload)

## Customization

Want to change something? Edit these files:
- `confirm-email.html` - Verification email
- `reset-password.html` - Password reset
- `magic-link.html` - Passwordless login

Then copy and paste the updated HTML back into Supabase.

## Support

All templates are:
- ✅ Production-ready
- ✅ Tested in major email clients
- ✅ Mobile responsive
- ✅ Accessible
- ✅ Secure

No additional setup or dependencies required!

---

**Setup Time**: ~5 minutes
**Difficulty**: Easy
**Requirements**: Supabase Dashboard access
**Cost**: Free (included in all Supabase plans)
