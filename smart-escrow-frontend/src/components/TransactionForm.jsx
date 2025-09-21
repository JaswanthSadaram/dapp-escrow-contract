import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Send,
  SmartToy,
  AccountBalanceWallet,
  Person,
  Message,
  Category,
  AttachMoney
} from '@mui/icons-material';
import { useWallet } from '@meshsdk/react';
import { v4 as uuidv4 } from 'uuid';

// Predefined contacts for demo purposes
const DEMO_CONTACTS = [
  { 
    name: "Alice Johnson", 
    address: "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x" 
  },
  { 
    name: "Bob Smith", 
    address: "addr1qy8ac7qqy0vtulyl7wlws6uqpxl6cedpgaqu9wgdtdpa3v7mek8wfr8sehmlvwxxm7p4pz2y6qrcw2j4qrp8fdhxklqg6j2qru" 
  },
  { 
    name: "Carol Williams", 
    address: "addr1qz9fg5zrttz9dt3p2zqjh2q7jxf2zl5c8vkk8f7q4t3p2zqjh2q7jxf2zl5c8vkk8f7q4t3p2zqjh2q7jxf2zl5c8vkk" 
  },
  { 
    name: "David Brown", 
    address: "addr1q8h5fg2zrttz9dt3p2zqjh2q7jxf2zl5c8vkk8f7q4t3p2zqjh2q7jxf2zl5c8vkk8f7q4t3p2zqjh2q7jxf2zl5c8vk" 
  }
];

