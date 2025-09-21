import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { useWallet } from '@meshsdk/react';
import { CardanoWallet, MeshProvider } from '@meshsdk/react';
import { Transaction, resolveScriptHash } from '@meshsdk/core';
import Link from 'next/link';
import { 
  EscrowDatum, 
  TRANSACTION_CATEGORIES, 
  formatADA, 
  adaToLovelace 
} from '../utils/escrow';
import { 
  categorizeTransaction, 
  getCategoryEmoji, 
  getCategoryColor 
} from '../utils/ai';

const Home: NextPage = () => {
  const { connected, wallet } = useWallet();
  const [assets, setAssets] = useState<null | any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Network is fixed to preprod
  const [network, setNetwork] = useState('preprod');
  
  // Send money states
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");
  const [sendMessage, setSendMessage] = useState<string>("");
  const [sendLoading, setSendLoading] = useState<boolean>(false);
  const [sendStatus, setSendStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [sentMessage, setSentMessage] = useState<string>(""); // Store sent message for success display
  const [balance, setBalance] = useState<string>("0");
  const [balanceError, setBalanceError] = useState<string>("");
  
  // New escrow and AI states
  const [selectedCategory, setSelectedCategory] = useState<string>("Other");
  const [isAiCategorizing, setIsAiCategorizing] = useState<boolean>(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [showEscrowMode, setShowEscrowMode] = useState<boolean>(false);

  async function getAssets() {
    if (wallet) {
      try {
        setLoading(true);
        setBalanceError("");
        
        console.log('Fetching wallet assets and balance...');
        
        // Get assets
        const _assets = await wallet.getAssets();
        setAssets(_assets);
        console.log('Assets fetched:', _assets);
        
        // Get ADA balance with improved error handling
        const _balance = await wallet.getBalance();
        console.log('Raw balance data:', _balance);
        
        if (!_balance || _balance.length === 0) {
          setBalanceError("No balance data received from wallet");
          setBalance("0");
        } else {
          const adaBalance = _balance.find(asset => asset.unit === 'lovelace');
          console.log('ADA balance found:', adaBalance);
          
          if (adaBalance) {
            const balanceInAda = (parseInt(adaBalance.quantity) / 1_000_000).toFixed(6);
            setBalance(balanceInAda);
            console.log('Balance set to:', balanceInAda, 'ADA');
          } else {
            setBalanceError("No ADA (lovelace) found in wallet");
            setBalance("0");
            console.log('No lovelace unit found in balance array');
          }
        }
        
      } catch (error) {
        console.error('Error fetching assets/balance:', error);
        setBalanceError(`Error: ${error instanceof Error ? error.message : 'Failed to fetch balance'}`);
        setBalance("0");
      } finally {
        setLoading(false);
      }
    }
  }

  // Function to save transaction to localStorage
  const saveTransaction = (transaction: {
    amount: string;
    recipient: string;
    message?: string;
    status: 'success' | 'failed' | 'pending';
    errorMessage?: string;
    txHash?: string;
    category?: string;
    type?: string;
  }) => {
    try {
      const storedTransactions = localStorage.getItem('cardano_transactions');
      const transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
      
      const newTransaction = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        network,
        ...transaction
      };
      
      transactions.unshift(newTransaction); // Add to beginning
      
      // Keep only last 100 transactions
      if (transactions.length > 100) {
        transactions.splice(100);
      }
      
      localStorage.setItem('cardano_transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  // Automatically fetch balance when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      console.log('Wallet connected, automatically fetching balance...');
      getAssets();
      loadTransactionHistory();
    } else if (!connected) {
      // Reset states when wallet disconnects
      setAssets(null);
      setBalance("0");
      setBalanceError("");
      setSendStatus("");
      setTxHash("");
      setSentMessage("");
      setRecipientAddress("");
      setSendAmount("");
      setSendMessage("");
      setSelectedCategory("Other");
      setAiSuggestion("");
      setTransactionHistory([]);
    }
  }, [connected, wallet]);

  // Load transaction history from localStorage
  const loadTransactionHistory = () => {
    try {
      const storedTransactions = localStorage.getItem('cardano_transactions');
      if (storedTransactions) {
        const transactions = JSON.parse(storedTransactions);
        setTransactionHistory(transactions.slice(0, 10)); // Show last 10 transactions
      }
    } catch (error) {
      console.error('Error loading transaction history:', error);
    }
  };

  // Handle message change with AI categorization
  const handleMessageChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const message = e.target.value;
    setSendMessage(message);
    
    // Auto-categorize with AI if message is substantial
    if (message.trim().length > 3 && !isAiCategorizing) {
      setIsAiCategorizing(true);
      setAiSuggestion("");
      
      try {
        const suggestion = await categorizeTransaction(message.trim());
        setAiSuggestion(suggestion);
      } catch (error) {
        console.error('AI categorization failed:', error);
      } finally {
        setIsAiCategorizing(false);
      }
    }
  };  async function sendAda() {
    if (!wallet || !recipientAddress || !sendAmount) return;
    
    try {
      setSendLoading(true);
      setSendStatus("Validating transaction...");
      setTxHash("");

      // Validate address format (network-specific check)
      const addressPrefix = network === 'preprod' ? 'addr_test1' : 'addr1';
      if (!recipientAddress.startsWith(addressPrefix)) {
        throw new Error(`Invalid ${network} address format. Address must start with "${addressPrefix}"`);
      }

      // Validate amount
      const sendAmountNum = parseFloat(sendAmount);
      if (sendAmountNum <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Check balance before proceeding
      setSendStatus("Checking balance...");
      const walletBalance = await wallet.getBalance();
      const adaBalance = walletBalance.find(asset => asset.unit === 'lovelace');
      
      if (!adaBalance) {
        throw new Error('Unable to retrieve wallet balance');
      }

      const balanceInAda = parseInt(adaBalance.quantity) / 1_000_000;
      const minRequired = sendAmountNum + 2; // Add 2 ADA buffer for fees
      
      if (balanceInAda < minRequired) {
        throw new Error(`Insufficient balance. You have ${balanceInAda.toFixed(6)} ADA, but need at least ${minRequired.toFixed(6)} ADA (including ~2 ADA for fees)`);
      }

      setSendStatus("Creating categorized transaction...");
      
      // Convert ADA to Lovelace (1 ADA = 1,000,000 Lovelace)
      const amountInLovelace = (sendAmountNum * 1_000_000).toString();

      setSendStatus("Building transaction...");
      
      // Build transaction with enhanced metadata
      const tx = new Transaction({ initiator: wallet });
      tx.sendLovelace(recipientAddress, amountInLovelace);
      
      // Add enhanced metadata with categorization
      const metadata = {
        "674": {
          "msg": [sendMessage.trim() || 'Payment'],
          "category": selectedCategory,
          "timestamp": Math.floor(Date.now() / 1000),
          "type": showEscrowMode ? "escrow" : "direct_transfer"
        }
      };
      tx.setMetadata(674, metadata[674]);
      console.log('Adding categorized metadata to transaction:', metadata);

      const unsignedTx = await tx.build();
      
      setSendStatus("Waiting for signature...");
      const signedTx = await wallet.signTx(unsignedTx);
      
      setSendStatus("Submitting transaction...");
      const txHash = await wallet.submitTx(signedTx);
      
      setTxHash(txHash);
      setSentMessage(sendMessage);
      setSendStatus("success");
      
      // Save successful transaction with category
      saveTransaction({
        amount: sendAmount,
        recipient: recipientAddress,
        message: sendMessage || undefined,
        status: 'success',
        txHash: txHash,
        category: selectedCategory,
        type: showEscrowMode ? 'escrow' : 'direct'
      });
      
      // Refresh balance after successful transaction
      setTimeout(() => {
        getAssets();
        loadTransactionHistory();
      }, 3000);
      
      // Reset form after success
      setTimeout(() => {
        setRecipientAddress("");
        setSendAmount("");
        setSendMessage("");
        setSelectedCategory("Other");
        setAiSuggestion("");
      }, 5000);
      
    } catch (error) {
      console.error('Send ADA error:', error);
      setSendStatus("error");
      
      // Provide more specific error messages
      let errorMessage = 'Transaction failed';
      
      if (error instanceof Error) {
        if (error.message.includes('UTxO Fully Depleted')) {
          errorMessage = 'Insufficient funds. Please ensure you have enough ADA to cover the transaction amount plus network fees (~2 ADA).';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds in your wallet.';
        } else if (error.message.includes('User declined')) {
          errorMessage = 'Transaction was cancelled by user.';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Save failed transaction to localStorage
      saveTransaction({
        amount: sendAmount,
        recipient: recipientAddress,
        message: sendMessage || undefined,
        status: 'failed',
        errorMessage: errorMessage,
        category: selectedCategory
      });
      
    } finally {
      setSendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 rule-book-pattern">
      {/* Paper texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/20 via-transparent to-purple-50/20"></div>
      
      <div className="relative z-10 container mx-auto px-6 py-20 max-w-4xl margin-line">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="flex justify-between items-start mb-8">
            <div></div> {/* Empty div for balance */}
            <div className="flex-1">
              <h1 className="text-5xl font-light text-gray-800 mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
                  Cardano Coolies
                </span>
              </h1>
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto mb-6"></div>
              <p className="text-lg text-gray-600 max-w-xl mx-auto font-light leading-relaxed">
                A minimal interface for your Cardano wallet connection
              </p>
            </div>
            <div className="flex items-center">
              <Link 
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white/90 transition-all duration-300 border border-gray-200/50 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Network Information */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg paper-texture">
            <div className="flex items-center space-x-6">
              <span className="text-sm font-light text-gray-600">Network:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setNetwork('preprod')}
                  disabled={connected}
                  className={`px-4 py-2 rounded-xl text-sm font-light transition-all duration-300 ${
                    network === 'preprod'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : connected
                      ? 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${network === 'preprod' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                    <span>Preprod (Testnet)</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Network Warning */}
            {connected && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-xs text-orange-700 font-light text-center">
                  💡 Disconnect wallet to switch networks. Network changes require reconnection.
                </p>
              </div>
            )}
            
            {!connected && network === 'preprod' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-700 font-light text-center">
                  🧪 You're on Preprod testnet. Get free test ADA from the{' '}
                  <a 
                    href="https://docs.cardano.org/cardano-testnet/tools/faucet" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Cardano Faucet
                  </a>
                </p>
              </div>
            )}
            
            {!connected && network === 'mainnet' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-700 font-light text-center">
                  ⚠️ You're on Mainnet. Real ADA will be used for transactions!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Wallet Connection Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-500 paper-texture grid-pattern">
            <div className="text-center">
              <h2 className="text-2xl font-light text-gray-700 mb-2">Connect Wallet</h2>
              <p className="text-gray-500 mb-8 font-light">Choose your preferred Cardano wallet</p>
              
              <div className="inline-block transform transition-all duration-300 hover:scale-105">
                <CardanoWallet 
                  // Force re-render when network changes by adding key
                  key={network}
                />
              </div>
              
              {/* Network Status */}
              <div className="mt-4 text-sm text-gray-500 font-light">
                {connected ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Wallet Connected</span>
                    </div>
                    <div>
                      Network: <span className={`font-medium ${network === 'preprod' ? 'text-blue-600' : 'text-red-600'}`}>
                        {network === 'preprod' ? 'Preprod Testnet' : 'Cardano Mainnet'}
                      </span>
                    </div>
                    {loading && (
                      <div className="text-xs text-blue-600">
                        🔄 Loading wallet data...
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    Ready to connect to: <span className={`font-medium ${network === 'preprod' ? 'text-blue-600' : 'text-red-600'}`}>
                      {network === 'preprod' ? 'Preprod Testnet' : 'Cardano Mainnet'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connected State */}
          {connected && (
            <>
              {/* Troubleshooting Section for Zero Balance */}
              {parseFloat(balance) === 0 && !balanceError && !loading && (
                <div className="bg-orange-50/90 backdrop-blur-sm rounded-2xl p-8 border border-orange-200/50 shadow-lg">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-light text-orange-800 mb-2">Zero Balance Detected</h3>
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent mx-auto mb-4"></div>
                  </div>
                  
                  <div className="space-y-4 max-w-2xl mx-auto">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-orange-600 text-sm font-medium">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-800">Check Network</p>
                        <p className="text-xs text-orange-700 mt-1">
                          You're currently on <strong>{network === 'preprod' ? 'Preprod Testnet' : 'Mainnet'}</strong>. 
                          Make sure this matches where you have ADA.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-orange-600 text-sm font-medium">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-800">Wallet Network Setting</p>
                        <p className="text-xs text-orange-700 mt-1">
                          Check your wallet's network setting. It should match the network selected above.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-orange-600 text-sm font-medium">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-800">Get ADA</p>
                        <p className="text-xs text-orange-700 mt-1">
                          {network === 'preprod' ? (
                            <>Get free test ADA from the <a href="https://docs.cardano.org/cardano-testnet/tools/faucet" target="_blank" rel="noopener noreferrer" className="underline">Cardano Faucet</a></>
                          ) : (
                            'Purchase ADA from an exchange and send it to your wallet address'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Money Section */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 border border-gray-200/50 shadow-lg paper-texture grid-pattern">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-light text-gray-700 mb-2">Send ADA</h2>
                  <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto mb-4"></div>
                  <p className="text-gray-500 font-light">Transfer ADA to another wallet</p>
                  
                  {/* Balance Display */}
                  <div className="mt-6 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                    {balanceError ? (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-light text-red-600">Balance Error</span>
                        </div>
                        <p className="text-xs text-red-600 mb-3">{balanceError}</p>
                        <button
                          onClick={getAssets}
                          disabled={loading}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg transition-colors duration-200 disabled:opacity-50"
                        >
                          {loading ? 'Refreshing...' : 'Retry'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            loading 
                              ? 'bg-blue-500 animate-pulse' 
                              : parseFloat(balance) > 0 
                              ? 'bg-green-500' 
                              : 'bg-orange-500'
                          }`}></div>
                          <span className="text-sm font-light text-gray-600">Available Balance:</span>
                          <span className="text-lg font-medium text-gray-800">
                            {loading ? 'Loading...' : `${balance} ADA`}
                          </span>
                          <button
                            onClick={getAssets}
                            disabled={loading}
                            className="ml-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors duration-200 disabled:opacity-50"
                            title="Refresh balance"
                          >
                            {loading ? '🔄' : '↻'}
                          </button>
                        </div>
                        {loading && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-700 font-light">
                              🔄 Fetching balance from wallet...
                            </p>
                          </div>
                        )}
                        {!loading && parseFloat(balance) === 0 && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-xs text-orange-700 font-light">
                              ⚠️ Zero balance detected. Make sure you're on the correct network where you have ADA.
                              {network === 'preprod' && (
                                <span className="block mt-1">
                                  For testnet ADA, visit the{' '}
                                  <a 
                                    href="https://docs.cardano.org/cardano-testnet/tools/faucet" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="underline hover:no-underline"
                                  >
                                    Cardano Faucet
                                  </a>
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        {parseFloat(balance) > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            ~2 ADA will be reserved for network fees
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="max-w-md mx-auto space-y-6">
                  {/* Recipient Address Input */}
                  <div>
                    <label className="block text-sm font-light text-gray-600 mb-2">
                      Recipient Address ({network === 'preprod' ? 'Testnet' : 'Mainnet'})
                    </label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder={network === 'preprod' ? 'addr_test1...' : 'addr1...'}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all duration-300 bg-white/80 text-gray-700 font-light"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {network === 'preprod' 
                        ? 'Use testnet addresses starting with "addr_test1"' 
                        : 'Use mainnet addresses starting with "addr1"'
                      }
                    </p>
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="block text-sm font-light text-gray-600 mb-2">
                      Transaction Message (Optional)
                    </label>
                    <textarea
                      value={sendMessage}
                      onChange={handleMessageChange}
                      placeholder="Add a note or message to this transaction..."
                      maxLength={64}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all duration-300 bg-white/80 text-gray-700 font-light resize-none"
                      rows={3}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500">
                        Message will be stored permanently on the blockchain
                      </p>
                      <p className="text-xs text-gray-400">
                        {sendMessage.length}/64
                      </p>
                    </div>
                  </div>

                  {/* Category Selection with AI Suggestions */}
                  <div>
                    <label className="block text-sm font-light text-gray-600 mb-2">
                      Transaction Category
                    </label>
                    <div className="space-y-3">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all duration-300 bg-white/80 text-gray-700 font-light"
                      >
                        {TRANSACTION_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {getCategoryEmoji(category)} {category}
                          </option>
                        ))}
                      </select>
                      
                      {/* AI Suggestion Display */}
                      {aiSuggestion && aiSuggestion !== selectedCategory && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="text-blue-600">🤖</span>
                            <span className="text-sm text-blue-700">
                              AI suggests: <strong>{getCategoryEmoji(aiSuggestion)} {aiSuggestion}</strong>
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedCategory(aiSuggestion)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors duration-200"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                      
                      {/* Category Preview */}
                      {selectedCategory && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span 
                            className={`inline-block w-3 h-3 rounded-full ${getCategoryColor(selectedCategory)}`}
                          ></span>
                          <span>This transaction will be categorized as {selectedCategory}</span>
                        </div>
                      )}
                      
                      {/* Escrow Mode Toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Escrow Mode</span>
                          <p className="text-xs text-gray-500">Enhanced transaction with metadata</p>
                        </div>
                        <button
                          onClick={() => setShowEscrowMode(!showEscrowMode)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                            showEscrowMode ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              showEscrowMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-light text-gray-600 mb-2">
                      Amount (ADA)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.000001"
                        min="1"
                        max={Math.max(0, parseFloat(balance) - 2).toString()}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all duration-300 bg-white/80 text-gray-700 font-light"
                      />
                      <button
                        type="button"
                        onClick={() => setSendAmount(Math.max(0, parseFloat(balance) - 2).toFixed(6))}
                        disabled={parseFloat(balance) <= 2}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Max
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum sendable: {Math.max(0, parseFloat(balance) - 2).toFixed(6)} ADA
                    </p>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={sendAda}
                    disabled={sendLoading || !recipientAddress || !sendAmount}
                    className={`
                      w-full font-light py-4 px-8 rounded-xl transition-all duration-300 border
                      ${sendLoading || !recipientAddress || !sendAmount
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white border-gray-800 hover:border-gray-700'
                      }
                    `}
                  >
                    {sendLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-3"></div>
                        Sending...
                      </div>
                    ) : (
                      'Send ADA'
                    )}
                  </button>

                  {/* Transaction Status */}
                  {sendStatus && (
                    <div className={`p-4 rounded-xl border text-center ${
                      sendStatus === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : sendStatus.startsWith('Error') 
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      {sendStatus === 'success' ? (
                        <div>
                          <p className="font-medium">Transaction Successful!</p>
                          {sentMessage && (
                            <div className="text-sm mt-2 p-2 bg-gray-50 rounded-lg border">
                              <span className="font-medium">Message:</span>
                              <p className="text-gray-700 mt-1 italic">"{sentMessage}"</p>
                            </div>
                          )}
                          {txHash && (
                            <div className="text-sm mt-2">
                              <span className="font-medium">TX Hash:</span>
                              <br />
                              <span className="font-mono break-all text-blue-600">{txHash}</span>
                              <br />
                              <a 
                                href={network === 'preprod' 
                                  ? `https://preprod.cardanoscan.io/transaction/${txHash}`
                                  : `https://cardanoscan.io/transaction/${txHash}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 underline text-xs mt-1"
                              >
                                View on {network === 'preprod' ? 'Preprod' : 'Mainnet'} Explorer
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="font-light">{sendStatus}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction History */}
              {transactionHistory.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/50 mt-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-light text-gray-800 mb-2">Transaction History</h3>
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto mb-4"></div>
                  </div>
                  
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {transactionHistory.slice(0, 5).map((tx, index) => (
                      <div key={tx.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            tx.status === 'success' ? 'bg-green-500' : 
                            tx.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-800">{tx.amount} ADA</span>
                              {tx.category && (
                                <span className="text-sm text-gray-600">
                                  {getCategoryEmoji(tx.category)} {tx.category}
                                </span>
                              )}
                              {tx.type === 'escrow' && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  Escrow
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              to {tx.recipient.slice(0, 12)}...{tx.recipient.slice(-8)}
                            </p>
                            {tx.message && (
                              <p className="text-xs text-gray-500 italic mt-1">"{tx.message}"</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </p>
                          {tx.txHash && (
                            <a 
                              href={network === 'preprod' 
                                ? `https://preprod.cardanoscan.io/transaction/${tx.txHash}`
                                : `https://cardanoscan.io/transaction/${tx.txHash}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {transactionHistory.length > 5 && (
                      <div className="text-center">
                        <Link href="/dashboard">
                          <span className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer">
                            View all {transactionHistory.length} transactions →
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </>
          )}
        </div>

        {/* Footer */}
        
      </div>
    </div>
  );
};

export default Home;