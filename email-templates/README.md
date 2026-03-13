# CARMA Email Templates

Professional, on-brand HTML email templates for Supabase authentication flows.

## Templates Included

1. **confirm-email.html** - Email verification for new signups
2. **reset-password.html** - Password reset requests
3. **magic-link.html** - Passwordless login (optional)

## Design Features

### Branding
- CARMA logo with gradient effect (blue to purple)
- Dark theme matching app design
- "Community Driven" tagline
- Consistent typography (Inter + Montserrat)

### Colors
- Background: `#0B1220` (dark blue)
- Surface: `#111827` (dark blue-gray)
- Accent: `#60A5FA` → `#3B82F6` (blue gradient)
- Text: `#FFFFFF` (white) / `#9CA3AF` (gray)

### Features
- Fully responsive design
- Email client compatible (Gmail, Outlook, Apple Mail, etc.)
- Inline CSS (required for email)
- Clear call-to-action buttons
- Security notices
- Alternative text links
- Professional footer

## How to Apply in Supabase

### Method 1: Via Supabase Dashboard (Recommended)

1. **Access Email Templates**
   - Go to Supabase Dashboard
   - Navigate to **Authentication** → **Email Templates**

2. **Configure Confirmation Email**
   - Select "Confirm signup" template
   - Click "Edit template"
   - Copy contents of `confirm-email.html`
   - Paste into the HTML editor
   - Click "Save"

3. **Configure Password Reset Email**
   - Select "Reset password" template
   - Click "Edit template"
   - Copy contents of `reset-password.html`
   - Paste into the HTML editor
   - Click "Save"

4. **Configure Magic Link (Optional)**
   - Select "Magic Link" template
   - Click "Edit template"
   - Copy contents of `magic-link.html`
   - Paste into the HTML editor
   - Click "Save"

### Method 2: Via Supabase CLI (Advanced)

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy email templates (requires Supabase Pro)
# Templates must be in supabase/templates/ directory
```

## Template Variables

Supabase automatically replaces these variables:

- `{{ .ConfirmationURL }}` - The verification/reset/login link
- `{{ .Token }}` - The verification token (if needed)
- `{{ .Email }}` - User's email address (if needed)
- `{{ .Data }}` - Additional custom data

## Testing Your Templates

### Test in Supabase Dashboard

1. Go to **Authentication** → **Email Templates**
2. Select a template
3. Click **"Send test email"**
4. Enter your email address
5. Check your inbox

### Test in Development

1. Enable email confirmation in Auth settings
2. Register a new test account
3. Check email delivery
4. Verify links work correctly
5. Test responsive design on mobile

## Customization Guide

### Change Colors

Find and replace these hex values:

```html
<!-- Primary accent color -->
#60A5FA → Your color

<!-- Secondary accent color -->
#3B82F6 → Your color

<!-- Background -->
#0B1220 → Your color
```

### Change Logo/Branding

Edit the header section:

```html
<h1 style="...">
  CARMA  <!-- Change to your brand name -->
</h1>

<p style="...">
  Community Driven  <!-- Change tagline -->
</p>
```

### Add Your Logo Image

Replace text logo with image:

```html
<img src="https://your-cdn.com/logo.png"
     alt="CARMA"
     width="200"
     style="display: block; max-width: 200px;" />
```

### Modify Content

Edit the content sections:

```html
<td style="padding: 40px 40px 30px 40px;">
  <h2>Your Heading</h2>
  <p>Your custom message here</p>
</td>
```

## Email Client Compatibility

These templates are tested and work in:

- Gmail (Desktop & Mobile)
- Apple Mail (macOS & iOS)
- Outlook (2016+, Office 365)
- Yahoo Mail
- ProtonMail
- Thunderbird
- Samsung Mail
- Android Email

## Best Practices

### Do's
✅ Use inline CSS (already done)
✅ Use table-based layouts (already done)
✅ Keep width under 600px (already done)
✅ Test in multiple email clients
✅ Include plain text alternative
✅ Make links obvious and large

### Don'ts
❌ Don't use JavaScript
❌ Don't use external stylesheets
❌ Don't use background images
❌ Don't use custom fonts (except web-safe)
❌ Don't use complex CSS (flexbox, grid)

## Troubleshooting

### Styles Not Showing
- Ensure all CSS is inline
- Check for unsupported CSS properties
- Test in Gmail (most restrictive)

### Links Not Working
- Verify `{{ .ConfirmationURL }}` is present
- Check redirect URLs in Supabase settings
- Test with actual signup/reset flow

### Images Not Loading
- Use absolute URLs (https://)
- Host images on CDN
- Add alt text for accessibility

### Fonts Not Displaying
- Google Fonts work in most email clients
- Have fallback fonts (system fonts)
- Don't rely on custom fonts for critical content

## Advanced Features

### Add Click Tracking

Supabase automatically tracks email opens. For click tracking:

```html
<a href="{{ .ConfirmationURL }}&utm_source=email&utm_medium=confirmation">
  Verify Email
</a>
```

### Personalization

Add user name if available:

```html
<p>Hi {{ .UserMetaData.full_name }},</p>
```

### Conditional Content

Show different content based on user tier:

```html
{{- if eq .UserMetaData.tier "premium" }}
  <p>Premium benefits await!</p>
{{- else }}
  <p>Upgrade to unlock premium features</p>
{{- end }}
```

## Rate Limiting

Supabase email rate limits (default):
- 6 emails per hour per user
- 30 emails per hour per IP
- Adjustable in Auth settings

## Support

If you encounter issues:

1. Check Supabase email logs in Dashboard
2. Verify DNS/SPF records for custom domains
3. Test with different email providers
4. Check spam folders
5. Review Supabase Auth settings

## Preview

### Desktop View
- 600px width
- Centered layout
- Full branding and graphics
- Clear CTA buttons

### Mobile View
- Responsive stacking
- Touch-friendly buttons
- Readable font sizes
- Optimized for small screens

## File Structure

```
email-templates/
├── README.md                 # This file
├── confirm-email.html        # Email verification template
├── reset-password.html       # Password reset template
└── magic-link.html          # Passwordless login template
```

## Next Steps

1. ✅ Review templates in browser
2. ✅ Apply to Supabase Dashboard
3. ✅ Enable email confirmation in Auth settings
4. ✅ Test with real signup flow
5. ✅ Monitor email delivery rates
6. ✅ Adjust content as needed

## Credits

- **Design**: Matches CARMA app design system
- **Colors**: From tailwind.config.js
- **Typography**: Inter + Montserrat (Google Fonts)
- **Compatibility**: Tested across major email clients

---

**Last Updated**: January 13, 2026
**Version**: 1.0.0
**License**: Internal use only
