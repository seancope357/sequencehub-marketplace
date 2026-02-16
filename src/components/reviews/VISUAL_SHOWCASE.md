# Reviews & Ratings Components - Visual Showcase

## Live Component Preview

This document shows how the components will look when rendered.

---

## 1. StarRating Component

### Display Mode (Read-only)

**Small Size:**
```
★★★★★ (4.5)
[Gold filled stars with rating count]
Size: 16px stars
```

**Medium Size (Default):**
```
★★★★★ (4.5)
[Gold filled stars with rating count]
Size: 20px stars
```

**Large Size:**
```
★★★★★ (4.5)
[Gold filled stars with rating count]
Size: 24px stars
```

### Input Mode (Interactive)

**Hover State:**
```
Initial:     ☆☆☆☆☆
Hover 3rd:   ★★★☆☆  [Third star scales up 1.1x]
Click 3rd:   ★★★☆☆  [Rating set to 3]
```

**Colors:**
- Filled: `#EAB308` (Yellow-500)
- Empty: Gray with 30% opacity
- Hover: Scale transform 1.1x

---

## 2. ReviewForm Component

### Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Rating *                                               │
│  ★★★★★                                                  │
│  [5 interactive large gold stars]                       │
│  [Error: "Please select a rating" if not selected]     │
│                                                         │
│  Review Title (Optional)                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Summarize your experience                       │   │
│  └─────────────────────────────────────────────────┘   │
│  0/100 characters                                       │
│                                                         │
│  Review (Optional)                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Share your thoughts about this sequence...      │   │
│  │                                                 │   │
│  │                                                 │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│  0/1000 characters                                      │
│                                                         │
│                      [Cancel] [Submit Review]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### States

**Initial State:**
- Rating: 0 stars (unselected)
- Title: Empty input
- Comment: Empty textarea
- Submit button: Enabled

**Filled State:**
- Rating: 4 stars selected (gold)
- Title: "Great sequence!"
- Comment: "This is an amazing Christmas sequence..."
- Character counters update in real-time

**Submitting State:**
- Submit button shows spinner: ⟳ "Submitting..."
- All inputs disabled
- Cancel button disabled

**Success State:**
- Toast notification appears: "Review Submitted - Thank you for your review!"
- Form resets
- onSuccess callback triggered

**Error State:**
- Rating error: Red text "Please select a rating"
- Title over limit: Red text "Title must be 100 characters or less"
- Toast notification: "Error - Failed to submit review"

---

## 3. ReviewList Component

### Header Section

```
┌─────────────────────────────────────────────────────────┐
│  42 Reviews                    Sort by: [Most Recent ▼] │
└─────────────────────────────────────────────────────────┘
```

### Individual Review Card

```
┌─────────────────────────────────────────────────────────┐
│  ┌──┐                                      [✏️] [🗑️]    │
│  │JD│  John Doe                                         │
│  └──┘  ★★★★★  •  2 days ago                            │
│        ✓ Verified Purchase [green badge]               │
│                                                         │
│        Amazing Christmas Sequence!                      │
│        [Bold title text]                                │
│                                                         │
│        This sequence is absolutely stunning. The timing │
│        is perfect and it integrates well with my        │
│        existing display. Highly recommended!            │
│        [Regular text in muted color]                    │
│                                                         │
│  ───────────────────────────────────────────────────    │
│  👍 Helpful (12)                                        │
│  [Button with thumbs up icon and count]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Edit Mode (User's Own Review)

```
┌─────────────────────────────────────────────────────────┐
│  ┌──┐                                                   │
│  │ME│  Your Review                                      │
│  └──┘                                                   │
│                                                         │
│  [ReviewForm Component Inline]                          │
│  • Rating: ★★★★★                                        │
│  • Title: [Your title here]                             │
│  • Comment: [Your comment here]                         │
│                                                         │
│              [Cancel] [Update Review]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│           No reviews yet. Be the first to review!       │
│                  [Muted gray text]                      │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Loading State

