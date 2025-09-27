// Test Resend setup - This file can be deleted after testing
import { sendCredentialsEmail } from './resend';

// Simple test function to verify Resend is working
export const testResendSetup = async () => {
  try {
    console.log('🧪 Testing Resend setup...');
    
    const result = await sendCredentialsEmail(
      'e19198@eng.pdn.ac.lk', // to
      'e19198@eng.pdn.ac.lk', // email 
      'TestPassword123!', // password
      'http://localhost:8080/auth', // loginUrl
      false // isResend
    );
    
    if (result.success) {
      console.log('✅ Resend test successful!', result);
      return true;
    } else {
      console.error('❌ Resend test failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Resend test error:', error);
    return false;
  }
};

// Uncomment to run test
// testResendSetup();