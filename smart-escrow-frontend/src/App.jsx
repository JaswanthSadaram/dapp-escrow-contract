import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  AppBar,
  Toolbar,
  Button,
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
  Chip
} from '@mui/material';
import {
  AccountBalanceWallet,
  Send,
  Assignment,
  Security
} from '@mui/icons-material';
import { MeshProvider, useWallet } from '@meshsdk/react';
import TransactionForm from './components/TransactionForm';
import PendingTransactions from './components/PendingTransactions';
import WalletConnection from './components/WalletConnection';

// Create a modern dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00D4AA',
      light: '#4DFFCD',
      dark: '#00A085',
    },
    secondary: {
      main: '#FF6B6B',
      light: '#FF9999',
      dark: '#CC5555',
    },
    background: {
      default: '#0A0E1A',
      paper: '#1A1F2E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0BEC5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, #1A1F2E 0%, #252A3A 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

function MainApp() {
  const { connected, wallet } = useWallet();
  const [activeTab, setActiveTab] = useState('send');
  const [walletBalance, setWalletBalance] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get wallet balance when connected
  useEffect(() => {
    if (connected && wallet) {
      loadWalletBalance();
    }
  }, [connected, wallet, refreshTrigger]);

  const loadWalletBalance = async () => {
    try {
      const balance = await wallet.getBalance();
      const adaAsset = balance.find(asset => asset.unit === 'lovelace');
      if (adaAsset) {
        const adaBalance = parseInt(adaAsset.quantity) / 1000000;
        setWalletBalance(adaBalance);
      }
    } catch (error) {
      console.error('Error loading wallet balance:', error);
    }
  };

  const handleTransactionSuccess = () => {
    // Refresh wallet balance and pending transactions
    setRefreshTrigger(prev => prev + 1);
  };

  if (!connected) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <WalletConnection />
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Security sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Smart Escrow DApp
          </Typography>
          <Chip
            icon={<AccountBalanceWallet />}
            label={`${walletBalance.toFixed(2)} ADA`}
            color="primary"
            variant="outlined"
            sx={{ mr: 2 }}
          />
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => window.location.reload()}
          >
            Disconnect
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Navigation Tabs */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant={activeTab === 'send' ? 'contained' : 'outlined'}
                startIcon={<Send />}
                onClick={() => setActiveTab('send')}
                size="large"
                sx={{ py: 2 }}
              >
                Send Transaction
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant={activeTab === 'pending' ? 'contained' : 'outlined'}
                startIcon={<Assignment />}
                onClick={() => setActiveTab('pending')}
                size="large"
                sx={{ py: 2 }}
              >
                Pending Approvals
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Main Content */}
        <Grid container spacing={4}>
          {activeTab === 'send' && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    Create New Escrow Transaction
                  </Typography>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Send funds securely with AI-powered categorization. Both sender and receiver must approve before funds are released.
                  </Alert>
                  <TransactionForm 
                    onSuccess={handleTransactionSuccess}
                    walletBalance={walletBalance}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          {activeTab === 'pending' && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    Pending Transactions
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    These transactions require your approval. Click "Approve" to confirm transactions where you are the sender or receiver.
                  </Alert>
                  <PendingTransactions 
                    refreshTrigger={refreshTrigger}
                    onTransactionUpdate={handleTransactionSuccess}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 8, py: 4, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Smart Escrow DApp - Powered by Cardano, Aiken & AI
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MeshProvider>
        <MainApp />
      </MeshProvider>
    </ThemeProvider>
  );
}

export default App;