```
┌─────────────────────────────────────────────────────────┐
│  [Gray pulsing rectangle - avatar]                      │
│  [Gray pulsing line - name]                             │
│  [Gray pulsing line - rating/date]                      │
│  [Gray pulsing rectangle - title]                       │
│  [Gray pulsing rectangle - comment line 1]              │
│  [Gray pulsing rectangle - comment line 2]              │
│  [Gray pulsing rectangle - comment line 3]              │
└─────────────────────────────────────────────────────────┘
```

### Pagination

```
         [← Previous]  1  [2]  3  4  5  [Next →]
                      [Current page highlighted]
```

---

## 4. ReviewsSummary Component

### Full Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  4.5                  Based on 42 reviews                   │
│  [Large]              [Small gray text]                     │
│  ★★★★★                                                      │
│  [Medium stars]              [Write a Review]               │
│                              [Blue button]                  │
│                                                             │
│  Rating Breakdown                                           │
│  [Bold text]                                                │
│                                                             │
│  5 ★  ████████████████░░░░░   70% (30)                     │
│  4 ★  █████░░░░░░░░░░░░░░░░   25% (10)                     │
│  3 ★  ░░░░░░░░░░░░░░░░░░░░░    5% (2)                      │
│  2 ★  ░░░░░░░░░░░░░░░░░░░░░    0% (0)                      │
│  1 ★  ░░░░░░░░░░░░░░░░░░░░░    0% (0)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Progress Bar Details

**5 Stars (70%):**
```
5 ★  ████████████████░░░░░   70% (30)
     [14 filled blocks]       [Percentage] [Count]
     [6 empty blocks]
```

**4 Stars (25%):**
```
4 ★  █████░░░░░░░░░░░░░░░░   25% (10)
     [5 filled blocks]
     [15 empty blocks]
```

