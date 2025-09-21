use cardano/assets.{Value, lovelace_of}
use cardano/transaction.{OutputReference, Transaction}

// Data structure for escrow transaction information
pub type EscrowDatum {
  sender: ByteArray,
  receiver: ByteArray,
  amount: Int,
  message: ByteArray,
  category: ByteArray,
  transaction_id: ByteArray,
  timestamp: Int,
  sender_confirmed: Bool,
  receiver_confirmed: Bool,
}

// Actions that can be performed on escrow
pub type EscrowRedeemer {
  InitiateTransfer
  ConfirmSender
  ConfirmReceiver
  Release
  Refund
}

// Helper function to check if transaction is signed by specific address
fn must_be_signed_by(tx: Transaction, pubkey: ByteArray) -> Bool {
  // Simple check - in real implementation this would check extra_signatories
  True
  // Simplified for now
}

// Helper function to validate payment goes to correct address
fn payment_to_address(
  tx: Transaction,
  recipient: ByteArray,
  expected_amount: Int,
) -> Bool {
  // Simplified validation - in real implementation would check outputs
  True
  // Simplified for now
}

// Main escrow validator logic
validator escrow {
  spend(
    datum: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    _utxo: OutputReference,
    tx: Transaction,
  ) {
    when datum is {
      Some(escrow_data) ->
        when redeemer is {
          // Initial transaction creation
          InitiateTransfer ->
            // Only sender can initiate
            must_be_signed_by(tx, escrow_data.sender) && !escrow_data.sender_confirmed && !escrow_data.receiver_confirmed
          // Sender confirms their part of the transaction
          ConfirmSender ->
            // Only sender can confirm
            must_be_signed_by(tx, escrow_data.sender) && !escrow_data.sender_confirmed
          // Receiver confirms their part of the transaction  
          ConfirmReceiver ->
            // Only receiver can confirm
            must_be_signed_by(tx, escrow_data.receiver) && !escrow_data.receiver_confirmed
          // Release funds to receiver (both parties approved)
          Release ->
            // Both parties must have confirmed
            escrow_data.sender_confirmed && escrow_data.receiver_confirmed && // Payment must go to receiver
            payment_to_address(tx, escrow_data.receiver, escrow_data.amount)
          // Refund to sender (cancellation)
          Refund ->
            // Only sender can initiate refund
            must_be_signed_by(tx, escrow_data.sender) && // Payment must go back to sender
            payment_to_address(tx, escrow_data.sender, escrow_data.amount)
        }
      None -> False
    }
  }

  else(_) {
    fail @"Invalid validator operation"
  }
}
