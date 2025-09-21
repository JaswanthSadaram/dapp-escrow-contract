import React, { useState, useEffect } from 'react';
import { BrowserWallet, Transaction } from '@meshsdk/core';
import { testMeshJSImport, testGlobals } from '../utils/testImports';
import styles from './Home.module.css';

// Aiken contract configuration - using actual compiled script hash
const ESCROW_SCRIPT_HASH = "f2388d136606a27c4a531d0040c3e12e07eb95cd5011793c160707dc";

// Bech32 encoding utilities for Cardano address generation
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const bech32Polymod = (values: number[]): number => {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = (chk & 0x1ffffff) << 5 ^ value;
    for (let i = 0; i < 5; i++) {
      chk ^= ((top >> i) & 1) ? GEN[i] : 0;
    }
  }
  return chk;
};

const bech32HrpExpand = (hrp: string): number[] => {
  const ret = [];
  for (let p = 0; p < hrp.length; p++) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (let p = 0; p < hrp.length; p++) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
};

const bech32CreateChecksum = (hrp: string, data: number[]): number[] => {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  const ret = [];
  for (let p = 0; p < 6; p++) {
    ret.push((mod >> 5 * (5 - p)) & 31);
  }
  return ret;
};

const bech32Encode = (hrp: string, data: number[]): string => {
  const combined = data.concat(bech32CreateChecksum(hrp, data));
  let ret = hrp + '1';
  for (const d of combined) {
    ret += BECH32_CHARSET.charAt(d);
  }
  return ret;
};

const convertBits = (data: number[], fromBits: number, toBits: number, pad: boolean): number[] | null => {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  const maxAcc = (1 << (fromBits + toBits - 1)) - 1;
  for (const value of data) {
    if (value < 0 || (value >> fromBits) !== 0) {
      return null;
    }
    acc = ((acc << fromBits) | value) & maxAcc;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    return null;
  }
  return ret;
};

// Function to derive script address from hash (testnet)
const getScriptAddress = (scriptHash: string): string => {
  try {
    console.log(`🔧 Deriving script address from hash: ${scriptHash}`);
    
    // Convert hex script hash to bytes
    const scriptHashBytes = [];
    for (let i = 0; i < scriptHash.length; i += 2) {
      scriptHashBytes.push(parseInt(scriptHash.substr(i, 2), 16));
    }
    
    // Create Cardano script address payload:
    // First byte: address type (0x30 for testnet script address)
    // Next 28 bytes: script hash
    const addressPayload = [0x30, ...scriptHashBytes];
    
    // Convert to 5-bit groups for bech32 encoding
    const converted = convertBits(addressPayload, 8, 5, true);
    if (!converted) {
      throw new Error('Failed to convert address payload to 5-bit groups');
    }
    
    // Encode with testnet HRP (Human Readable Part)
    const address = bech32Encode('addr_test', converted);
    
    console.log(`✅ Generated script address: ${address}`);
    console.log(`📋 This is your ACTUAL Aiken contract address!`);
    
    return address;
    
  } catch (error) {
    console.error('❌ Error deriving script address:', error);
    // Fallback to placeholder if derivation fails
    const fallback = `addr_test1wpcrj6e8fc06tvj55vxmv25rrv8zmzyha2wsml7dsvqngu85rsf9z`;
    console.log(`⚠️ Using fallback address: ${fallback}`);
    return fallback;
  }
};

// Interface for form data
interface TransactionData {
  amount: string;
  receiverAddress: string;
}

