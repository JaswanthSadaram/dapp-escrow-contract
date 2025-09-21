import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  Send,
  Receipt,
  Person,
  AttachMoney,
  Category as CategoryIcon,
  Schedule,
  Refresh
} from '@mui/icons-material';
import { useWallet } from '@meshsdk/react';

// Demo data for pending transactions
const DEMO_TRANSACTIONS = [
  {
    id: 1,
    txHash: "tx_001",
    sender: "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x",
    senderName: "You",
    receiver: "addr1qy8ac7qqy0vtulyl7wlws6uqpxl6cedpgaqu9wgdtdpa3v7mek8wfr8sehmlvwxxm7p4pz2y6qrcw2j4qrp8fdhxklqg6j2qru",
    receiverName: "Alice Johnson",
    amount: 25.5,
    message: "Payment for website design services",
    category: "Services",
    timestamp: Date.now() - 3600000, // 1 hour ago
    senderConfirmed: false,
    receiverConfirmed: false,
    status: "pending"
  },
  {
    id: 2,
    txHash: "tx_002",
    sender: "addr1qy8ac7qqy0vtulyl7wlws6uqpxl6cedpgaqu9wgdtdpa3v7mek8wfr8sehmlvwxxm7p4pz2y6qrcw2j4qrp8fdhxklqg6j2qru",
    senderName: "Bob Smith",
    receiver: "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x",
    receiverName: "You",
    amount: 15.0,
    message: "Monthly gym membership fee",
    category: "Bills",
    timestamp: Date.now() - 7200000, // 2 hours ago
    senderConfirmed: true,
    receiverConfirmed: false,
    status: "pending"
  },
  {
    id: 3,
    txHash: "tx_003",
    sender: "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x",
    senderName: "You",
    receiver: "addr1qz9fg5zrttz9dt3p2zqjh2q7jxf2zl5c8vkk8f7q4t3p2zqjh2q7jxf2zl5c8vkk8f7q4t3p2zqjh2q7jxf2zl5c8vkk",
    receiverName: "Carol Williams",
    amount: 8.75,
    message: "Birthday gift for Carol",
    category: "Gift",
    timestamp: Date.now() - 10800000, // 3 hours ago
    senderConfirmed: true,
    receiverConfirmed: true,
    status: "completed"
  }
];

