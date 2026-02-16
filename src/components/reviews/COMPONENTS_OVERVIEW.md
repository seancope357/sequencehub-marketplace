# Reviews & Ratings Components - Visual Overview

## Component Screenshots & Descriptions

### 1. StarRating Component

**Display Modes:**

```
Small Size (sm):
★★★★★ (4.5)

Medium Size (md):
★★★★★ (4.5)

Large Size (lg):
★★★★★ (4.5)
```

**Features:**
- Gold/yellow filled stars
- Partial fill for decimal ratings
- Hover effects in input mode
- Keyboard accessible
- Smooth animations

**States:**
- Empty: ☆☆☆☆☆ (gray outline)
- Filled: ★★★★★ (gold)
- Partial: ★★★★☆ (mixed)
- Hover (input mode): Scale up on hover

---

### 2. ReviewForm Component

**Visual Layout:**
```
┌─────────────────────────────────────────────┐
│ Rating *                                    │
│ ★★★★★ (interactive stars)                   │
│                                             │
│ Review Title (Optional)                     │
│ ┌─────────────────────────────────────────┐ │
│ │ Summarize your experience              │ │
│ └─────────────────────────────────────────┘ │
│ 0/100 characters                            │
│                                             │
│ Review (Optional)                           │
│ ┌─────────────────────────────────────────┐ │
│ │ Share your thoughts about this         │ │
│ │ sequence...                             │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│ 0/1000 characters                           │
│                                             │
│              [Cancel] [Submit Review]       │
└─────────────────────────────────────────────┘
```

**Features:**
- Real-time validation
- Character counters
- Loading states with spinner
- Error messages in red
- Success toast notifications
- Cancel button (when editing)

**Validation:**
- Rating: Required (1-5 stars)
- Title: Optional, max 100 chars
- Comment: Optional, max 1000 chars

---

### 3. ReviewList Component

**Visual Layout:**
```
┌─────────────────────────────────────────────────────┐
│ 42 Reviews              Sort by: [Most Recent ▼]   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ┌─┐                                     [✏️] [🗑️]   │
│ │JD│ John Doe                                       │
│ └─┘  ★★★★★ • 2 days ago                            │
│      ✓ Verified Purchase                           │
│                                                     │
│      Amazing Christmas Sequence!                   │
│      This sequence is absolutely stunning. The     │
│      timing is perfect and it integrates well...   │
│                                                     │
│      ─────────────────────────────────────────     │
│      👍 Helpful (12)                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ┌─┐                                                 │
│ │SM│ Sarah Miller                                   │
│ └─┘  ★★★★☆ • 1 week ago                            │
│      ✓ Verified Purchase                           │
│                                                     │
│      Great value for money                         │
│      Works perfectly with my setup. Would love to  │
│      see more sequences from this creator.         │
│                                                     │
│      ─────────────────────────────────────────     │
│      👍 Helpful (8)                                 │
└─────────────────────────────────────────────────────┘

         [← Previous]  1  2  3  4  [Next →]
```

**Features:**
- User avatar with initials
- Verified Purchase badge (green)
- Star rating display
- Relative time (e.g., "2 days ago")
- Edit/Delete buttons (own reviews only)
- Helpful voting with count
- Pagination controls
- Sort dropdown (Recent, Highest, Lowest)
- Loading skeletons
- Empty state message

**Interactions:**
- Click Edit → Shows inline ReviewForm
- Click Delete → Confirmation dialog
- Click Helpful → Increments count (once per user)
- Hover effects on cards

---

### 4. ReviewsSummary Component

**Visual Layout:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  4.5              Based on 42 reviews               │
│  ★★★★★                                              │
│                        [Write a Review]             │
│                                                     │
│  Rating Breakdown                                   │
│  5 ★  ████████████████░░░░░   70% (30)             │
│  4 ★  █████░░░░░░░░░░░░░░░░   25% (10)             │
│  3 ★  ░░░░░░░░░░░░░░░░░░░░░    5% (2)              │
│  2 ★  ░░░░░░░░░░░░░░░░░░░░░    0% (0)              │
│  1 ★  ░░░░░░░░░░░░░░░░░░░░░    0% (0)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Large average rating (4.5)
- Star rating visualization
- Total review count
- Write Review button (conditional)
- Rating distribution bars
- Percentage and count for each level
- Responsive layout (stacks on mobile)
- Empty state message

