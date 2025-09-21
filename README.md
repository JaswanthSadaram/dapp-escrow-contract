# 🔒 Smart Escrow DApp

A secure, AI-powered escrow service built on Cardano blockchain using Aiken smart contracts and React frontend.

## 🚀 Features

### 🔐 **Secure Escrow System**
- Funds locked in smart contract until both parties approve
- Transparent, immutable transaction records on Cardano blockchain
- Multi-signature approval system

### 🤖 **AI-Powered Transaction Categorization**
- Automatic categorization using Gemini AI
- Fallback keyword-based categorization
- Transaction insights and spending analytics

### 💎 **Modern UI/UX**
- Responsive design with Material-UI
- Dark theme with modern aesthetics
- Mobile-first design approach
- Real-time transaction status updates

### ⚡ **Cardano Integration**
- Built with Aiken smart contracts
- MeshJS for wallet connectivity
- Support for major Cardano wallets (Nami, Eternl, Flint, Yoroi)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │────│   Aiken Contract │────│ Cardano Network │
│   (User Interface) │    │  (Business Logic) │    │   (Blockchain)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    MeshJS SDK    │    │   Escrow Logic   │    │      UTXOs      │
│ (Wallet Connect) │    │ (Spend Validator) │    │ (Value + Data)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Gemini AI     │    │  Transaction     │    │   Plutus.json   │
│ (Categorization) │    │    Approvals     │    │ (Compiled Code) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### **Backend (Smart Contract)**
- **Aiken**: Smart contract language for Cardano
- **Cardano**: Blockchain platform
- **Plutus**: Virtual machine for smart contracts

### **Frontend**
- **React 19**: Modern UI framework
- **Material-UI**: Component library
- **Vite**: Fast build tool
- **MeshJS**: Cardano Web3 SDK

### **AI Integration**
- **Gemini AI**: Transaction categorization
- **Fallback System**: Keyword-based categorization

## 📦 Project Structure

```
smart-escrow-dapp/
├── escrow-dapp/                # Aiken smart contract
│   ├── validators/
│   │   └── escrow.ak          # Main escrow validator
│   ├── aiken.toml             # Project configuration
│   └── plutus.json            # Compiled contract (generated)
│
└── smart-escrow-frontend/      # React frontend
    ├── src/
    │   ├── components/         # React components
    │   │   ├── WalletConnection.jsx
    │   │   ├── TransactionForm.jsx
    │   │   └── PendingTransactions.jsx
    │   ├── utils/              # Utility functions
    │   │   ├── blockchain.js   # Cardano integration
    │   │   └── ai.js          # AI categorization
    │   ├── App.jsx            # Main app component
    │   └── index.css          # Global styles
    ├── package.json
    └── .env.example           # Environment variables template
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Aiken (latest version)
- Cardano wallet extension (Nami, Eternl, etc.)
- Gemini AI API key (optional, has fallback)

### 1. Clone & Setup
```bash
git clone <your-repo>
cd smart-escrow-dapp
```

### 2. Build Smart Contract
```bash
cd escrow-dapp
aiken build
```

### 3. Setup Frontend
```bash
cd ../smart-escrow-frontend
npm install
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Gemini API key
```

### 5. Start Development
```bash
npm run dev
```

Visit `http://localhost:5173` to see the app!

## 🔧 Configuration

### Environment Variables
Create `.env` file in the frontend directory:

```env
# Gemini AI API Key (get from https://makersuite.google.com/app/apikey)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Cardano Network
VITE_CARDANO_NETWORK=testnet

# Escrow Validator Address (auto-generated from aiken build)
VITE_ESCROW_VALIDATOR_ADDRESS=addr1w8qmxkacjdffxah0l3qg8hq2pmvs58q8lcy42zy9kda2ylc6dy5r4
```

### Smart Contract Deployment
1. Build the contract: `aiken build`
2. Get the validator address from `plutus.json`
3. Update the frontend configuration
4. Deploy to Cardano testnet/mainnet

## 📱 How to Use

### 1. **Connect Wallet**
- Click "Connect Wallet" on the homepage
- Choose your preferred Cardano wallet
- Authorize the connection

### 2. **Create Escrow Transaction**
- Select receiver from dropdown
- Enter amount and message
- AI automatically categorizes the transaction
- Click "Create Escrow Transaction"

### 3. **Approve Transactions**
- Switch to "Pending Approvals" tab
- See transactions requiring your approval
- Click "Approve" for transactions you're involved in
- Funds release automatically when both parties approve

### 4. **Cancel Transactions**
- Senders can cancel pending transactions
- Click "Cancel" to get an immediate refund
- Only possible before receiver approval

## 🔐 Smart Contract Logic

### Transaction States
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   CREATED   │───▶│   PENDING    │───▶│  COMPLETED  │
│ (Initiated) │    │ (Approvals)  │    │ (Released)  │
└─────────────┘    └──────────────┘    └─────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │   CANCELLED  │
                   │  (Refunded)  │
                   └──────────────┘
```

### Validator Actions
- **InitiateTransfer**: Create new escrow
- **ConfirmSender**: Sender approves transaction
- **ConfirmReceiver**: Receiver approves transaction
- **Release**: Both confirmed → funds to receiver
- **Refund**: Sender cancels → funds back to sender

## 🎯 For Hackathon Judges

### **Innovation Points**
✅ **AI Integration**: Real-time transaction categorization with Gemini AI  
✅ **Modern UX**: Responsive, mobile-first design with dark theme  
✅ **Cardano Native**: Built specifically for Cardano using Aiken  
✅ **Real Problem**: Solves trust issues in P2P transactions  

### **Technical Excellence**
✅ **Smart Contract**: Secure, well-documented Aiken validator  
✅ **Frontend**: Modern React with TypeScript-ready components  
✅ **Integration**: Seamless wallet connectivity with MeshJS  
✅ **Fallbacks**: Works without AI API for better reliability  

### **Demo Flow**
1. **Connect** Cardano wallet (30 seconds)
2. **Create** escrow transaction with AI categorization (1 minute)
3. **Approve** from both parties (1 minute)
4. **Show** completed transaction and analytics (30 seconds)

## 🚀 Deployment

### Smart Contract
```bash
cd escrow-dapp
aiken build
# Deploy to Cardano testnet using your preferred method
```

### Frontend
```bash
cd smart-escrow-frontend
npm run build
# Deploy to Vercel, Netlify, or your preferred hosting
```

## 🔮 Future Enhancements

- **Multi-token Support**: Support for native Cardano tokens
- **Dispute Resolution**: Third-party arbitration system
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Detailed spending insights dashboard
- **Recurring Payments**: Subscription-style escrow transactions
- **Integration APIs**: REST APIs for third-party integrations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cardano Foundation** for the amazing blockchain platform
- **Aiken Team** for the excellent smart contract language
- **MeshJS** for the comprehensive Cardano SDK
- **Google** for the Gemini AI API
- **Material-UI** for the beautiful component library

---

**Built with ❤️ for the Cardano Ecosystem**

*Ready to revolutionize P2P transactions with AI-powered escrow services!* 🚀