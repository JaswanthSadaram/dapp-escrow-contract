// Blockchain API utilities for fetching Cardano transaction data
// Note: Install @blockfrost/blockfrost-js package for full functionality

interface BlockchainTransaction {
  hash: string;
  block: string;
  block_height: number;
  block_time: number;
  slot: number;
  index: number;
  output_amount: Array<{
    unit: string;
    quantity: string;
  }>;
  fees: string;
  deposit: string;
  size: number;
  invalid_before?: string;
  invalid_hereafter?: string;
  utxo_count: number;
  withdrawal_count: number;
  mir_cert_count: number;
  delegation_count: number;
  stake_cert_count: number;
  pool_update_count: number;
  pool_retire_count: number;
  asset_mint_or_burn_count: number;
  redeemer_count: number;
  valid_contract: boolean;
}

interface TransactionMetadata {
  label: string;
  json_metadata: any;
}

interface ParsedTransaction {
  id: string;
  hash: string;
  timestamp: number;
  amount: string;
  recipient?: string;
  sender?: string;
  message?: string;
  status: 'success' | 'failed' | 'pending';
  fees: string;
  network: string;
  blockHeight: number;
  confirmations?: number;
}

// Blockfrost API configuration
const BLOCKFROST_CONFIG = {
  preprod: {
    url: 'https://cardano-preprod.blockfrost.io/api/v0',
    // Use preprod key if available, otherwise fall back to mock data
    apiKey: process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || 'preprod_mock'
  },
  mainnet: {
    url: 'https://cardano-mainnet.blockfrost.io/api/v0',
    apiKey: process.env.NEXT_PUBLIC_BLOCKFROST_MAINNET_API_KEY || 'mainnet_mock'
  }
};

/**
 * Fetch transaction history for a given address from Cardano blockchain
 */