**Colors:**
- Stars: Gold/Yellow (#EAB308)
- Progress bars: Primary color
- Text: Standard text colors

---

## Complete Integration Example

**Product Page Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Product Details                                     │
│ [Product info, images, price, buy button]           │
└─────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────┐
│ Customer Reviews                                    │
│                                                     │
│ [ReviewsSummary Component]                          │
└─────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────┐
│ Write a Review (if eligible)                       │
│                                                     │
│ [ReviewForm Component]                              │
└─────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────┐
│ [ReviewList Component]                              │
│                                                     │
│ • Multiple review cards                             │
│ • Pagination                                        │
│ • Sort controls                                     │
└─────────────────────────────────────────────────────┘
```

---

## Color Scheme

**Star Ratings:**
- Filled: `text-yellow-500` (#EAB308)
- Empty: `text-muted-foreground/30` (gray, 30% opacity)

**Badges:**
- Verified Purchase: `variant="secondary"` with CheckCircle2 icon (green)

**Buttons:**
- Primary: Default button styles
- Secondary: `variant="outline"`
- Ghost: `variant="ghost"`

**Cards:**
- Background: `bg-card`
- Border: `border`
- Shadow: `shadow-sm`, `hover:shadow-md`
- Border highlight (own review): `border-primary/50`

**Form States:**
- Success: Green toast
- Error: Red toast, destructive variant
- Loading: Spinner icon

---

## Responsive Design

**Desktop (≥768px):**
- Full-width components
- Side-by-side layouts where applicable
- All features visible

**Mobile (<768px):**
- Stacked layouts
- Full-width buttons
- Hidden "Previous/Next" text in pagination (icons only)
- Compact star sizes

---

## Accessibility Features

1. **Keyboard Navigation:**
   - Tab through all interactive elements
   - Enter/Space to select star ratings
   - Arrow keys for navigation

2. **Screen Readers:**
   - ARIA labels on all interactive elements
   - Role attributes (button, radiogroup)
   - Semantic HTML (nav, section)

3. **Focus States:**
   - Visible focus rings
   - High contrast focus indicators

4. **Color Contrast:**
   - WCAG AA compliant
   - Text meets minimum contrast ratios

---

## Animation & Transitions

1. **StarRating:**
   - Scale up on hover (1.1x)
   - Smooth color transitions

2. **ReviewList:**
   - Card hover: shadow increase
   - Loading skeletons: pulse animation

3. **Buttons:**
   - Hover state changes
   - Spinner rotation on loading

4. **Form:**
   - Error shake animation
   - Success fade-in

---

## Design Tokens

```css
/* Sizes */
--star-sm: 1rem (16px)
--star-md: 1.25rem (20px)
--star-lg: 1.5rem (24px)

/* Spacing */
--card-padding: 1.5rem (24px)
--gap-sm: 0.5rem (8px)
--gap-md: 1rem (16px)
--gap-lg: 1.5rem (24px)

/* Border Radius */
--radius-sm: 0.375rem (6px)
--radius-md: 0.5rem (8px)
--radius-lg: 0.75rem (12px)
--radius-full: 9999px (circle)

/* Typography */
--text-sm: 0.875rem (14px)
--text-base: 1rem (16px)
--text-lg: 1.125rem (18px)
--text-xl: 1.25rem (20px)
--text-2xl: 1.5rem (24px)
```

---

## Performance Considerations

1. **Lazy Loading:**
   - Reviews load on scroll
   - Images lazy load

2. **Optimistic Updates:**
   - Helpful votes update immediately
   - Review edits show instantly

3. **Debouncing:**
   - Search/filter inputs debounced
   - API calls throttled

4. **Caching:**
   - Review data cached
   - Pagination cached

---

## Testing Checklist

- [ ] StarRating displays correctly in all sizes
- [ ] StarRating input mode works (click & keyboard)
- [ ] ReviewForm validation works
- [ ] ReviewForm submits successfully
- [ ] ReviewList loads and displays reviews
- [ ] ReviewList pagination works
- [ ] ReviewList sorting works
- [ ] ReviewList edit/delete works (own reviews)
- [ ] ReviewList helpful voting works
- [ ] ReviewsSummary displays correct data
- [ ] ReviewsSummary distribution bars calculate correctly
- [ ] All components responsive on mobile
- [ ] All components accessible (keyboard & screen reader)
- [ ] Loading states work correctly
- [ ] Error states display properly
- [ ] Toast notifications appear

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari iOS 14+
- Chrome Android 90+
