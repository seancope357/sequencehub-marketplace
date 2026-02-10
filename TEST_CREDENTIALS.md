# Test Credentials for SequenceHub

**Last Updated**: February 10, 2026

---

## Login Credentials

### Test User (All Roles)
```
Email: test@sequencehub.com
Password: test123
Roles: BUYER, CREATOR, ADMIN
```

### Your Account
```
Email: seancope357@gmail.com
Password: Sm@rt0329808
Roles: BUYER
```

---

## How to Use

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to login page:**
   ```
   http://localhost:3000/auth/login
   ```

3. **Enter credentials** from above

4. **You should be redirected to:**
   ```
   http://localhost:3000/dashboard
   ```

---

## Troubleshooting

### Issue: "Invalid email or password"
**Solution**: Make sure you're using the exact credentials above (copy/paste recommended)

### Issue: 500 Error
**Cause**: Usually means database connection issue or missing environment variables
**Solution**:
1. Check `.env.local` has `DATABASE_URL` set correctly
2. Verify Supabase database is running
3. Check server logs: `tail -f dev.log`

### Issue: Not redirected to dashboard
**Cause**: JavaScript error or auth store not updating
**Solution**:
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Clear cookies and try again

---

## What Was Fixed

**Problem**: User passwords were not set correctly in the database

**Solution**:
- Reset password for `seancope357@gmail.com` to `Sm@rt0329808`
- Created test user `test@sequencehub.com` with password `test123` and all roles

**Files Changed**: Database only (no code changes needed)

---

## Next Steps

1. Test login with both accounts
2. Verify you can access:
   - `/dashboard` - Main dashboard
   - `/dashboard/products` - Products management
   - `/dashboard/creator/onboarding` - Stripe Connect setup
3. Test creating a product
4. Test Stripe Connect onboarding

---

**Note**: These are development/test credentials. In production, use strong, unique passwords!