// AI categorization function
const categorizeTransaction = async (message) => {
  try {
    // Replace with your Gemini API key
    const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // You'll need to add this
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      // Fallback categorization for demo
      const categories = ['Food', 'Shopping', 'Bills', 'Entertainment', 'Transport', 'Services', 'Investment', 'Gift', 'Other'];
      const messageWords = message.toLowerCase();
      
      if (messageWords.includes('food') || messageWords.includes('restaurant') || messageWords.includes('meal')) return 'Food';
      if (messageWords.includes('shop') || messageWords.includes('buy') || messageWords.includes('purchase')) return 'Shopping';
      if (messageWords.includes('bill') || messageWords.includes('utility') || messageWords.includes('rent')) return 'Bills';
      if (messageWords.includes('movie') || messageWords.includes('game') || messageWords.includes('entertainment')) return 'Entertainment';
      if (messageWords.includes('transport') || messageWords.includes('taxi') || messageWords.includes('travel')) return 'Transport';
      if (messageWords.includes('service') || messageWords.includes('work') || messageWords.includes('design')) return 'Services';
      if (messageWords.includes('investment') || messageWords.includes('crypto') || messageWords.includes('trade')) return 'Investment';
      if (messageWords.includes('gift') || messageWords.includes('present') || messageWords.includes('birthday')) return 'Gift';
      
      return 'Other';
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Categorize this transaction message into one of these categories: Food, Shopping, Bills, Entertainment, Transport, Services, Investment, Gift, Other. 
            
            Message: "${message}"
            
            Respond with only the category name.`
          }]
        }]
      })
    });
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('AI categorization failed:', error);
    return 'Other'; // Fallback category
  }
};

function TransactionForm({ onSuccess, walletBalance }) {
  const { wallet, connected } = useWallet();
  const [formData, setFormData] = useState({
    receiverName: '',
    receiverAddress: '',
    amount: '',
    message: ''
  });
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [senderAddress, setSenderAddress] = useState('');

  // Get sender address when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      loadSenderAddress();
    }
  }, [connected, wallet]);

  const loadSenderAddress = async () => {
    try {
      const addresses = await wallet.getUsedAddresses();
      setSenderAddress(addresses[0]);
    } catch (error) {
      console.error('Error loading sender address:', error);
    }
  };

  // Auto-categorize when message changes
  useEffect(() => {
    if (formData.message.length > 10) {
      const debounceTimer = setTimeout(async () => {
        setIsCategorizing(true);
        try {
          const aiCategory = await categorizeTransaction(formData.message);
          setCategory(aiCategory);
        } catch (error) {
          console.error('Categorization error:', error);
        }
        setIsCategorizing(false);
      }, 1000);

      return () => clearTimeout(debounceTimer);
    }
  }, [formData.message]);

  const handleContactSelect = (event) => {
    const selectedContact = DEMO_CONTACTS.find(contact => contact.name === event.target.value);
    if (selectedContact) {
      setFormData(prev => ({
        ...prev,
        receiverName: selectedContact.name,
        receiverAddress: selectedContact.address
      }));
    }
  };

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.receiverAddress) {
      setError('Please select a receiver');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (parseFloat(formData.amount) > walletBalance) {
      setError(`Insufficient funds. You have ${walletBalance.toFixed(2)} ADA`);
      return false;
    }
    if (!formData.message.trim()) {
      setError('Please enter a transaction message');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      // Get final category if not already set
      let finalCategory = category;
      if (!finalCategory) {
        finalCategory = await categorizeTransaction(formData.message);
      }

      // Create transaction data
      const transactionData = {
        sender: senderAddress,
        receiver: formData.receiverAddress,
        amount: parseFloat(formData.amount),
        message: formData.message,
        category: finalCategory,
        transactionId: uuidv4(),
        timestamp: Math.floor(Date.now() / 1000),
        senderConfirmed: false,
        receiverConfirmed: false
      };

      // TODO: Implement actual blockchain transaction
      // For now, we'll simulate success
      console.log('Transaction data:', transactionData);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess('Transaction created successfully! Waiting for approvals...');
      setFormData({
        receiverName: '',
        receiverAddress: '',
        amount: '',
        message: ''
      });
      setCategory('');
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Transaction error:', error);
      setError('Transaction failed. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        {/* Receiver Selection */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Select Receiver</InputLabel>
            <Select
              value={formData.receiverName}
              onChange={handleContactSelect}
              label="Select Receiver"
              startAdornment={
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              }
            >
              {DEMO_CONTACTS.map((contact) => (
                <MenuItem key={contact.name} value={contact.name}>
                  <Box>
                    <Typography variant="body1">{contact.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {contact.address.slice(0, 20)}...
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Amount */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Amount (ADA)"
            type="number"
            value={formData.amount}
            onChange={handleInputChange('amount')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AttachMoney />
                </InputAdornment>
              ),
              inputProps: { min: 0, step: 0.01 }
            }}
            helperText={`Available: ${walletBalance.toFixed(2)} ADA`}
            required
          />
        </Grid>

        {/* Category Display */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              AI Category
            </Typography>
            {isCategorizing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Categorizing...</Typography>
              </Box>
            ) : (
              <Chip
                icon={<SmartToy />}
                label={category || 'Enter message to categorize'}
                color={category ? 'primary' : 'default'}
                variant={category ? 'filled' : 'outlined'}
              />
            )}
          </Box>
        </Grid>

        {/* Message */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Transaction Message"
            multiline
            rows={3}
            value={formData.message}
            onChange={handleInputChange('message')}
            placeholder="Describe what this payment is for..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <Message />
                </InputAdornment>
              )
            }}
            helperText="AI will automatically categorize your transaction based on this message"
            required
          />
        </Grid>

        {/* Transaction Summary */}
        {formData.receiverName && formData.amount && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transaction Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">To:</Typography>
                    <Typography variant="body1">{formData.receiverName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Amount:</Typography>
                    <Typography variant="h6" color="primary.main">{formData.amount} ADA</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Category:</Typography>
                    <Chip label={category || 'Pending...'} size="small" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Error/Success Messages */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        {success && (
          <Grid item xs={12}>
            <Alert severity="success">{success}</Alert>
          </Grid>
        )}

        {/* Submit Button */}
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isLoading || !connected}
            startIcon={isLoading ? <CircularProgress size={20} /> : <Send />}
            sx={{ py: 2 }}
          >
            {isLoading ? 'Creating Transaction...' : 'Create Escrow Transaction'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

export default TransactionForm;