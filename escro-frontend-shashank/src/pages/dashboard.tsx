import { useState, useEffect } from 'react';
import { useWallet } from '@meshsdk/react';
import Link from 'next/link';
import { fetchAddressTransactions, getMockTransactions, isBlockfrostAvailable } from '../utils/blockchain';

interface Transaction {
  id: string;
  timestamp: number;
  amount: string;
  recipient?: string;
  sender?: string;
  message?: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  txHash?: string;
  hash?: string;
  network: string;
  fees?: string;
  blockHeight?: number;
  confirmations?: number;
}

interface TransactionCategory {
  title: string;
  transactions: Transaction[];
  color: string;
  icon: string;
}

interface MessageCategory {
  category: string;
  keywords: string[];
  transactions: Transaction[];
  color: string;
  icon: string;
}

export default function Dashboard() {
  const { connected, wallet } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Load blockchain transactions when component mounts
  useEffect(() => {
    if (connected && wallet && walletAddress) {
      fetchBlockchainTransactions();
    }
  }, [connected, wallet, walletAddress]);

  // Get wallet address when connected
  useEffect(() => {
    if (connected && wallet) {
      getWalletAddress();
    } else {
      setTransactions([]);
      setWalletAddress('');
      setError('');
    }
  }, [connected, wallet]);

  const getWalletAddress = async () => {
    try {
      if (wallet) {
        const addresses = await wallet.getUsedAddresses();
        if (addresses.length > 0) {
          setWalletAddress(addresses[0]);
        }
      }
    } catch (error) {
      console.error('Error getting wallet address:', error);
    }
  };

  const fetchBlockchainTransactions = async () => {
    if (!walletAddress) {
      setError('No wallet address available');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let blockchainTxs: Transaction[] = [];
      
      if (isBlockfrostAvailable()) {
        // Use real Blockfrost API for Preprod network
        const fetchedTxs = await fetchAddressTransactions(walletAddress, 'preprod', 1, 50);
        blockchainTxs = fetchedTxs.map(tx => ({
          id: tx.hash,
          timestamp: tx.timestamp,
          amount: tx.amount,
          recipient: tx.recipient || 'Unknown',
          sender: tx.sender,
          message: tx.message,
          status: tx.status,
          txHash: tx.hash,
          hash: tx.hash,
          network: 'preprod',
          fees: tx.fees,
          blockHeight: tx.blockHeight,
          confirmations: tx.confirmations
        }));
      } else {
        // Use mock data for development
        const mockTxs = getMockTransactions(walletAddress);
        blockchainTxs = mockTxs.map(tx => ({
          id: tx.hash,
          timestamp: tx.timestamp,
          amount: tx.amount,
          recipient: tx.recipient || 'Unknown',
          sender: tx.sender,
          message: tx.message,
          status: tx.status,
          txHash: tx.hash,
          hash: tx.hash,
          network: 'preprod',
          fees: tx.fees,
          blockHeight: tx.blockHeight,
          confirmations: tx.confirmations
        }));
      }

      setTransactions(blockchainTxs);
    } catch (error) {
      console.error('Error fetching blockchain transactions:', error);
      setError(`Failed to fetch blockchain data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Categorize transactions by status and error types
  const categorizeTransactions = (): TransactionCategory[] => {
    const successful = transactions.filter(tx => tx.status === 'success');
    const pending = transactions.filter(tx => tx.status === 'pending');
    const failed = transactions.filter(tx => tx.status === 'failed');

    // Group failed transactions by error type
    const failedByError = failed.reduce((acc, tx) => {
      const errorType = getErrorCategory(tx.errorMessage || '');
      if (!acc[errorType]) {
        acc[errorType] = [];
      }
      acc[errorType].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);

    const categories: TransactionCategory[] = [
      {
        title: 'Successful Transactions',
        transactions: successful,
        color: 'bg-green-100 border-green-300 text-green-800',
        icon: '✅'
      },
      {
        title: 'Pending Transactions',
        transactions: pending,
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        icon: '⏳'
      }
    ];

    // Add failed transaction categories
    Object.entries(failedByError).forEach(([errorType, txs]) => {
      categories.push({
        title: `Failed: ${errorType}`,
        transactions: txs,
        color: 'bg-red-100 border-red-300 text-red-800',
        icon: '❌'
      });
    });

    return categories;
  };

  // Categorize transactions by message content
  const categorizeByMessages = (): MessageCategory[] => {
    // Only include transactions with messages
    const txsWithMessages = transactions.filter(tx => tx.message && tx.message.trim() !== '');
    
    // Define message categories with keywords
    const messageCategories: MessageCategory[] = [
      {
        category: 'Payments & Purchases',
        keywords: ['payment', 'purchase', 'buy', 'pay', 'invoice', 'bill', 'shopping', 'store'],
        transactions: [],
        color: 'bg-blue-100 border-blue-300 text-blue-800',
        icon: '💳'
      },
      {
        category: 'Gifts & Tips',
        keywords: ['gift', 'tip', 'donation', 'birthday', 'christmas', 'present', 'thanks', 'reward'],
        transactions: [],
        color: 'bg-pink-100 border-pink-300 text-pink-800',
        icon: '🎁'
      },
      {
        category: 'Business & Work',
        keywords: ['salary', 'work', 'business', 'contract', 'service', 'freelance', 'client', 'project'],
        transactions: [],
        color: 'bg-indigo-100 border-indigo-300 text-indigo-800',
        icon: '💼'
      },
      {
        category: 'Family & Friends',
        keywords: ['family', 'friend', 'mom', 'dad', 'brother', 'sister', 'loan', 'borrow', 'help'],
        transactions: [],
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        icon: '👨‍👩‍👧‍👦'
      },
      {
        category: 'Food & Dining',
        keywords: ['food', 'dinner', 'lunch', 'restaurant', 'coffee', 'meal', 'pizza', 'delivery'],
        transactions: [],
        color: 'bg-orange-100 border-orange-300 text-orange-800',
        icon: '🍽️'
      },
      {
        category: 'Testing & Development',
        keywords: ['test', 'testing', 'demo', 'example', 'try', 'sample', 'debug', 'dev'],
        transactions: [],
        color: 'bg-purple-100 border-purple-300 text-purple-800',
        icon: '🧪'
      },
      {
        category: 'Other Messages',
        keywords: [],
        transactions: [],
        color: 'bg-gray-100 border-gray-300 text-gray-800',
        icon: '💬'
      }
    ];

    // Categorize transactions based on message content
    txsWithMessages.forEach(tx => {
      const message = tx.message!.toLowerCase();
      let categorized = false;

      // Check each category (except "Other Messages" which is the catch-all)
      for (let i = 0; i < messageCategories.length - 1; i++) {
        const category = messageCategories[i];
        const hasKeyword = category.keywords.some(keyword => 
          message.includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          category.transactions.push(tx);
          categorized = true;
          break;
        }
      }

      // If not categorized, add to "Other Messages"
      if (!categorized) {
        messageCategories[messageCategories.length - 1].transactions.push(tx);
      }
    });

    // Filter out empty categories
    return messageCategories.filter(category => category.transactions.length > 0);
  };

  // Categorize error messages
  const getErrorCategory = (errorMessage: string): string => {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('insufficient') || message.includes('depleted')) {
      return 'Insufficient Funds';
    }
    if (message.includes('declined') || message.includes('cancelled')) {
      return 'User Cancelled';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'Network Issues';
    }
    if (message.includes('address') || message.includes('invalid')) {
      return 'Invalid Address';
    }
    if (message.includes('timeout')) {
      return 'Timeout';
    }
    return 'Other Errors';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString() + ' ' + 
           new Date(timestamp).toLocaleTimeString();
  };

  const formatAmount = (amount: string) => {
    return `${parseFloat(amount).toFixed(6)} ADA`;
  };

  const categories = categorizeTransactions();
  const messageCategories = categorizeByMessages();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 rule-book-pattern flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 border text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-lg font-medium text-gray-900 mb-2">Loading Blockchain Data</div>
          <div className="text-gray-600">Fetching transactions from Cardano Preprod network...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 rule-book-pattern">
      {/* Paper texture overlay */}
      <div className="absolute inset-0 paper-texture opacity-30 pointer-events-none"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Transaction Dashboard
              </h1>
              <p className="text-gray-600">
                View and analyze your Cardano transaction history on Preprod network
              </p>
            </div>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Wallet
            </Link>
          </div>
        </div>

        {/* Connection Status */}
        {!connected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-yellow-600 mr-3">⚠️</div>
              <div>
                <h3 className="font-medium text-yellow-800">Wallet Not Connected</h3>
                <p className="text-yellow-700 text-sm">
                  Connect your wallet from the main page to see live transaction data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Source Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 border mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Blockchain Transaction Data</h3>
              <p className="text-sm text-gray-600">
                Real-time data from Cardano Preprod (Testnet) network
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                PREPROD
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Blockchain Data
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-2 mr-4">
            </div>
            <button
              onClick={fetchBlockchainTransactions}
              disabled={loading || !connected || !walletAddress}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm"
            >
              {loading ? '⏳ Loading...' : '� Refresh Data'}
            </button>
          </div>
          
          {connected && walletAddress && (
            <div className="mt-3 text-xs text-gray-500">
              <span className="font-medium">Wallet Address:</span>
              <span className="font-mono ml-1">{walletAddress.slice(0, 20)}...{walletAddress.slice(-10)}</span>
            </div>
          )}
          
          {!isBlockfrostAvailable() && (
            <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded border">
              ⚠️ Using mock data. Add NEXT_PUBLIC_BLOCKFROST_API_KEY to .env.local for real blockchain data.
            </div>
          )}
          
          {isBlockfrostAvailable() && (
            <div className="mt-3 text-xs text-green-600 bg-green-50 p-2 rounded border">
              ✅ Blockfrost API configured for Preprod network - Real blockchain data available
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">❌</div>
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center">
              <div className="text-2xl mr-3">✅</div>
              <div>
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">
                  {transactions.filter(tx => tx.status === 'success').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center">
              <div className="text-2xl mr-3">❌</div>
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {transactions.filter(tx => tx.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⏳</div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {transactions.filter(tx => tx.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Categories */}
        {transactions.length === 0 && !loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border">
            <div className="text-4xl mb-4">�</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Blockchain Transactions Found</h3>
            <p className="text-gray-600 mb-4">
              {!connected 
                ? "Connect your wallet to view blockchain transaction history."
                : !walletAddress
                ? "Getting wallet address..."
                : "No transactions found for this wallet address on the blockchain."
              }
            </p>
            {!connected && (
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Wallet →
              </Link>
            )}
            {connected && walletAddress && (
              <button 
                onClick={fetchBlockchainTransactions}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Refresh Blockchain Data'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category, index) => (
              category.transactions.length > 0 && (
                <div key={index} className="bg-white rounded-lg shadow-md border overflow-hidden">
                  <div className={`p-4 border-b ${category.color}`}>
                    <h3 className="font-semibold flex items-center">
                      <span className="mr-2">{category.icon}</span>
                      {category.title}
                      <span className="ml-2 text-sm font-normal">
                        ({category.transactions.length})
                      </span>
                    </h3>
                  </div>
                  <div className="divide-y">
                    {category.transactions.map((tx) => (
                      <div key={tx.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-2">
                              <span className="font-medium">
                                {formatAmount(tx.amount)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(tx.timestamp)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                tx.network === 'preprod' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {tx.network}
                              </span>
                              {tx.confirmations && (
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                  {tx.confirmations} confirmations
                                </span>
                              )}
                            </div>
                            {tx.recipient && (
                              <div className="text-sm text-gray-600 mb-1">
                                To: <span className="font-mono text-xs">{tx.recipient}</span>
                              </div>
                            )}
                            {tx.sender && tx.sender !== tx.recipient && (
                              <div className="text-sm text-gray-600 mb-1">
                                From: <span className="font-mono text-xs">{tx.sender}</span>
                              </div>
                            )}
                            {tx.fees && (
                              <div className="text-sm text-gray-600 mb-1">
                                Fees: <span className="font-medium">{parseFloat(tx.fees).toFixed(6)} ADA</span>
                              </div>
                            )}
                            {tx.blockHeight && (
                              <div className="text-sm text-gray-600 mb-1">
                                Block: <span className="font-mono">{tx.blockHeight}</span>
                              </div>
                            )}
                            {tx.message && (
                              <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border-l-4 border-blue-200 mb-2">
                                <span className="font-medium">Message:</span> "{tx.message}"
                              </div>
                            )}
                            {tx.errorMessage && (
                              <div className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-200">
                                <span className="font-medium">Error:</span> {tx.errorMessage}
                              </div>
                            )}
                            {(tx.txHash || tx.hash) && (
                              <div className="text-xs text-blue-600 mt-2">
                                <a 
                                  href={tx.network === 'preprod' 
                                    ? `https://preprod.cardanoscan.io/transaction/${tx.txHash || tx.hash}`
                                    : `https://cardanoscan.io/transaction/${tx.txHash || tx.hash}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline inline-flex items-center"
                                >
                                  View on Explorer
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Message Categories Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">💬 Message Categories</h2>
                <p className="text-gray-600 mt-1">
                  Transactions categorized by blockchain message content
                </p>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {messageCategories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💬</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Messages Found</h3>
                  <p className="text-gray-600">
                    No transactions with messages found in your blockchain history.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messageCategories.map((category, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg border overflow-hidden">
                      <div className={`p-4 border-b ${category.color}`}>
                        <h3 className="font-semibold flex items-center">
                          <span className="mr-2 text-xl">{category.icon}</span>
                          {category.category}
                          <span className="ml-2 text-sm font-normal">
                            ({category.transactions.length} transactions)
                          </span>
                        </h3>
                        {category.keywords.length > 0 && (
                          <p className="text-xs mt-1 opacity-75">
                            Keywords: {category.keywords.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="divide-y bg-white">
                        {category.transactions.map((tx) => (
                          <div key={tx.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <span className="font-medium text-gray-900">
                                    {formatAmount(tx.amount)}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {formatDate(tx.timestamp)}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-300">
                                  <span className="font-medium">Message:</span> "{tx.message}"
                                </div>
                                {(tx.txHash || tx.hash) && (
                                  <div className="text-xs text-blue-600 mt-2">
                                    <a 
                                      href={`https://preprod.cardanoscan.io/transaction/${tx.txHash || tx.hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline inline-flex items-center"
                                    >
                                      View Transaction
                                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}