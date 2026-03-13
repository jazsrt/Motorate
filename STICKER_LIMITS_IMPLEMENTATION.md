# Sticker Limits Implementation

## ✅ Changes Completed

### Limits Enforced
- **Positive Stickers:** Maximum 5 per vehicle per user
- **Negative Stickers:** Maximum 3 per vehicle per user

---

## 📁 Files Modified

### 1. `/src/components/StickerSelector.tsx`
**Used in:** Rate Driver Modal (when rating a driver and giving stickers during review)

**Changes:**
- Changed from single `maxSelection` prop to separate `maxPositive` and `maxNegative` props
- Tracks positive and negative sticker counts independently
- Shows separate counters: "👍 Positive: 2/5" and "👎 Negative: 1/3"
- Disables stickers when category limit is reached
- Users can still select from the other category if that limit isn't reached

**Props:**
```typescript
interface StickerSelectorProps {
  selectedStickers: string[];
  onToggleSticker: (stickerType: string) => void;
  maxPositive?: number;  // Default: 5
  maxNegative?: number;  // Default: 3
}
```

---

### 2. `/src/components/RateDriverModal.tsx`
**Used in:** When rating a driver from their profile or vehicle page

**Changes:**
- Updated to use new `maxPositive={5}` and `maxNegative={3}` props
- Maintains same user experience, just with separate limits

---

### 3. `/src/components/VehicleStickerSelector.tsx`
**Used in:** Vehicle Detail Page (one-at-a-time sticker giving)

**Changes:**
- **NEW:** Tracks how many positive/negative stickers user has already given to this vehicle
- **NEW:** Loads sticker counts on component mount
- **NEW:** Shows counter in header: "👍 2/5" and "👎 1/3"
- **NEW:** Disables stickers when limit reached for that category
- **NEW:** Shows "LIMIT REACHED" badge when applicable
- **NEW:** Shows warning message when all limits reached
- **Frontend validation:** Checks limits before calling API
- **Better UX:** Stickers gray out and show disabled state when limits reached

**Visual Improvements:**
- Separated positive and negative stickers into distinct sections
- Added loading state
- Better color coding (green for positive, red for negative)
- Clear visual feedback when limits are reached

---

### 4. `/src/lib/stickerService.ts`
**Backend validation for sticker giving**

**Changes:**
- **NEW:** Backend validation enforces limits server-side
- Queries user's existing stickers for the vehicle
- Counts positive vs negative stickers separately
- Returns error if user tries to exceed limits
- **Security:** Can't be bypassed by modifying frontend code

**Validation Logic:**
```typescript
// Check how many positive/negative stickers user has given
// If positive >= 5, reject
// If negative >= 3, reject
```

**Error Messages:**
- "You can only give up to 5 positive stickers to this vehicle"
- "You can only give up to 3 negative stickers to this vehicle"
- "You already gave this sticker to this vehicle!" (existing check)

---

## 🔒 Security

### Multi-Layer Protection
1. **Frontend validation** - Prevents UI from allowing selection
2. **Backend validation** - Prevents API bypass attempts
3. **Database constraint** - Prevents duplicate stickers (existing)

### Why Both Frontend and Backend?
- **Frontend:** Better UX - instant feedback, no wasted API calls
- **Backend:** Security - can't be bypassed by manipulating client code

---

## 🎨 User Experience

### Rate Driver Modal
- Toggle between Positive/Negative tabs
- Each tab shows its own limit counter
- Stickers gray out when that category's limit is reached
- Can still select from other category if available

### Vehicle Detail Page
- Shows running totals at the top
- Stickers visually disabled when limit reached
- Clear "LIMIT REACHED" labels
- Warning message when both limits exceeded
- Smooth loading states

### Visual Feedback
- ✅ Green styling for positive stickers
- ❌ Red styling for negative stickers
- 🔒 Gray/disabled styling when limit reached
- 📊 Live counter updates after each sticker given

---

## 📊 How Limits Work

### Scenario 1: Rate Driver Modal
User is rating a driver and wants to add stickers:
1. Opens Rate Driver modal
2. Clicks "👍 Positive" tab - shows "0/5"
3. Selects 5 positive stickers - shows "5/5"
4. Tries to select 6th positive sticker - button disabled
5. Switches to "👎 Negative" tab - shows "0/3" (still available!)
6. Can select up to 3 negative stickers
7. Submits rating with 5 positive + 3 negative stickers

