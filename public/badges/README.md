# Badge SVG Icons

This directory contains 183 custom metallic badge SVG icons for MotoRate.

## Directory Structure

All badge SVG files should be placed directly in this `public/badges/` directory.

## File Naming Convention

### Tiered Badges (Bronze/Silver/Gold/Platinum)
Format: `{badge_group}-{tier}.svg`

Examples:
- `spotter-bronze.svg`
- `spotter-silver.svg`
- `spotter-gold.svg`
- `spotter-platinum.svg`
- `content-creator-bronze.svg`
- `content-creator-silver.svg`
- etc.

### One-Off Badges (No Tiers)
Format: `{badge-name}.svg`

Examples:
- `welcome.svg`
- `profile-complete.svg`
- `my-first-ride.svg`
- `first-post.svg`
- `first-comment.svg`
- `verified-owner.svg`
- etc.

### Vehicle Modification Badges
Format: `{modification-name}.svg`

Examples:
- `turbo-supercharger.svg`
- `cold-air-intake.svg`
- `custom-exhaust.svg`
- `ecu-tune.svg`
- etc.

## SVG File Specifications

- **Format**: SVG (Scalable Vector Graphics)
- **Size**: ~17KB per file
- **Dimensions**: Optimized for display at 48px to 120px
- **Styling**: Built-in metallic gradients (gold, silver, bronze, platinum)
- **Effects**: 3D appearance with shadows and highlights

## Usage in Components

Use the `BadgeIcon` component to display badges:

```tsx
import { BadgeIcon } from '../components/BadgeIcon';

<BadgeIcon
  iconPath="spotter-gold.svg"
  size={64}
  alt="Gold Spotter Badge"
  locked={false}
/>
```

## Upload Instructions

1. Extract all 183 SVG files from the badge icons zip file
2. Upload all files to this directory (`public/badges/`)
3. Verify all files are present
4. Run the SQL migration to map badge records to icon files
5. Test badge displays across the application

## Expected File Count

- **Total Files**: 183 SVG files
- **Tiered Badges**: ~140 files (35 badge groups × 4 tiers each)
- **One-Off Badges**: ~15 files
- **Vehicle Mod Badges**: ~28 files

## After Upload

Once all SVG files are uploaded:

1. Run the database migration to add `icon_path` column to badges table
2. Test badge displays on:
   - Rankings Page (/rankings)
   - Profile Pages
   - Badge Unlock Modals
   - My Garage
3. Verify no 404 errors in browser Network tab
4. Confirm all badges show metallic SVG icons (not emojis or placeholders)