**Colors:**
- Filled progress: Primary color (blue)
- Empty progress: Light gray background
- Star: Gold (#EAB308)

### Empty State

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  0.0                  Based on 0 reviews                    │
│  ☆☆☆☆☆               [Small gray text]                     │
│  [Empty stars]               [Write a Review]               │
│                              [Blue button]                  │
│                                                             │
│                                                             │
│  No reviews yet. Be the first to review this product!       │
│  [Centered gray text]                                       │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Product Page Integration

### Full Reviews Section Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Customer Reviews                                           │
│  [Heading text-2xl font-bold]                               │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  [ReviewsSummary Component]                             │ │
│  │  • Average rating: 4.5 stars                            │ │
│  │  • Total reviews: 42                                    │ │
│  │  • Distribution bars                                    │ │
│  │  • Write Review button                                  │ │
│  │                                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ─────────────────────────────────────────────────────      │
│  [Separator line]                                           │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Write a Review                                         │ │
│  │  [Card header]                                          │ │
│  │                                                         │ │
│  │  [ReviewForm Component]                                 │ │
│  │  • Star rating input                                    │ │
│  │  • Title input                                          │ │
│  │  • Comment textarea                                     │ │
│  │  • Submit button                                        │ │
│  │                                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│  [Only shown if user purchased and hasn't reviewed]         │
│                                                             │
│  ─────────────────────────────────────────────────────      │
│  [Separator line]                                           │
│                                                             │
│  [ReviewList Component]                                     │
│  • Sort dropdown                                            │
│  • Review cards (10 per page)                               │
│  • Pagination controls                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Color Palette

### Stars
- **Filled:** `#EAB308` (yellow-500)
- **Empty:** `rgba(148, 163, 184, 0.3)` (slate-500 at 30%)

### Badges
- **Verified Purchase:**
  - Background: `bg-secondary` (light gray)
  - Icon: `text-green-600` (green checkmark)
  - Text: `text-secondary-foreground`

### Buttons
- **Primary:** `bg-primary text-primary-foreground`
- **Secondary:** `bg-secondary text-secondary-foreground`
- **Ghost:** `hover:bg-accent hover:text-accent-foreground`
- **Outline:** `border bg-background hover:bg-accent`

### Cards
- **Background:** `bg-card`
- **Border:** `border`
- **Shadow:** `shadow-sm` default, `shadow-md` on hover
- **Highlight (own review):** `border-primary/50`

### Text
- **Primary:** `text-foreground`
- **Muted:** `text-muted-foreground`
- **Small:** `text-sm`
- **Bold:** `font-semibold` or `font-bold`

### Progress Bars
- **Background:** `bg-primary/20` (20% opacity)
- **Filled:** `bg-primary`
- **Height:** `h-2` (8px)

---

## Interaction States

### Hover Effects

**StarRating (Input Mode):**
```
Normal:  ☆☆☆☆☆
Hover:   ★★★☆☆ [First 3 stars scale to 1.1x]
```

**Review Card:**
```
Normal:  shadow-sm
Hover:   shadow-md [Increased shadow]
```

**Buttons:**
```
Normal:  bg-primary
Hover:   bg-primary/90 [90% opacity]
```

**Helpful Button:**
```
Normal:  ghost variant
Hover:   bg-accent
Clicked: Disabled with checkmark
```

### Focus States

**All Interactive Elements:**
```
Focus: 3px ring in ring color (blue)
       outline-none
       focus-visible:ring-[3px]
       focus-visible:ring-ring/50
```

### Loading States

**Submit Button:**
```
⟳ Submitting... [Spinning icon + text]
[Button disabled, gray background]
```

**Review List:**
```
[Pulsing gray skeleton cards]
[Appears during initial load and page changes]
```

### Error States

**Form Validation:**
```
Field: Red border (border-destructive)
Label: Red text (text-destructive)
Message: Red text below field
```

**Toast Notification:**
```
❌ Error
Failed to submit review
[Red background, white text]
```

### Success States

**Toast Notification:**
```
✓ Review Submitted
Thank you for your review!
[Default background]
```

---

## Responsive Breakpoints

### Mobile (<768px)

**ReviewsSummary:**
```
┌─────────────────────┐
│  4.5                │
│  ★★★★★              │
│  Based on 42        │
│                     │
│  [Write Review]     │
│  [Full width]       │
│                     │
│  Rating Breakdown   │
│  5 ★ ████░ 70% (30)│
│  [Narrower bars]    │
└─────────────────────┘
```

**Review Card:**
```
┌─────────────────────┐
│ ┌─┐            [✏️] │
│ │J│ John        [🗑️] │
│ └─┘                 │
│ ★★★★★ • 2 days ago │
│ ✓ Verified          │
│                     │
│ Title...            │
│ Comment text...     │
│                     │
│ 👍 Helpful (12)     │
└─────────────────────┘
```

**Pagination:**
```
[←] 1 [2] 3 4 5 [→]
[Text hidden, icons only]
```

### Tablet (768px - 1024px)

**ReviewsSummary:**
```
┌─────────────────────────────────┐
│  4.5         Based on 42 reviews │
│  ★★★★★      [Write Review]       │
│                                  │
│  Rating Breakdown                │
│  5 ★ ████████░░ 70% (30)        │
└─────────────────────────────────┘
```

### Desktop (≥1024px)

**Full width layouts**
**All features visible**
**Side-by-side elements**

---

## Animation Timeline

### StarRating Hover (Input Mode)
```
0ms:    Star at scale(1)
100ms:  Star scales to scale(1.1)
        [Smooth transition]
```

### Card Hover
```
0ms:    shadow-sm
200ms:  shadow-md
        [Smooth transition]
```

### Loading Skeleton
```
0-1000ms:  opacity: 1 → 0.5 → 1
           [Infinite pulse animation]
```

### Toast Notification
```
0ms:    Slide in from top
        opacity: 0 → 1
200ms:  Fully visible
3000ms: Start fade out
3200ms: Slide out and remove
```

---

## Print Styles

Reviews section is print-friendly:
- Removes interactive elements
- Shows all content
- Black & white compatible
- Page break friendly

---

This visual showcase demonstrates how all components will appear when integrated into the SHUB-V1 marketplace. The design is clean, professional, and matches the existing UI patterns.
