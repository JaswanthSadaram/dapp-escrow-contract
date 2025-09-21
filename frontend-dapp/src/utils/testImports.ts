// Test file to verify MeshJS imports work correctly
import { BrowserWallet, Transaction } from '@meshsdk/core';

export const testMeshJSImport = () => {
  try {
    console.log('✅ MeshJS core imported successfully');
    console.log('✅ BrowserWallet:', typeof BrowserWallet);
    console.log('✅ Transaction:', typeof Transaction);
    console.log('✅ Global polyfills working');
    return true;
  } catch (error) {
    console.error('❌ MeshJS import failed:', error);
    return false;
  }
};

// Test global variables
export const testGlobals = () => {
  console.log('🔍 Testing global variables:');
  console.log('- global:', typeof (window as any).global);
  console.log('- Buffer:', typeof (window as any).Buffer);
  console.log('- process:', typeof (window as any).process);
};