### Scenario 2: Vehicle Detail Page
User visits a vehicle and wants to give stickers one at a time:
1. Scrolls to "Give a Bumper Sticker" section
2. Sees counter: "👍 0/5" and "👎 0/3"
3. Clicks a positive sticker - counter updates to "👍 1/5"
4. After giving 5 positive stickers - positive section shows "LIMIT REACHED"
5. Positive stickers gray out and become unclickable
6. Negative stickers still clickable (separate limit)
7. After giving 3 negative stickers - both sections disabled
8. Warning banner appears: "Sticker limit reached! You've given the maximum number of stickers to this vehicle."

---

## 🧪 Testing Recommendations

### Test Cases
1. **Happy Path**
   - Give 5 positive stickers to a vehicle ✅
   - Give 3 negative stickers to a vehicle ✅
   - Mix of positive and negative ✅

2. **Limit Enforcement**
   - Try to give 6th positive sticker (should be blocked) ✅
   - Try to give 4th negative sticker (should be blocked) ✅

3. **Cross-Category**
   - After maxing out positive stickers, negative should still work ✅
   - After maxing out negative stickers, positive should still work ✅

4. **Persistence**
   - Limits should persist across page refreshes ✅
   - Limits should be per-vehicle (different vehicles = fresh limits) ✅

5. **Multiple Users**
   - User A's limits don't affect User B's limits ✅
   - Each user gets their own 5+3 limit per vehicle ✅

---

## 📝 Database Queries

### Check User's Sticker Counts
```sql
SELECT
  COUNT(*) FILTER (WHERE bs.category = 'positive') as positive_count,
  COUNT(*) FILTER (WHERE bs.category = 'negative') as negative_count
FROM vehicle_stickers vs
JOIN bumper_stickers bs ON bs.id = vs.sticker_id
WHERE vs.vehicle_id = 'VEHICLE_ID'
  AND vs.given_by = 'USER_ID';
```

### Verify Limits Not Exceeded
```sql
-- Should return 0 or 1 rows if limits not exceeded
SELECT 'blocked'
WHERE (
  SELECT COUNT(*) FROM vehicle_stickers vs
  JOIN bumper_stickers bs ON bs.id = vs.sticker_id
  WHERE vs.vehicle_id = 'VEHICLE_ID'
    AND vs.given_by = 'USER_ID'
    AND bs.category = 'positive'
) >= 5;
```

---

## 🚀 Next Steps (Optional Enhancements)

### Potential Future Improvements
1. **Admin Override:** Allow admins to set custom limits per user
2. **Premium Users:** Give premium users higher limits (e.g., 10 positive, 5 negative)
3. **Sticker Packs:** Let users "purchase" additional sticker slots
4. **Time-Based Reset:** Reset limits monthly/quarterly
5. **Vehicle Owner Control:** Let vehicle owners set sticker limits on their vehicles
6. **Reputation-Based:** Increase limits based on user reputation
7. **Analytics:** Track which stickers hit limits most often
8. **Notifications:** Alert user when they're close to limits

---

## 🔧 Configuration

To change the limits, update these constants:

```typescript
// In StickerSelector.tsx
maxPositive = 5  // Change to desired limit
maxNegative = 3  // Change to desired limit

// In VehicleStickerSelector.tsx
const MAX_POSITIVE_STICKERS = 5;  // Change to desired limit
const MAX_NEGATIVE_STICKERS = 3;  // Change to desired limit

// In stickerService.ts (backend)
if (isPositive && positiveCount >= 5)  // Change 5 to desired limit
if (!isPositive && negativeCount >= 3)  // Change 3 to desired limit
```

**Important:** Change all three locations to keep frontend and backend in sync!

---

## ✅ Summary

Sticker limits are now enforced:
- ✅ 5 positive stickers maximum per vehicle per user
- ✅ 3 negative stickers maximum per vehicle per user
- ✅ Frontend validation for better UX
- ✅ Backend validation for security
- ✅ Clear visual feedback when limits reached
- ✅ Separate limits allow mixing positive and negative
- ✅ Build successful, ready to deploy
