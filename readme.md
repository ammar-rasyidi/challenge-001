# Challenge 001: Multi-Read Dashboard [Frontend Only]

## Goal
Build a portfolio dashboard that efficiently reads from multiple contracts

## Requirements
- Display balances from 3+ different tokens  
- Show total portfolio value in USD  
- Implement batched reads vs individual calls comparison  
- Basic refresh mechanism  

## Smart Contract Task (Optional)
- Create a simple PortfolioReader.rs contract that aggregates multiple token balances in a single call  
- Extend the existing YourContract with view functions for batch reading  

## Optimization Focus
- RPC call reduction, batching patterns  

-----------------------------------

## Setup Instructions & Documentation

## Overview

This is a frontend-only portfolio dashboard that efficiently reads from multiple token contracts on the Arbitrum Sepolia testnet. It displays balances for popular tokens, calculates total portfolio value in USD, and provides a performance comparison between batched and individual contract calls.

## Demo Video

[![Watch the video](https://img.shields.io/badge/Watch-Demo%20Video-blue?logo=youtube)](https://drive.google.com/file/d/1tjKlHDsvcMAJHzPnCJHhzoGPJBEOjryO/view?usp=sharing)

## Demo URL 

[https://challenge-001-nextjs-nine.vercel.app/](https://challenge-001-nextjs-nine.vercel.app/)

## Key Features

- **Multi-Token Support**: Displays balances for 6+ popular Arbitrum Sepolia testnet tokens
- **USD Value Calculation**: Shows total portfolio value using real-time prices from CoinGecko
- **Performance Comparison**: Implements both batched and individual contract call methods with timing metrics
- **Refresh Mechanism**: Allows users to manually refresh token data
- **Responsive Design**: Works on both desktop and mobile devices

## NOT included

- **Smart Contract Task**

## Setup Instructions

### Prerequisites

1. Node.js (v16 or higher)
2. npm or yarn package manager
3. Alchemy account with API key for Arbitrum Sepolia

### Installation Steps

1. **Follow the installation guide for Scaffold-Stylus [here](https://github.com/Arb-Stylus/scaffold-stylus/blob/main/readme.md).**

2. **Set up environment variables**
   Create a `.env` file in the `packages/nextjs` directory:
   ```
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
   ```

4. **Run the development server**
   ```bash
   yarn start
   ```

## Technical Approach & Optimization

### 1. RPC Call Reduction Strategy

**Batched Reads Implementation:**
- Uses Alchemy's `alchemy_getTokenBalances` method to fetch multiple token balances in a single RPC call
- Falls back to individual calls only if the batch method fails
- Performance metrics track both approaches for comparison

**Optimization Techniques:**
- CoinGecko API uses the simpler `simple/price` endpoint instead of contract lookup

### 2. Architecture Decisions

**Token Selection:**
- Curated list of popular Arbitrum tokens with testnet deployments
- Includes both native ETH and ERC-20 tokens
- Each token includes CoinGecko ID for accurate pricing

**Data Flow:**
1. Connect wallet to get user address
2. Fetch token balances using Alchemy API (batch preferred, individual fallback)
3. Retrieve USD prices from CoinGecko API
4. Calculate formatted values and totals
5. Display results with performance metrics

### 3. Performance Considerations

**Batch vs Individual Comparison:**
- The code intentionally runs both methods to provide performance metrics
- Metrics show time and number of calls for each approach

**Error Handling:**
- Graceful fallbacks when API calls fail
- Individual token failures don't break the entire dashboard
- Clear error messages for user feedback

## Customization Options

### Adding New Tokens

To add a new token to the dashboard:

1. Add to the `POPULAR_ARBITRUM_TOKENS` array:
```typescript
{
  name: "Token Name",
  symbol: "SYMBOL",
  address: "0x...", // Arbitrum Sepolia contract address
  decimals: 18, // Token decimals
  coingeckoId: "coingecko-id", // Find this on coingecko.com
}
```

## Potential Improvements

1. **Caching**: Implement client-side caching for CoinGecko prices to reduce API calls
2. **Skeleton Loading**: Add skeleton screens for better loading states
3. **Export Functionality**: Add CSV/PDF export of portfolio data
4. **Historical Data**: Add charts for historical portfolio performance

## Troubleshooting

### Common Issues

1. **"Missing API Key" Error**
   - Ensure `NEXT_PUBLIC_ALCHEMY_API_KEY` is set in your environment variables
   - Restart the development server after adding the environment variable

2. **No Tokens Displayed**
   - Verify you're on the Arbitrum Sepolia network in your wallet
   - Ensure you have testnet tokens from the provided faucets

3. **Rate Limiting Errors**
   - The code includes delays between API calls, but if issues persist:
   - Consider adding API key rotation for CoinGecko
   - Implement response caching

4. **Connect Wallet Issues**
   - Ensure you have a Web3 wallet (MetaMask, etc.) installed
   - Check that you're connecting to the correct network (Arbitrum Sepolia)