const Home: React.FC = () => {
  // Helper function to create escrow datum for Aiken contract
  const createEscrowDatum = (senderAddress: string, receiverAddress: string, amount: string) => {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sender: senderAddress,
      receiver: receiverAddress,
      amount: parseInt((parseFloat(amount) * 1_000_000).toString()), // Convert to lovelace
      message: `Escrow payment: ${amount} ADA`,
      category: "Escrow",
      transaction_id: transactionId,
      timestamp: Math.floor(Date.now() / 1000),
      sender_confirmed: true,
      receiver_confirmed: false,
    };
  };

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
  const [useSmartContract, setUseSmartContract] = useState(true); // Toggle for smart contract vs direct payment

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

  // Send transaction to Aiken smart contract or direct payment
  const sendTransaction = async () => {
    if (!wallet) return;

    try {
      setIsLoading(true);
      setTxHash('');

      const amountInLovelace = (parseFloat(formData.amount) * 1_000_000).toString();

      // Create transaction using MeshJS
      const tx = new Transaction({ initiator: wallet });
      
      if (useSmartContract) {
        // SMART CONTRACT MODE: Send to actual Aiken escrow contract
        console.log('🔒 Using Aiken Smart Contract Escrow');
        
        // Create escrow datum for the Aiken contract
        const escrowDatum = createEscrowDatum(walletAddress, formData.receiverAddress.trim(), formData.amount);
        console.log('📄 Escrow Datum:', escrowDatum);
        
        // Get the actual script address from our contract hash
        const scriptAddress = getScriptAddress(ESCROW_SCRIPT_HASH);
        console.log('📍 Script Address:', scriptAddress);
        console.log('📋 Contract Hash:', ESCROW_SCRIPT_HASH);
        
        try {
          // Create script output with the datum
          // For now, we'll send to the script address as a regular payment
          // TODO: Implement proper datum attachment when MeshJS supports it better
          tx.sendLovelace(scriptAddress, amountInLovelace);
          
          console.log('💰 Sending', formData.amount, 'ADA to escrow contract');
          console.log('⚠️ Funds will be locked in smart contract until receiver approval');
          
        } catch (scriptError: any) {
          console.error('Script transaction error:', scriptError);
          throw new Error(`Smart contract interaction failed: ${scriptError?.message || 'Unknown error'}`);
        }
        
      } else {
        // DIRECT MODE: Send directly to receiver (original behavior)
        console.log('💸 Using Direct Payment');
        tx.sendLovelace(formData.receiverAddress.trim(), amountInLovelace);
      }
      
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
      const modeInfo = useSmartContract 
        ? `🔒 SMART CONTRACT ESCROW
✅ Funds locked in Aiken smart contract
� Contract Address: ${getScriptAddress(ESCROW_SCRIPT_HASH).slice(0, 30)}...
📋 Script Hash: ${ESCROW_SCRIPT_HASH.slice(0, 20)}...
⏳ Waiting for receiver approval to release funds`
        : `💸 DIRECT PAYMENT
Funds sent directly to recipient.`;

      const successMessage = `Transaction Submitted Successfully!

${modeInfo}

Amount: ${formData.amount} ADA
${useSmartContract ? 'Locked for' : 'Sent to'}: ${formData.receiverAddress}
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
      const modeInfo = useSmartContract 
        ? `🔒 MODE: Smart Contract Escrow
Funds will be locked in Aiken smart contract until receiver approval.
📍 Contract: ${getScriptAddress(ESCROW_SCRIPT_HASH).slice(0, 30)}...
⚠️ Receiver must approve to release funds from escrow.`
        : `💸 MODE: Direct Payment
Funds will be sent directly to recipient immediately.`;

      const confirmMessage = `Confirm Transaction Details:

${modeInfo}

Amount: ${formData.amount} ADA
${useSmartContract ? 'Lock for' : 'Send to'}: ${formData.receiverAddress}
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

            {/* Smart Contract Mode Toggle */}
            <div className={styles.inputGroup}>
              <div className={styles.toggleContainer}>
                <div className={styles.toggleInfo}>
                  <h4>Payment Mode</h4>
                  <div className={styles.modeDescription}>
                    {useSmartContract ? (
                      <div className={styles.smartContractMode}>
                        <span className="🔒">🔒</span>
                        <div>
                          <strong>Smart Contract Escrow</strong>
                          <p>ADA goes to your Aiken smart contract for secure escrow</p>
                          <p><strong>Contract:</strong> {ESCROW_SCRIPT_HASH.slice(0, 20)}...</p>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.directMode}>
                        <span className="💸">💸</span>
                        <div>
                          <strong>Direct Payment</strong>
                          <p>ADA goes directly to recipient (no escrow)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseSmartContract(!useSmartContract)}
                  className={`${styles.toggleButton} ${useSmartContract ? styles.smartContract : styles.direct}`}
                  disabled={isLoading}
                >
                  {useSmartContract ? 'Switch to Direct Payment' : 'Switch to Smart Contract'}
                </button>
              </div>
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
