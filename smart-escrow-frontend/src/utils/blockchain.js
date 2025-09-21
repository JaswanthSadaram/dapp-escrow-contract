import { Transaction } from '@meshsdk/core';

// Escrow validator address (this will be generated when you deploy your Aiken contract)
export const ESCROW_VALIDATOR_ADDRESS = "addr1w8qmxkacjdffxah0l3qg8hq2pmvs58q8lcy42zy9kda2ylc6dy5r4"; // Replace with actual address

// Helper function to convert string to hex (for ByteArray in Aiken)
export const stringToHex = (str) => {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
};

// Helper function to convert hex back to string
export const hexToString = (hex) => {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
};

/**
 * Create a new escrow transaction on the blockchain
 * @param {Object} wallet - MeshJS wallet instance
 * @param {Object} transactionData - Transaction details
 * @returns {Promise<string>} Transaction hash
 */
export const createEscrowTransaction = async (wallet, transactionData) => {
  try {
    const tx = new Transaction({ initiator: wallet });
    
    // Prepare the datum for the UTXO
    const datum = {
      sender: stringToHex(transactionData.sender),
      receiver: stringToHex(transactionData.receiver),
      amount: parseInt(transactionData.amount * 1000000), // Convert ADA to Lovelace
      message: stringToHex(transactionData.message),
      category: stringToHex(transactionData.category),
      transaction_id: stringToHex(transactionData.transactionId),
      timestamp: transactionData.timestamp,
      sender_confirmed: false,
      receiver_confirmed: false,
    };
    
    // Send ADA to the escrow validator with the datum
    tx.sendAssets({
      address: ESCROW_VALIDATOR_ADDRESS,
      datum: datum
    }, [
      {
        unit: 'lovelace',
        quantity: (parseInt(transactionData.amount * 1000000)).toString()
      }
    ]);
    
    // Sign and submit the transaction
    const signedTx = await wallet.signTx(tx);
    const txHash = await wallet.submitTx(signedTx);
    
    return txHash;
  } catch (error) {
    console.error('Error creating escrow transaction:', error);
    throw new Error('Failed to create escrow transaction');
  }
};

/**
 * Approve a transaction (sender or receiver confirmation)
 * @param {Object} wallet - MeshJS wallet instance
 * @param {Object} transaction - Transaction to approve
 * @param {string} userRole - 'sender' or 'receiver'
 * @returns {Promise<string>} Transaction hash
 */
export const approveTransaction = async (wallet, transaction, userRole) => {
  try {
    const tx = new Transaction({ initiator: wallet });
    
    // Determine the redeemer based on user role
    const redeemer = userRole === 'sender' ? 'ConfirmSender' : 'ConfirmReceiver';
    
    // Create updated datum
    const updatedDatum = {
      ...transaction.datum,
      sender_confirmed: userRole === 'sender' ? true : transaction.datum.sender_confirmed,
      receiver_confirmed: userRole === 'receiver' ? true : transaction.datum.receiver_confirmed,
    };
    
    // Check if both parties have now confirmed
    const bothConfirmed = updatedDatum.sender_confirmed && updatedDatum.receiver_confirmed;
    
    if (bothConfirmed) {
      // Release funds to receiver
      tx.redeemValue({
        value: transaction.utxo,
        script: getEscrowValidator(), // You'll need to load this from plutus.json
        redeemer: 'Release'
      });
      
      // Funds go directly to receiver (handled by validator)
    } else {
      // Update confirmation status
      tx.redeemValue({
        value: transaction.utxo,
        script: getEscrowValidator(),
        redeemer: redeemer
      });
      
      // Send back to escrow with updated datum
      tx.sendAssets({
        address: ESCROW_VALIDATOR_ADDRESS,
        datum: updatedDatum
      }, [
        {
          unit: 'lovelace',
          quantity: transaction.amount.toString()
        }
      ]);
    }
    
    const signedTx = await wallet.signTx(tx);
    const txHash = await wallet.submitTx(signedTx);
    
    return txHash;
  } catch (error) {
    console.error('Error approving transaction:', error);
    throw new Error('Failed to approve transaction');
  }
};

/**
 * Cancel a transaction and refund to sender
 * @param {Object} wallet - MeshJS wallet instance
 * @param {Object} transaction - Transaction to cancel
 * @returns {Promise<string>} Transaction hash
 */
export const cancelTransaction = async (wallet, transaction) => {
  try {
    const tx = new Transaction({ initiator: wallet });
    
    // Redeem the UTXO with Refund redeemer
    tx.redeemValue({
      value: transaction.utxo,
      script: getEscrowValidator(),
      redeemer: 'Refund'
    });
    
    // Funds go back to sender (handled by validator)
    
    const signedTx = await wallet.signTx(tx);
    const txHash = await wallet.submitTx(signedTx);
    
    return txHash;
  } catch (error) {
    console.error('Error canceling transaction:', error);
    throw new Error('Failed to cancel transaction');
  }
};

/**
 * Query pending transactions from the blockchain
 * @param {Object} wallet - MeshJS wallet instance
 * @param {string} userAddress - Current user's address
 * @returns {Promise<Array>} Array of pending transactions
 */
export const queryPendingTransactions = async (wallet, userAddress) => {
  try {
    // Query UTXOs at the escrow validator address
    const utxos = await wallet.getUtxos(ESCROW_VALIDATOR_ADDRESS);
    
    // Parse and filter transactions
    const transactions = utxos
      .filter(utxo => utxo.datum) // Only UTXOs with datum
      .map(utxo => {
        const datum = utxo.datum;
        
        return {
          utxo: utxo,
          txHash: utxo.txHash,
          sender: hexToString(datum.sender),
          receiver: hexToString(datum.receiver),
          amount: datum.amount / 1000000, // Convert Lovelace to ADA
          message: hexToString(datum.message),
          category: hexToString(datum.category),
          transactionId: hexToString(datum.transaction_id),
          timestamp: datum.timestamp * 1000, // Convert to milliseconds
          senderConfirmed: datum.sender_confirmed,
          receiverConfirmed: datum.receiver_confirmed,
          datum: datum
        };
      })
      .filter(tx => 
        // Only show transactions involving current user
        tx.sender === userAddress || tx.receiver === userAddress
      );
    
    return transactions;
  } catch (error) {
    console.error('Error querying transactions:', error);
    throw new Error('Failed to load pending transactions');
  }
};

/**
 * Load the escrow validator from plutus.json
 * This function should read the compiled Aiken contract
 */
export const getEscrowValidator = () => {
  // TODO: Load this from your plutus.json file generated by aiken build
  // For now, return a placeholder
  return {
    type: "PlutusV2",
    script: "your_compiled_plutus_script_here"
  };
};

/**
 * Get the escrow validator address
 * This should match the address generated when you deploy your contract
 */
export const getEscrowValidatorAddress = async () => {
  // TODO: Calculate this from your deployed contract
  return ESCROW_VALIDATOR_ADDRESS;
};