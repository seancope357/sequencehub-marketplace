# Stripe TEST Mode Setup Instructions

## 📝 Step-by-Step Guide

### Step 1: Get Your Stripe TEST API Keys

1. **Open Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Make sure you're in **TEST MODE** (toggle in top right should show "Test Mode")

2. **Find Your Keys:**

   You'll see a page like this:
   ```
   Publishable key
   pk_test_51ABC123DEF456...
   [Use your publishable key]

   Secret key
   sk_test_4ABC123DEF456...
   •••••••••••••••••••••
   [Reveal test key]  ← Click this to reveal
   ```

3. **Copy Both Keys:**
   - Click "Reveal test key" for the Secret key
   - Copy the **Secret key** (starts with `sk_test_`)
   - Copy the **Publishable key** (starts with `pk_test_`)

---

### Step 2: Paste Keys Here

Once you have the keys, provide them in this format:

```
Secret Key: sk_test_51ABC123DEF456...
Publishable Key: pk_test_51XYZ789GHI012...
```

**Then I'll:**
1. ✅ Add them to `.env.local`
2. ✅ Test the connection
3. ✅ Build the creator onboarding flow

---

## 🔐 Security Notes

**Don't worry about sharing TEST keys with me:**
- ✅ TEST mode keys are safe to use in development
- ✅ They can't charge real credit cards
- ✅ They can't access real money
- ✅ You can regenerate them anytime

**Never share LIVE keys:**
- ❌ LIVE keys (sk_live_...) should NEVER be shared
- ❌ LIVE keys can charge real cards and access real money
- ❌ Keep LIVE keys secret and only in production .env

---

## ⏱️ This Will Take 2 Minutes

1. Open Stripe Dashboard (30 seconds)
2. Copy keys (30 seconds)
3. Paste here (10 seconds)
4. I'll configure everything (30 seconds)
5. Test connection (20 seconds)

**Total: ~2 minutes to get Stripe working!**

---

## 🚀 What Happens Next

After we add the keys:

1. **Test the connection** (30 seconds)
   ```bash
   node test-stripe-connection.js
   ```

2. **Build creator onboarding** (2-3 hours)
   - API endpoint to create Stripe Express accounts
   - Generate onboarding links
   - Handle creator returns from Stripe
   - Assign CREATOR role

3. **Test with your account** (10 minutes)
   - Click "Become a Creator"
   - Go through Stripe onboarding
   - Get CREATOR role
   - See creator dashboard

By end of today, you'll have:
✅ Creators can connect Stripe
✅ Creators get CREATOR role
✅ Creators see creator dashboard

Tomorrow we'll add:
✅ File uploads for xLights sequences
✅ Product creation flow

---

**Ready? Paste your Stripe TEST keys below!** 🚀
