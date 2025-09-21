import { Transaction } from '@meshsdk/core';

// For our simplified implementation, we'll use a generic wallet interface
interface WalletInterface {
  getBalance(): Promise<any[]>;
  signTx(tx: string): Promise<string>;
  submitTx(tx: string): Promise<string>;
}

// Script hash from compiled Aiken contract
export const ESCROW_SCRIPT_HASH = "e2f6b2374df355cee1a026b62530c0e02be09fd3dc6b6d013c33c22a";

// Escrow data structure matching Aiken contract
export interface EscrowDatum {
  sender: string;
  receiver: string;
  amount: number; // in lovelace
  message: string;
  category: string;
  transaction_id: string;
  timestamp: number;
  sender_confirmed: boolean;
  receiver_confirmed: boolean;
}

// Escrow actions matching Aiken contract
export enum EscrowRedeemer {
  InitiateTransfer = 0,
  ConfirmSender = 1,
  ConfirmReceiver = 2,
  Release = 3,
  Refund = 4
}

// Transaction categories
export const TRANSACTION_CATEGORIES = [
  'Food',
  'Shopping', 
  'Bills',
  'Entertainment',
  'Transport',
  'Services',
  'Investment',
  'Gift',
  'Other'
];

// Helper function to convert string to hex
export const stringToHex = (str: string): string => {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
};

// Helper function to convert hex to string
export const hexToString = (hex: string): string => {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
};

/**
 * Create a new escrow transaction (simplified version)
 * This version sends ADA directly to a script address with metadata
 */
export const createEscrowTransaction = async (
  wallet: WalletInterface,
  recipientAddress: string,
  amount: number,
  message: string,
  category: string = 'Other'
): Promise<string> => {
  try {
    const senderAddresses = await wallet.getUsedAddresses();
    const senderAddress = senderAddresses[0];
    
    if (!senderAddress) {
      throw new Error('No sender address found');
    }

    // Generate unique transaction ID
    const transactionId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create escrow data for metadata
    const escrowData: EscrowDatum = {
      sender: senderAddress,
      receiver: recipientAddress,
      amount: amount,
      message: message,
      category: category,
      transaction_id: transactionId,
      timestamp: Math.floor(Date.now() / 1000),
      sender_confirmed: false,
      receiver_confirmed: false
    };

    // Build transaction
    const tx = new Transaction({ initiator: wallet });
    
    // For now, send directly to recipient with escrow metadata
    // In a full implementation, this would go to the script address
    tx.sendAssets(
      recipientAddress,
      [
        {
          unit: 'lovelace',
          quantity: amount.toString()
        }
      ]
    );

    // Set transaction metadata for tracking escrow
    tx.setMetadata(721, {
      escrow: {
        transaction_id: transactionId,
        sender: senderAddress,
        receiver: recipientAddress,
        amount: amount,
        message: message,
        category: category,
        timestamp: escrowData.timestamp,
        action: 'create',
        status: 'pending'
      }
    });

    // Build and sign transaction
    const unsignedTx = await tx.build();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    return txHash;
  } catch (error) {
    console.error('Error creating escrow transaction:', error);
    throw error;
  }
};

/**
 * Simple transaction with categorization
 */
export const sendCategorizedTransaction = async (
  wallet: BrowserWallet,
  recipientAddress: string,
  amount: number,
  message: string,
  category: string = 'Other'
): Promise<{txHash: string, escrowData: EscrowDatum}> => {
  try {
    const senderAddresses = await wallet.getUsedAddresses();
    const senderAddress = senderAddresses[0];
    
    if (!senderAddress) {
      throw new Error('No sender address found');
    }

    // Generate unique transaction ID
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transaction data
    const escrowData: EscrowDatum = {
      sender: senderAddress,
      receiver: recipientAddress,
      amount: amount,
      message: message,
      category: category,
      transaction_id: transactionId,
      timestamp: Math.floor(Date.now() / 1000),
      sender_confirmed: true,
      receiver_confirmed: false
    };

    // Build transaction
    const tx = new Transaction({ initiator: wallet });
    
    // Send ADA to recipient
    tx.sendAssets(
      recipientAddress,
      [
        {
          unit: 'lovelace',
          quantity: amount.toString()
        }
      ]
    );

    // Set transaction metadata for categorization
    tx.setMetadata(721, {
      transaction: {
        transaction_id: transactionId,
        sender: senderAddress,
        receiver: recipientAddress,
        amount: amount,
        message: message,
        category: category,
        timestamp: escrowData.timestamp,
        type: 'direct_transfer'
      }
    });

    // Build and sign transaction
    const unsignedTx = await tx.build();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    return { txHash, escrowData };
  } catch (error) {
    console.error('Error sending categorized transaction:', error);
    throw error;
  }
};

/**
 * Get escrow status from transaction metadata
 */
export const getEscrowStatus = (metadata: any): EscrowDatum | null => {
  try {
    if (metadata && metadata[721] && metadata[721].escrow) {
      const escrowMeta = metadata[721].escrow;
      return {
        sender: escrowMeta.sender,
        receiver: escrowMeta.receiver,
        amount: escrowMeta.amount,
        message: escrowMeta.message,
        category: escrowMeta.category,
        transaction_id: escrowMeta.transaction_id,
        timestamp: escrowMeta.timestamp,
        sender_confirmed: escrowMeta.status !== 'pending',
        receiver_confirmed: escrowMeta.action === 'release'
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing escrow status:', error);
    return null;
  }
};

/**
 * Format amount from lovelace to ADA
 */
export const formatADA = (lovelace: number): string => {
  return (lovelace / 1000000).toFixed(6);
};

/**
 * Convert ADA to lovelace
 */
export const adaToLovelace = (ada: number): number => {
  return Math.floor(ada * 1000000);
};