function PendingTransactions({ refreshTrigger, onTransactionUpdate }) {
  const { wallet, connected } = useWallet();
  const [transactions, setTransactions] = useState(DEMO_TRANSACTIONS);
  const [loading, setLoading] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Get user address when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      loadUserAddress();
    }
  }, [connected, wallet]);

  // Refresh transactions when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadTransactions();
    }
  }, [refreshTrigger]);

  const loadUserAddress = async () => {
    try {
      const addresses = await wallet.getUsedAddresses();
      setUserAddress(addresses[0]);
    } catch (error) {
      console.error('Error loading user address:', error);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual blockchain query
      // For now, simulate loading with demo data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, you would:
      // 1. Query UTXOs at the escrow validator address
      // 2. Parse datum from each UTXO
      // 3. Filter transactions involving current user
      
      setTransactions(DEMO_TRANSACTIONS);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (transaction) => {
    setActionLoading(transaction.id);
    try {
      // TODO: Implement actual blockchain transaction approval
      // This would involve:
      // 1. Creating a new transaction
      // 2. Spending the UTXO with appropriate redeemer
      // 3. Either updating confirmation status or releasing funds
      
      console.log('Approving transaction:', transaction.id);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update local state
      setTransactions(prev => prev.map(tx => {
        if (tx.id === transaction.id) {
          const isUserSender = tx.sender === userAddress;
          const isUserReceiver = tx.receiver === userAddress;
          
          let updatedTx = { ...tx };
          
          if (isUserSender) {
            updatedTx.senderConfirmed = true;
          }
          if (isUserReceiver) {
            updatedTx.receiverConfirmed = true;
          }
          
          // If both confirmed, mark as completed
          if (updatedTx.senderConfirmed && updatedTx.receiverConfirmed) {
            updatedTx.status = 'completed';
          }
          
          return updatedTx;
        }
        return tx;
      }));
      
      if (onTransactionUpdate) {
        onTransactionUpdate();
      }
      
    } catch (error) {
      console.error('Error approving transaction:', error);
    }
    setActionLoading(null);
  };

  const handleCancel = async (transaction) => {
    setActionLoading(transaction.id);
    try {
      // TODO: Implement actual blockchain refund
      console.log('Canceling transaction:', transaction.id);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remove from local state (in real app, would mark as cancelled)
      setTransactions(prev => prev.filter(tx => tx.id !== transaction.id));
      
      if (onTransactionUpdate) {
        onTransactionUpdate();
      }
      
    } catch (error) {
      console.error('Error canceling transaction:', error);
    }
    setActionLoading(null);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getStatusChip = (transaction) => {
    if (transaction.status === 'completed') {
      return <Chip icon={<CheckCircle />} label="Completed" color="success" size="small" />;
    }
    
    if (transaction.senderConfirmed && transaction.receiverConfirmed) {
      return <Chip icon={<CheckCircle />} label="Ready to Release" color="warning" size="small" />;
    }
    
    return <Chip icon={<Pending />} label="Pending Approval" color="default" size="small" />;
  };

  const canUserApprove = (transaction) => {
    const isUserSender = transaction.sender === userAddress;
    const isUserReceiver = transaction.receiver === userAddress;
    
    if (transaction.status === 'completed') return false;
    
    if (isUserSender && !transaction.senderConfirmed) return true;
    if (isUserReceiver && !transaction.receiverConfirmed) return true;
    
    return false;
  };

  const canUserCancel = (transaction) => {
    return transaction.sender === userAddress && transaction.status === 'pending';
  };

  const getUserRole = (transaction) => {
    if (transaction.sender === userAddress) return 'sender';
    if (transaction.receiver === userAddress) return 'receiver';
    return 'none';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Receipt sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No pending transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new escrow transaction to get started
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Refresh Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          startIcon={<Refresh />}
          onClick={loadTransactions}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Transaction</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {getUserRole(transaction) === 'sender' ? 'To: ' : 'From: '}
                        {getUserRole(transaction) === 'sender' ? transaction.receiverName : transaction.senderName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {transaction.message}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip 
                          icon={<CategoryIcon />} 
                          label={transaction.category} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6" color="primary.main">
                      {transaction.amount} ADA
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(transaction)}
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Sender: {transaction.senderConfirmed ? '✅' : '⏳'}
                        {' '}
                        Receiver: {transaction.receiverConfirmed ? '✅' : '⏳'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatTimestamp(transaction.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      {canUserApprove(transaction) && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={actionLoading === transaction.id ? <CircularProgress size={16} /> : <CheckCircle />}
                          onClick={() => handleApprove(transaction)}
                          disabled={actionLoading === transaction.id}
                        >
                          Approve
                        </Button>
                      )}
                      {canUserCancel(transaction) && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => handleCancel(transaction)}
                          disabled={actionLoading === transaction.id}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Mobile Card View */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Grid container spacing={2}>
          {transactions.map((transaction) => (
            <Grid item xs={12} key={transaction.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {transaction.amount} ADA
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getUserRole(transaction) === 'sender' ? 'To: ' : 'From: '}
                        {getUserRole(transaction) === 'sender' ? transaction.receiverName : transaction.senderName}
                      </Typography>
                    </Box>
                    {getStatusChip(transaction)}
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {transaction.message}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                    <Chip 
                      icon={<CategoryIcon />} 
                      label={transaction.category} 
                      size="small" 
                      variant="outlined" 
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(transaction.timestamp)}
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Confirmations - Sender: {transaction.senderConfirmed ? '✅' : '⏳'} Receiver: {transaction.receiverConfirmed ? '✅' : '⏳'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {canUserApprove(transaction) && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={actionLoading === transaction.id ? <CircularProgress size={16} /> : <CheckCircle />}
                        onClick={() => handleApprove(transaction)}
                        disabled={actionLoading === transaction.id}
                        fullWidth
                      >
                        Approve
                      </Button>
                    )}
                    {canUserCancel(transaction) && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => handleCancel(transaction)}
                        disabled={actionLoading === transaction.id}
                        fullWidth
                      >
                        Cancel
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

export default PendingTransactions;