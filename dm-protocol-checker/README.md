# Nostr DM Protocol Checker

A browser-based tool to analyze the security of Nostr Direct Messages (DMs) across different clients.

## Overview

This tool helps Nostr users understand which clients are using secure vs. insecure messaging protocols for their DMs. It connects to Nostr relays, fetches your DM events, and analyzes which encryption protocols are being used.

## Features

- Analyzes DM events to detect encryption protocols (NIP-04, NIP-17, NIP-44)
- Identifies which clients you're using for DMs
- Provides security assessment for each client
- Shows percentage of secure vs. insecure DMs
- All processing happens client-side (no server)
- Comprehensive debug logging

## Supported Protocols

| Protocol | Security | Description |
|----------|----------|-------------|
| NIP-04   | ❌ Insecure | Basic encryption using AES-CBC without proper authentication |
| NIP-17   | ✅ Secure | Improved encryption with nonce to prevent replay attacks |
| NIP-44   | ✅ Secure | Modern encryption with XChaCha20-Poly1305 and forward secrecy |

## Client Detection

The tool can detect various Nostr clients including:

- Damus
- Primal
- Amethyst
- Snort
- Iris
- Coracle
- And more...

## Usage

1. Open the tool in your web browser
2. Enter your Nostr public key (hex or npub format)
3. Click "Analyze DMs"
4. View the results showing which clients and protocols you're using

## Privacy & Security

- All processing happens in your browser
- No data is sent to any server
- No private keys are required
- Open source and auditable

## Technical Details

- Uses nostr-tools library (v1.17.0)
- Connects to multiple popular relays
- Analyzes both sent and received DMs
- Detects client information from event metadata

## Recent Improvements

- Enhanced client detection for more accurate results
- Improved protocol detection logic
- Fixed relay connection issues
- Added detailed debug logging
- Improved error handling and recovery
- Enhanced UI with better security indicators
- Added client distribution statistics

## Troubleshooting

If you encounter issues:

- Check the debug log for detailed error messages
- Ensure you have a stable internet connection
- Try using a different browser if you experience library loading issues
- Some privacy extensions may block WebSocket connections to relays

## Development

To run locally, simply open `index.html` in a web browser. No build process or server is required.

## License

MIT License

## Installation

### Using npm (recommended)

1. Clone this repository:
```bash
git clone https://github.com/yourusername/nostr-dm-protocol-checker.git
cd nostr-dm-protocol-checker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

This will open the application in your default web browser.

### Manual Installation

If you prefer not to use npm, you can also:

1. Download the repository
2. Open `index.html` directly in your browser

Note: When using the manual method, you may encounter CORS issues or other browser security restrictions.

## Running Locally

1. Open `index.html` in a web browser
2. No server is required as everything runs client-side

## Contributing

This is an open-source project aimed at improving privacy in the Nostr ecosystem. Contributions are welcome!