export async function fetchAddressTransactions(
  address: string, 
  network: 'preprod' | 'mainnet' = 'preprod',
  page: number = 1,
  count: number = 50
): Promise<ParsedTransaction[]> {
  try {
    const config = BLOCKFROST_CONFIG[network];
    
    // Fetch address transactions
    const response = await fetch(
      `${config.url}/addresses/${address}/transactions?page=${page}&count=${count}&order=desc`,
      {
        headers: {
          'project_id': config.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Blockfrost API error: ${response.status} ${response.statusText}`);
    }

    const transactions = await response.json();
    
    // Parse each transaction
    const parsedTransactions: ParsedTransaction[] = [];
    
    for (const tx of transactions) {
      try {
        const txDetails = await fetchTransactionDetails(tx.tx_hash, network);
        const txMetadata = await fetchTransactionMetadata(tx.tx_hash, network);
        
        parsedTransactions.push({
          id: tx.tx_hash,
          hash: tx.tx_hash,
          timestamp: tx.block_time * 1000, // Convert to milliseconds
          amount: calculateTransactionAmount(txDetails, address),
          recipient: getTransactionRecipient(txDetails, address),
          sender: getTransactionSender(txDetails, address),
          message: extractMessageFromMetadata(txMetadata),
          status: 'success', // If it's on blockchain, it's successful
          fees: (parseInt(txDetails.fees) / 1_000_000).toString(),
          network,
          blockHeight: tx.block_height,
          confirmations: await getCurrentBlockHeight(network) - tx.block_height
        });
      } catch (error) {
        console.error(`Error parsing transaction ${tx.tx_hash}:`, error);
      }
    }
    
    return parsedTransactions;
  } catch (error) {
    console.error('Error fetching address transactions:', error);
    throw error;
  }
}

/**
 * Fetch detailed transaction information
 */
async function fetchTransactionDetails(txHash: string, network: 'preprod' | 'mainnet'): Promise<BlockchainTransaction> {
  const config = BLOCKFROST_CONFIG[network];
  
  const response = await fetch(`${config.url}/txs/${txHash}`, {
    headers: {
      'project_id': config.apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transaction details: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch transaction metadata
 */
async function fetchTransactionMetadata(txHash: string, network: 'preprod' | 'mainnet'): Promise<TransactionMetadata[]> {
  const config = BLOCKFROST_CONFIG[network];
  
  try {
    const response = await fetch(`${config.url}/txs/${txHash}/metadata`, {
      headers: {
        'project_id': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No metadata found
      }
      throw new Error(`Failed to fetch transaction metadata: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching transaction metadata:', error);
    return [];
  }
}

/**
 * Get current block height
 */
async function getCurrentBlockHeight(network: 'preprod' | 'mainnet'): Promise<number> {
  const config = BLOCKFROST_CONFIG[network];
  
  const response = await fetch(`${config.url}/blocks/latest`, {
    headers: {
      'project_id': config.apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch current block height: ${response.status}`);
  }

  const block = await response.json();
  return block.height;
}

/**
 * Calculate transaction amount for a specific address
 */
function calculateTransactionAmount(txDetails: BlockchainTransaction, address: string): string {
  // This is a simplified calculation - you'd need to fetch UTXOs for exact amounts
  const lovelaceAmount = txDetails.output_amount.find(output => output.unit === 'lovelace');
  if (lovelaceAmount) {
    return (parseInt(lovelaceAmount.quantity) / 1_000_000).toString();
  }
  return '0';
}

/**
 * Get transaction recipient (simplified)
 */
function getTransactionRecipient(txDetails: BlockchainTransaction, senderAddress: string): string {
  // This would require fetching UTXOs to determine actual recipient
  return 'Unknown Recipient';
}

/**
 * Get transaction sender (simplified)
 */
function getTransactionSender(txDetails: BlockchainTransaction, address: string): string {
  return address; // Simplified - the address we're querying is the sender/receiver
}

/**
 * Extract message from transaction metadata
 */
function extractMessageFromMetadata(metadata: TransactionMetadata[]): string | undefined {
  for (const meta of metadata) {
    if (meta.label === '674' && meta.json_metadata) {
      // Standard message metadata label
      if (meta.json_metadata.msg && Array.isArray(meta.json_metadata.msg)) {
        return meta.json_metadata.msg.join(' ');
      }
      if (typeof meta.json_metadata === 'string') {
        return meta.json_metadata;
      }
    }
  }
  return undefined;
}

/**
 * Fetch transaction UTXOs for detailed input/output analysis
 */
export async function fetchTransactionUTXOs(txHash: string, network: 'preprod' | 'mainnet') {
  const config = BLOCKFROST_CONFIG[network];
  
  const response = await fetch(`${config.url}/txs/${txHash}/utxos`, {
    headers: {
      'project_id': config.apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transaction UTXOs: ${response.status}`);
  }

  return response.json();
}

/**
 * Mock function for development when Blockfrost API is not available
 */
export function getMockTransactions(address: string): ParsedTransaction[] {
  return [
    {
      id: 'mock1',
      hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      timestamp: Date.now() - 86400000, // 1 day ago
      amount: '10.5',
      recipient: 'addr_test1qp...example',
      message: 'Test transaction message',
      status: 'success',
      fees: '0.2',
      network: 'preprod',
      blockHeight: 12345,
      confirmations: 100
    },
    {
      id: 'mock2',
      hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      timestamp: Date.now() - 172800000, // 2 days ago
      amount: '5.0',
      recipient: 'addr_test1qq...example2',
      message: 'Another test message',
      status: 'success',
      fees: '0.18',
      network: 'preprod',
      blockHeight: 12340,
      confirmations: 105
    }
  ];
}

/**
 * Check if Blockfrost API is available for Preprod
 */
export function isBlockfrostAvailable(): boolean {
  const preprodKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
  
  // Check if we have a real preprod API key
  return !!(preprodKey && preprodKey !== 'preprod_mock' && preprodKey.startsWith('preprod'));
}

/**
 * Get network based on available API keys
 */
export function getAvailableNetwork(): 'preprod' | 'mainnet' | null {
  const preprodKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
  const mainnetKey = process.env.NEXT_PUBLIC_BLOCKFROST_MAINNET_API_KEY;
  
  if (preprodKey && preprodKey.startsWith('preprod')) {
    return 'preprod';
  }
  if (mainnetKey && mainnetKey.startsWith('mainnet')) {
    return 'mainnet';
  }
  return null;
}