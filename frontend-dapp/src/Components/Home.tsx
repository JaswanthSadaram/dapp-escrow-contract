import React, { useState, useEffect } from 'react';
import { BrowserWallet, Transaction } from '@meshsdk/core';
import { testMeshJSImport, testGlobals } from '../utils/testImports';
import styles from './Home.module.css';

// Interface for form data
interface TransactionData {
  amount: string;
  receiverAddress: string;
}

const Home: React.FC = () => {
  // Helper function to truncate strings for metadata (max 64 bytes)
  const truncateForMetadata = (str: string, maxLength: number = 50): string => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
  };

  // Dictionary to store form values
  const [formData, setFormData] = useState<TransactionData>({
    amount: '',
    receiverAddress: ''
  });

  // Wallet connection state
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>('');

  // Check if wallet is available and auto-connect
  useEffect(() => {
    // Test MeshJS imports and polyfills
    console.log('🧪 Testing MeshJS compatibility...');
    testGlobals();
    const meshJSWorking = testMeshJSImport();
    
    if (meshJSWorking) {
      checkWalletConnection();
    } else {
      console.error('❌ MeshJS compatibility issues detected');
    }
  }, []);

  const checkWalletConnection = async () => {
    try {
      // Check if Vespr wallet is available
      if (typeof window !== 'undefined' && (window as any).cardano?.vespr) {
        const vespr = (window as any).cardano.vespr;
        
        // Check if already connected
        const isConnected = await vespr.isEnabled();
        if (isConnected) {
          const walletInstance = await BrowserWallet.enable('vespr');
          setWallet(walletInstance);
          setWalletConnected(true);
          
          // Get wallet address
          const address = await walletInstance.getChangeAddress();
          setWalletAddress(address);
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      
      // Check if Vespr is available
      if (typeof window !== 'undefined' && (window as any).cardano?.vespr) {
        const walletInstance = await BrowserWallet.enable('vespr');
        setWallet(walletInstance);
        setWalletConnected(true);
        
        // Get wallet address
        const address = await walletInstance.getChangeAddress();
        setWalletAddress(address);
        
        alert('Wallet connected successfully!');
      } else {
        alert('Vespr wallet not found. Please install Vespr extension and refresh the page.');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please make sure Vespr is installed and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setWalletConnected(false);
    setWalletAddress('');
    setTxHash('');
  };

  // Handle input changes
  const handleInputChange = (field: keyof TransactionData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Enhanced validation function
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check wallet connection
    if (!walletConnected || !wallet) {
      errors.push('Please connect your Vespr wallet first');
    }

    // Validate amount
    if (!formData.amount.trim()) {
      errors.push('Transaction amount is required');
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        errors.push('Transaction amount must be a valid number');
      } else if (amount <= 0) {
        errors.push('Transaction amount must be greater than 0');
      } else if (amount < 1) {
        errors.push('Minimum transaction amount is 1 ADA');
      }
    }

    // Validate receiver address
    if (!formData.receiverAddress.trim()) {
      errors.push('Receiver address is required');
    } else {
      // Enhanced Cardano address validation
      const addressPattern = /^(addr1|addr_test1)[a-zA-Z0-9]+$/;
      if (!addressPattern.test(formData.receiverAddress.trim())) {
        errors.push('Receiver address must be a valid Cardano address (starting with addr1 or addr_test1)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Send transaction to Aiken backend
  const sendTransaction = async () => {
    if (!wallet) return;

    try {
      setIsLoading(true);
      setTxHash('');

      const amountInLovelace = (parseFloat(formData.amount) * 1_000_000).toString();

      // Create transaction using MeshJS
      const tx = new Transaction({ initiator: wallet });
      
      // Send ADA to receiver address
      tx.sendLovelace(formData.receiverAddress.trim(), amountInLovelace);
      
      // Add minimal metadata only if addresses are short enough
      try {
        const senderShort = truncateForMetadata(walletAddress, 25);
        const receiverShort = truncateForMetadata(formData.receiverAddress.trim(), 25);
        
        const metadata = {
          "674": {
            "msg": [`${formData.amount} ADA`],
            "from": senderShort,
            "to": receiverShort,
            "ts": Math.floor(Date.now() / 1000)
          }
        };
        tx.setMetadata(674, metadata[674]);
        console.log('Metadata added:', metadata[674]);
      } catch (metadataError) {
        console.warn('Skipping metadata due to length constraints:', metadataError);
        // Continue without metadata if there are issues
      }

      // Build the transaction
      const unsignedTx = await tx.build();
      
      // Sign the transaction
      const signedTx = await wallet.signTx(unsignedTx);
      
      // Submit the transaction
      const txHashResult = await wallet.submitTx(signedTx);
      setTxHash(txHashResult);

      // Show success message
      const successMessage = `Transaction Submitted Successfully!
      
Amount: ${formData.amount} ADA
Receiver: ${formData.receiverAddress}
Transaction Hash: ${txHashResult}

You can view this transaction on Cardano Explorer once it's confirmed.`;
      
      alert(successMessage);
      
      // Clear form
      setFormData({ amount: '', receiverAddress: '' });

    } catch (error) {
      console.error('Transaction failed:', error);
      let errorMessage = 'Transaction failed. ';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage += 'Insufficient funds in your wallet.';
        } else if (error.message.includes('User declined')) {
          errorMessage += 'Transaction was cancelled by user.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please check your wallet and try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle send button click
  const handleSend = async () => {
    const validation = validateForm();
    console.log('Validation result:', validation);
    if (validation.isValid) {
      // Confirm transaction with user
      const confirmMessage = `Confirm Transaction Details:
      
Amount: ${formData.amount} ADA
Receiver Address: ${formData.receiverAddress}
From Wallet: ${walletAddress}

This will create a real transaction on the Cardano blockchain. Continue?`;
      
      if (window.confirm(confirmMessage)) {
        await sendTransaction();
      }
    } else {
      // Show validation errors
      const errorMessage = `Please fix the following errors:

${validation.errors.join('\n')}`;
      
      alert(errorMessage);
    }
  };

  return (
    <div className={styles.homeContainer}>
      <div className={styles.transactionForm}>
        <h1>Cardano Escrow DApp</h1>
        
        {/* Wallet Connection Section */}
        <div className={styles.walletSection}>
          {!walletConnected ? (
            <div className={styles.walletConnect}>
              <h3>Connect Your Vespr Wallet</h3>
              <p>Connect your Vespr wallet to start sending transactions</p>
              <button 
                onClick={connectWallet}
                disabled={isLoading}
                className={styles.connectButton}
              >
                {isLoading ? 'Connecting...' : 'Connect Vespr Wallet'}
              </button>
            </div>
          ) : (
            <div className={styles.walletConnected}>
              <h3>✅ Wallet Connected</h3>
              <p><strong>Address:</strong> {walletAddress.slice(0, 20)}...{walletAddress.slice(-10)}</p>
              <button 
                onClick={disconnectWallet}
                className={styles.disconnectButton}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Transaction Form - Only show when wallet is connected */}
        {walletConnected && (
          <>
            {/* Transaction Amount Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="amount">Transaction Amount (ADA):</label>
              <input
                id="amount"
                type="text"
                placeholder="Enter amount (e.g., 10.5)"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className={styles.inputField}
                disabled={isLoading}
              />
            </div>

            {/* Receiver Address Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="receiverAddress">Receiver Address:</label>
              <input
                id="receiverAddress"
                type="text"
                placeholder="Enter Cardano address (addr1... or addr_test1...)"
                value={formData.receiverAddress}
                onChange={(e) => handleInputChange('receiverAddress', e.target.value)}
                className={styles.inputField}
                disabled={isLoading}
              />
            </div>

            {/* Send Button */}
            <button 
              onClick={handleSend}
              className={styles.sendButton}
              type="button"
              disabled={isLoading || !formData.amount || !formData.receiverAddress}
            >
              {isLoading ? 'Processing Transaction...' : 'Send Transaction'}
            </button>

            {/* Transaction Hash Display */}
            {txHash && (
              <div className={styles.txHashDisplay}>
                <h3>✅ Transaction Successful!</h3>
                <p><strong>Transaction Hash:</strong></p>
                <code className={styles.txHash}>{txHash}</code>
                <div className={styles.explorerLinks}>
                  <a 
                    href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.explorerLink}
                  >
                    View on Preprod Explorer
                  </a>
                  <a 
                    href={`https://cardanoscan.io/transaction/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.explorerLink}
                  >
                    View on Mainnet Explorer
                  </a>
                </div>
              </div>
            )}

            {/* Display current form data (for debugging/demonstration) */}
            <div className={styles.formDataDisplay}>
              <h3>Current Form Data:</h3>
              <pre>{JSON.stringify({
                ...formData,
                walletConnected,
                walletAddress: walletAddress ? `${walletAddress.slice(0, 20)}...${walletAddress.slice(-10)}` : '',
                txHash: txHash || 'None'
              }, null, 2)}</pre>
            </div>
          </>
        )}

        {/* Instructions */}
        <div className={styles.instructions}>
          <h3>Instructions:</h3>
          <ol>
            <li>Make sure you have Vespr wallet extension installed in your browser</li>
            <li>Connect your wallet using the button above</li>
            <li>Enter the amount of ADA you want to send</li>
            <li>Enter the recipient's Cardano address</li>
            <li>Click "Send Transaction" to create a real blockchain transaction</li>
            <li>Confirm the transaction in your Vespr wallet</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Home;
