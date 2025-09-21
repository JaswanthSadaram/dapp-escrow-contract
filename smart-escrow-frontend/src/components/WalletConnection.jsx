import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  AccountBalanceWallet,
  Security,
  Speed,
  Verified,
  SmartToy
} from '@mui/icons-material';
import { CardanoWallet, useWallet } from '@meshsdk/react';

function WalletConnection() {
  const { connect, connected, wallet } = useWallet();

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Security sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            Smart Escrow DApp
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            AI-Powered Secure Transactions on Cardano
          </Typography>
        </Box>

        {/* Features List */}
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Features
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Security color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Secure Escrow"
                secondary="Funds locked until both parties approve"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SmartToy color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="AI Categorization"
                secondary="Automatic transaction categorization using Gemini AI"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Speed color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Fast & Reliable"
                secondary="Built on Cardano blockchain with Aiken smart contracts"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Verified color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Transparent"
                secondary="All transactions and approvals recorded on blockchain"
              />
            </ListItem>
          </List>
        </Paper>

        {/* Wallet Connection */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Connect Your Cardano Wallet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Connect your wallet to start creating secure escrow transactions
          </Typography>
          
          <CardanoWallet />
          
          <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
            Supported wallets: Nami, Eternl, Flint, Yoroi, and more
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default WalletConnection;