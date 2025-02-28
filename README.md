# Nostr NIP Research

This repository contains research, tools, and implementations related to Nostr Implementation Possibilities (NIPs).

## Projects

### DM Protocol Checker

A browser-based tool to analyze the security of Nostr direct messages (DMs). It detects which clients and encryption protocols are being used in your DMs.

**Features:**
- Analyzes DMs for a given public key (npub)
- Detects client applications used to send messages
- Identifies encryption protocols (NIP-04, NIP-17, NIP-44)
- Provides security assessment of each client and protocol
- Shows percentage of secure vs. insecure DMs
- Client-side only processing (no server)

**Try it:**
1. Clone this repository
2. Navigate to the `dm-protocol-checker` directory
3. Start a local web server (e.g., `python -m http.server 8080`)
4. Open `http://localhost:8080` in your browser
5. Enter your Nostr public key (npub) and analyze your DMs

## About Nostr

Nostr (Notes and Other Stuff Transmitted by Relays) is a simple, open protocol that enables global, decentralized, and censorship-resistant social media.

Learn more about Nostr:
- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [NIPs (Nostr Implementation Possibilities)](https://github.com/nostr-protocol/nips)

## License

MIT License
