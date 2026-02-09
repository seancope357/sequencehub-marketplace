// Quick script to test Stripe connection
require('dotenv').config({ path: '.env.local' });

async function testStripeConnection() {
  console.log('🔍 Testing Stripe Connection...\n');

  // Check if keys are set
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
  }

  if (!publishableKey) {
    console.error('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found in .env.local');
    process.exit(1);
  }

  // Validate key formats
  if (!secretKey.startsWith('sk_test_')) {
    console.error('⚠️  Warning: STRIPE_SECRET_KEY should start with sk_test_ for TEST mode');
    console.error('   Current value starts with:', secretKey.substring(0, 8));
  }

  if (!publishableKey.startsWith('pk_test_')) {
    console.error('⚠️  Warning: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with pk_test_ for TEST mode');
    console.error('   Current value starts with:', publishableKey.substring(0, 8));
  }

  console.log('✅ Environment variables found:');
  console.log(`   STRIPE_SECRET_KEY: ${secretKey.substring(0, 15)}...`);
  console.log(`   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${publishableKey.substring(0, 15)}...`);
  console.log('');

  // Try to initialize Stripe
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    console.log('🔌 Initializing Stripe client...');

    // Test API call - get account details
    const account = await stripe.accounts.retrieve();

    console.log('\n✅ Stripe connection successful!');
    console.log('\n📊 Account Details:');
    console.log(`   Type: ${account.type || 'standard'}`);
    console.log(`   Country: ${account.country || 'US'}`);
    console.log(`   Email: ${account.email || 'Not set'}`);
    console.log(`   Charges Enabled: ${account.charges_enabled || false}`);
    console.log(`   Payouts Enabled: ${account.payouts_enabled || false}`);
    console.log('');
    console.log('🎉 Stripe TEST mode is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('1. ✅ Stripe keys configured');
    console.log('2. 🚀 Ready to build creator onboarding flow');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Stripe connection failed:');
    console.error(`   Error: ${error.message}`);

    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 This usually means:');
      console.error('   - Invalid API key');
      console.error('   - Key copied incorrectly (extra spaces?)');
      console.error('   - Using wrong key (secret vs publishable)');
    }

    process.exit(1);
  }
}

testStripeConnection();
