// Nostr DM Protocol Checker
// This tool analyzes DMs to determine which clients are using secure protocols

// DOM elements
let npubInput, nsecInput, includeContentCheck, nsecContainer, checkButton;
let loadingIndicator, resultsContainer, totalDMsElement, secureDMsElement, insecureDMsElement;
let securePercentageElement, insecurePercentageElement, clientTableBody, recommendationsList, debugOutput, clearDebugBtn;

// Constants for protocol information
const PROTOCOL_INFO = {
    'NIP-04': {
        name: 'NIP-04',
        description: 'Basic encryption (less secure)',
        secure: false
    },
    'NIP-17': {
        name: 'NIP-17',
        description: 'Improved encryption with nonce',
        secure: true
    },
    'NIP-44': {
        name: 'NIP-44',
        description: 'Modern encryption with forward secrecy',
        secure: true
    },
    'Unknown': {
        name: 'Unknown',
        description: 'Could not determine encryption protocol',
        secure: false
    }
};

// Default relays to connect to
const DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nos.lol',
    'wss://nostr.wine',
    'wss://relay.current.fyi',
    'wss://relay.nostr.band'
];

// Debug logging function
function debug(message, isError = false) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const debugLog = document.getElementById('debug-log');
    
    if (!debugLog) {
        console.log(`${timestamp} - ${message}`);
        return;
    }
    
    const logEntry = document.createElement('div');
    logEntry.className = isError ? 'error-message' : '';
    logEntry.textContent = `${timestamp} - ${message}`;
    
    debugLog.appendChild(logEntry);
    debugLog.scrollTop = debugLog.scrollHeight;
    
    // Also log to console for debugging
    if (isError) {
        console.error(`${timestamp} - ${message}`);
    } else {
        console.log(`${timestamp} - ${message}`);
    }
}

// Initialize the application
function initApp() {
    debug('Initializing DM Protocol Checker...');
    
    // Check if libraries are loaded
    if (typeof window.decodeNpub === 'function') {
        debug('Nostr libraries loaded successfully.');
    } else {
        debug('Error: Required Nostr libraries not found!', true);
        document.getElementById('libraryError').style.display = 'block';
        return;
    }
    
    // Hide the library error message by default
    const libraryError = document.getElementById('libraryError');
    if (libraryError) {
        libraryError.style.display = 'none';
    }
    
    // Initialize DOM references
    loadingIndicator = document.getElementById('loading');
    resultsContainer = document.getElementById('results');
    totalDMsElement = document.getElementById('total-dms');
    secureDMsElement = document.getElementById('secure-dms');
    insecureDMsElement = document.getElementById('insecure-dms');
    securePercentageElement = document.getElementById('secure-percentage');
    insecurePercentageElement = document.getElementById('insecure-percentage');
    clientTableBody = document.getElementById('client-results');
    
    // Set up event listeners
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Analyze button click
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const pubkeyInput = document.getElementById('pubkey').value.trim();
            
            // Validate input
            if (!pubkeyInput) {
                debug('Please enter a valid public key', true);
                return;
            }
            
            // Get pubkey
            let pubkey = pubkeyInput;
            if (pubkeyInput.startsWith('npub1')) {
                try {
                    // Use our custom decodeNpub function
                    pubkey = window.decodeNpub(pubkeyInput);
                    debug(`Converted npub to hex: ${pubkey}`);
                } catch (e) {
                    debug(`Error decoding npub: ${e.message}`, true);
                    return;
                }
            }
            
            // Validate hex pubkey
            if (!/^[0-9a-f]{64}$/.test(pubkey)) {
                debug('Invalid public key format. Please enter a valid hex pubkey or npub.', true);
                return;
            }
            
            debug(`Starting analysis for pubkey: ${pubkey.slice(0, 8)}...`);
            
            // Show loading indicator
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'block';
            }
            
            const resultsElement = document.getElementById('results');
            if (resultsElement) {
                resultsElement.style.display = 'none';
            }
            
            try {
                // Analyze DMs
                const results = await analyzeDMs(pubkey);
                
                // Hide loading indicator
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                
                // Display results
                displayResults(results);
            } catch (e) {
                // Hide loading indicator on error
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                debug(`Error analyzing DMs: ${e.message}`, true);
            }
        });
    } else {
        debug('ERROR: Analyze button not found', true);
    }
    
    // Clear debug log button
    const clearLogBtn = document.getElementById('clear-log');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            const debugLog = document.getElementById('debug-log');
            if (debugLog) {
                debugLog.innerHTML = '';
                debug('Debug log cleared.');
            }
        });
    }
}

// Utility functions
function decodePubkey(npub) {
    if (!npub.startsWith('npub1')) {
        throw new Error('Invalid npub: must start with npub1');
    }
    
    try {
        // Try to use our custom bech32 library
        if (window.bech32 && window.bech32.decodeNpub) {
            return window.bech32.decodeNpub(npub);
        }
        
        // Fallback to manual decoding
        const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
        
        // Remove prefix and decode
        const data = npub.substring(5);
        const words = [];
        
        for (let i = 0; i < data.length; i++) {
            const index = CHARSET.indexOf(data[i]);
            if (index === -1) {
                throw new Error('Invalid character in npub');
            }
            words.push(index);
        }
        
        // Convert words to bytes (5 bits to 8 bits)
        const bytes = [];
        let bits = 0;
        let value = 0;
        
        for (let i = 0; i < words.length - 6; i++) { // Skip the last 6 words (checksum)
            value = (value << 5) | words[i];
            bits += 5;
            
            while (bits >= 8) {
                bits -= 8;
                bytes.push((value >> bits) & 0xff);
            }
        }
        
        // Convert bytes to hex
        let hex = '';
        for (let i = 0; i < bytes.length; i++) {
            hex += bytes[i].toString(16).padStart(2, '0');
        }
        
        return hex;
    } catch (e) {
        throw new Error(`Failed to decode npub: ${e.message}`);
    }
}

// Analyze DMs for the given public key
async function analyzeDMs(pubkey) {
    debug(`Analyzing DMs for pubkey: ${pubkey.slice(0, 8)}...`);
    
    // Initialize results object
    const results = {
        totalDMs: 0,
        secureDMs: 0,
        insecureDMs: 0,
        clients: {}
    };
    
    // Get relays from configuration
    const relays = DEFAULT_RELAYS;
    debug(`Connecting to ${relays.length} relays: ${relays.join(', ')}`);
    
    // Create a simple WebSocket-based relay client
    const events = [];
    const activeConnections = [];
    
    try {
        // Connect to each relay
        for (const relay of relays) {
            try {
                // Create WebSocket connection
                const ws = new WebSocket(relay);
                
                // Add to active connections
                activeConnections.push(ws);
                
                // Set up event handlers
                ws.onopen = () => {
                    debug(`Connected to ${relay}`);
                    
                    // Subscribe to DM events
                    const subId = `sub_${Math.random().toString(36).substring(2, 15)}`;
                    const subMsg = JSON.stringify([
                        "REQ", 
                        subId, 
                        { 
                            kinds: [4], 
                            "#p": [pubkey]
                        },
                        {
                            kinds: [4],
                            authors: [pubkey]
                        }
                    ]);
                    
                    ws.send(subMsg);
                };
                
                ws.onmessage = (message) => {
                    try {
                        const data = JSON.parse(message.data);
                        if (data[0] === "EVENT" && data[2] && data[2].kind === 4) {
                            const event = data[2];
                            if ((event.pubkey === pubkey || event.tags.some(t => t[0] === 'p' && t[1] === pubkey))) {
                                events.push(event);
                            }
                        }
                    } catch (e) {
                        debug(`Error parsing message: ${e.message}`);
                    }
                };
                
                ws.onerror = (error) => {
                    debug(`WebSocket error on ${relay}: ${error.message || 'Unknown error'}`);
                };
            } catch (error) {
                debug(`Error connecting to ${relay}: ${error.message}`);
            }
        }
        
        // Wait for events (with timeout)
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        debug(`Processing ${events.length} DM events...`);
        
        // Process each event
        for (const event of events) {
            // Detect client first
            const client = detectClient(event);
            
            // Then detect protocol using client info
            const protocol = detectProtocol(event, client);
            
            // Update results
            results.totalDMs++;
            
            if (protocol && PROTOCOL_INFO[protocol].secure) {
                results.secureDMs++;
            } else {
                results.insecureDMs++;
            }
            
            // Update client stats
            if (!results.clients[client]) {
                results.clients[client] = {
                    name: client,
                    count: 0,
                    protocols: {},
                    secure: false
                };
            }
            
            results.clients[client].count++;
            
            // Track protocols used by this client
            if (!results.clients[client].protocols[protocol]) {
                results.clients[client].protocols[protocol] = 0;
            }
            
            results.clients[client].protocols[protocol]++;
            
            // If this client has used a secure protocol at least once, mark it as secure
            if (protocol && PROTOCOL_INFO[protocol].secure) {
                results.clients[client].secure = true;
            }
        }
        
        // Close all connections
        for (const ws of activeConnections) {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        }
        
        // Return results
        return results;
        
    } catch (error) {
        debug(`Error analyzing DMs: ${error.message}`, true);
        
        // Close all connections on error
        for (const ws of activeConnections) {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        }
        
        throw error;
    }
}

// Display the analysis results
function displayResults(results) {
    debug('Displaying analysis results...');
    
    // Hide loading indicator
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Show results container
    if (resultsContainer) {
        resultsContainer.style.display = 'block';
    }
    
    // Update summary statistics
    if (totalDMsElement) {
        totalDMsElement.textContent = results.totalDMs;
    }
    
    if (secureDMsElement) {
        secureDMsElement.textContent = results.secureDMs;
    }
    
    if (insecureDMsElement) {
        insecureDMsElement.textContent = results.insecureDMs;
    }
    
    // Calculate percentages
    const securePercentage = results.totalDMs > 0 ? Math.round((results.secureDMs / results.totalDMs) * 100) : 0;
    const insecurePercentage = results.totalDMs > 0 ? Math.round((results.insecureDMs / results.totalDMs) * 100) : 0;
    
    // Update percentage elements
    if (securePercentageElement) {
        securePercentageElement.textContent = `${securePercentage}%`;
    }
    
    if (insecurePercentageElement) {
        insecurePercentageElement.textContent = `${insecurePercentage}%`;
    }
    
    // Clear existing client table
    if (clientTableBody) {
        clientTableBody.innerHTML = '';
    } else {
        debug('ERROR: Client table body element not found!', true);
        return; // Exit if we can't find the client table
    }
    
    // Sort clients by usage count (descending)
    const sortedClients = Object.entries(results.clients)
        .sort(([, a], [, b]) => b.count - a.count);
    
    // Add each client to the table
    for (const [clientName, clientData] of sortedClients) {
        // Create a card for this client
        const clientCard = document.createElement('div');
        clientCard.className = `card mb-3 client-card ${clientData.secure ? 'secure' : 'insecure'}`;
        
        // Create card header
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        
        // Create client name with badge
        const clientNameEl = document.createElement('h5');
        clientNameEl.className = 'mb-0 d-flex justify-content-between align-items-center';
        clientNameEl.innerHTML = `
            ${clientName}
            <span class="badge ${clientData.secure ? 'bg-success' : 'bg-danger'}">
                ${clientData.secure ? 'Secure' : 'Insecure'}
            </span>
        `;
        
        cardHeader.appendChild(clientNameEl);
        clientCard.appendChild(cardHeader);
        
        // Create card body
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // Add usage count
        const usageCount = document.createElement('p');
        usageCount.innerHTML = `<strong>Usage:</strong> ${clientData.count} DMs (${Math.round((clientData.count / results.totalDMs) * 100)}%)`;
        cardBody.appendChild(usageCount);
        
        // Add protocols used
        const protocolsUsed = document.createElement('div');
        protocolsUsed.innerHTML = '<strong>Protocols used:</strong>';
        
        // Create protocol list
        const protocolList = document.createElement('ul');
        protocolList.className = 'list-group mt-2';
        
        // Sort protocols by usage (descending)
        const sortedProtocols = Object.entries(clientData.protocols)
            .sort(([, a], [, b]) => b - a);
        
        for (const [protocol, count] of sortedProtocols) {
            const protocolItem = document.createElement('li');
            protocolItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            // Get protocol security info
            const protocolInfo = PROTOCOL_INFO[protocol] || { 
                name: protocol, 
                secure: false,
                description: 'Unknown protocol'
            };
            
            // Add protocol name with security indicator
            const protocolName = document.createElement('span');
            protocolName.className = protocolInfo.secure ? 'protocol-secure' : 'protocol-insecure';
            protocolName.textContent = protocolInfo.name || protocol;
            
            // Add count badge
            const countBadge = document.createElement('span');
            countBadge.className = 'badge bg-primary rounded-pill';
            countBadge.textContent = count;
            
            protocolItem.appendChild(protocolName);
            protocolItem.appendChild(countBadge);
            protocolList.appendChild(protocolItem);
        }
        
        protocolsUsed.appendChild(protocolList);
        cardBody.appendChild(protocolsUsed);
        clientCard.appendChild(cardBody);
        
        // Add the card to the results
        clientTableBody.appendChild(clientCard);
    }
    
    // Generate recommendations
    if (recommendationsList) {
        recommendationsList.innerHTML = '';
        
        // Add general recommendations
        const generalRec = document.createElement('li');
        generalRec.className = 'list-group-item';
        generalRec.innerHTML = `
            <strong>Use clients that support NIP-44:</strong> 
            The most secure encryption protocol for Nostr DMs.
        `;
        recommendationsList.appendChild(generalRec);
        
        // Add client-specific recommendations
        const insecureClients = sortedClients
            .filter(([, data]) => !data.secure)
            .map(([name]) => name);
        
        if (insecureClients.length > 0) {
            const clientRec = document.createElement('li');
            clientRec.className = 'list-group-item';
            clientRec.innerHTML = `
                <strong>Consider alternatives to:</strong> 
                ${insecureClients.join(', ')}
            `;
            recommendationsList.appendChild(clientRec);
        }
        
        // Add protocol recommendation
        const protocolRec = document.createElement('li');
        protocolRec.className = 'list-group-item';
        protocolRec.innerHTML = `
            <strong>Protocol security ranking:</strong>
            <ol class="mt-2">
                <li>NIP-44 (Most secure)</li>
                <li>NIP-17 (Improved security)</li>
                <li>NIP-04 (Basic security)</li>
            </ol>
        `;
        recommendationsList.appendChild(protocolRec);
    }
}

// Detect which protocol was used for the DM
function detectProtocol(event, client) {
    debug(`Detecting protocol for event: ${event.id ? event.id.slice(0, 8) : 'unknown'}...`);
    
    try {
        // First check if it's a standard NIP-04 DM
        if (event.kind === 4) {
            debug('Detected NIP-04 DM protocol');
            
            // Check for client-specific protocol variations
            if (client === 'Damus') {
                // Damus-specific NIP-04 implementation checks
                const hasDamusSpecificTags = event.tags.some(tag => 
                    tag[0] === 'nonce' || 
                    tag[0] === 'd-nonce' || 
                    tag[0] === 'damus'
                );
                
                if (hasDamusSpecificTags) {
                    debug('Detected Damus-specific NIP-04 implementation');
                    return 'NIP-04 (Damus)';
                }
                
                // Check for Damus-specific content patterns
                if (event.content && event.content.includes('?iv=')) {
                    debug('Detected Damus-specific encryption pattern');
                    return 'NIP-04 (Damus)';
                }
            }
            
            if (client === 'Primal') {
                // Primal-specific NIP-04 implementation checks
                const hasPrimalSpecificTags = event.tags.some(tag => 
                    tag[0] === 'primal' || 
                    (tag[0] === 'p' && tag[1]?.includes('primal'))
                );
                
                if (hasPrimalSpecificTags) {
                    debug('Detected Primal-specific NIP-04 implementation');
                    return 'NIP-04 (Primal)';
                }
            }
            
            // Check for other client-specific implementations
            if (client === 'Amethyst') {
                const hasAmethystSpecificTags = event.tags.some(tag => 
                    tag[0] === 'alt' || 
                    tag[0] === 'amethyst'
                );
                
                if (hasAmethystSpecificTags) {
                    debug('Detected Amethyst-specific NIP-04 implementation');
                    return 'NIP-04 (Amethyst)';
                }
            }
            
            // Default to standard NIP-04
            return 'NIP-04';
        }
        
        // Check for NIP-44 (newer encryption standard)
        if (event.kind === 4 && event.tags.some(tag => tag[0] === 'nip44')) {
            debug('Detected NIP-44 encryption protocol');
            return 'NIP-44';
        }
        
        // Check for NIP-24 (Encrypted Groups)
        if (event.kind === 14 || event.tags.some(tag => tag[0] === 'nip24')) {
            debug('Detected NIP-24 encrypted group protocol');
            return 'NIP-24';
        }
        
        // Check for custom protocols
        if (event.tags) {
            // Look for protocol tags
            const protocolTag = event.tags.find(tag => tag[0] === 'protocol');
            if (protocolTag && protocolTag[1]) {
                debug(`Found protocol tag: ${protocolTag[1]}`);
                return protocolTag[1];
            }
            
            // Check for encryption method tags
            const encryptionTag = event.tags.find(tag => 
                tag[0] === 'encryption' || 
                tag[0] === 'enc' || 
                tag[0] === 'cipher'
            );
            
            if (encryptionTag && encryptionTag[1]) {
                debug(`Found encryption tag: ${encryptionTag[1]}`);
                return `Custom (${encryptionTag[1]})`;
            }
        }
        
        // Analyze content format for protocol hints
        if (event.content) {
            // Check for NIP-44 content patterns
            if (event.content.startsWith('nostr:') || event.content.includes('?iv=') || event.content.includes('?ct=')) {
                debug('Detected potential NIP-44 content pattern');
                return 'Likely NIP-44';
            }
            
            // Check for base64 patterns (common in encrypted content)
            const base64Regex = /^[A-Za-z0-9+/=]{10,}$/;
            if (base64Regex.test(event.content)) {
                debug('Detected base64 encoded content (likely encrypted)');
                return 'Encrypted (format unknown)';
            }
        }
        
    } catch (e) {
        debug(`Error in protocol detection: ${e.message}`, true);
    }
    
    // Default to unknown if no protocol detected
    debug('No specific protocol detected, using "Unknown"');
    return 'Unknown';
}

// Detect which client was used to send the event
function detectClient(event) {
    // Debug the event to help with client detection
    debug(`Detecting client for event: ${event.id ? event.id.slice(0, 8) : 'unknown'}...`);
    
    try {
        // First, let's examine the event structure for debugging
        debug(`Event tags: ${JSON.stringify(event.tags.slice(0, 3))}...`);
        
        // Check client tags first (most reliable)
        if (event.tags) {
            // Look for explicit client tags
            const clientTag = event.tags.find(tag => tag[0] === 'client');
            if (clientTag && clientTag[1]) {
                const clientName = clientTag[1].toLowerCase();
                debug(`Found client tag: ${clientName}`);
                
                // Match known clients
                if (clientName.includes('damus')) return 'Damus';
                if (clientName.includes('primal')) return 'Primal';
                if (clientName.includes('amethyst')) return 'Amethyst';
                if (clientName.includes('snort')) return 'Snort';
                if (clientName.includes('iris')) return 'Iris';
                if (clientName.includes('coracle')) return 'Coracle';
                if (clientName.includes('nostros')) return 'Nostros';
                if (clientName.includes('current')) return 'Current';
                if (clientName.includes('nos2x')) return 'nos2x';
                if (clientName.includes('gossip')) return 'Gossip';
                
                // Return the client name if it's a known format
                if (clientName.includes('/')) {
                    // Format like "client/version"
                    return clientName.split('/')[0].charAt(0).toUpperCase() + 
                           clientName.split('/')[0].slice(1);
                }
                
                // Just return the client name with first letter capitalized
                return clientName.charAt(0).toUpperCase() + clientName.slice(1);
            }
            
            // Examine all tags for client hints
            for (const tag of event.tags) {
                // Check tag name (first element)
                if (tag[0]) {
                    const tagName = tag[0].toLowerCase();
                    
                    // Primal often uses these tag names
                    if (tagName === 'primal' || tagName === 'p-primal' || tagName.includes('primal')) {
                        debug('Detected Primal client via tag name');
                        return 'Primal';
                    }
                    
                    // Damus often uses these tag names
                    if (tagName === 'damus' || tagName === 'd-nonce' || tagName === 'nonce') {
                        debug('Detected Damus client via tag name');
                        return 'Damus';
                    }
                }
                
                // Check tag value (second element)
                if (tag[1]) {
                    const tagValue = tag[1].toLowerCase();
                    
                    // Check for client signatures in tag values
                    if (tagValue.includes('primal')) {
                        debug('Detected Primal client via tag value');
                        return 'Primal';
                    }
                    
                    if (tagValue.includes('damus')) {
                        debug('Detected Damus client via tag value');
                        return 'Damus';
                    }
                }
            }
            
            // Check for Damus-specific patterns
            const hasDamusTags = event.tags.some(tag => 
                (tag[0] === 'client' && tag[1]?.includes('damus')) ||
                (tag[0] === 'proxy' && tag[1]?.includes('damus')) ||
                (tag[0] === 'nonce') || // Damus often uses nonce tags
                (tag[0] === 'd') ||     // Damus often uses 'd' tags
                (tag[0] === 'damus')
            );
            
            if (hasDamusTags) {
                debug('Detected Damus client via tags');
                return 'Damus';
            }
            
            // Check for Primal-specific patterns
            const hasPrimalTags = event.tags.some(tag => 
                (tag[0] === 'proxy' && tag[1]?.includes('primal')) ||
                (tag[0] === 'client' && tag[1]?.includes('primal')) ||
                (tag[0] === 'client' && tag[1]?.includes('primal.net')) ||
                (tag[0] === 'primal') ||
                (tag[0] === 'p' && tag[1]?.includes('primal'))
            );
            
            if (hasPrimalTags) {
                debug('Detected Primal client via tags');
                return 'Primal';
            }
        }
        
        // Check content for client signatures (less reliable)
        if (event.content) {
            const content = event.content.toLowerCase();
            
            // Some clients add signatures in the encrypted content
            // This is a simplified check and would need decryption for accuracy
            if (content.includes('sent from damus')) {
                debug('Detected Damus client via content signature');
                return 'Damus';
            }
            
            if (content.includes('sent from primal')) {
                debug('Detected Primal client via content signature');
                return 'Primal';
            }
            
            if (content.includes('sent from amethyst')) {
                debug('Detected Amethyst client via content signature');
                return 'Amethyst';
            }
            
            if (content.includes('sent from snort')) {
                debug('Detected Snort client via content signature');
                return 'Snort';
            }
            
            if (content.includes('sent from iris')) {
                debug('Detected Iris client via content signature');
                return 'Iris';
            }
        }
        
        // Check pubkey for official client accounts
        // This is a simplified example - real implementation would have more pubkeys
        if (event.pubkey) {
            const KNOWN_CLIENT_PUBKEYS = {
                '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d': 'Damus', // Example pubkey
                '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245': 'Primal', // Example pubkey
                // Add more known pubkeys here
            };
            
            if (KNOWN_CLIENT_PUBKEYS[event.pubkey]) {
                debug(`Detected client via pubkey: ${KNOWN_CLIENT_PUBKEYS[event.pubkey]}`);
                return KNOWN_CLIENT_PUBKEYS[event.pubkey];
            }
        }
        
        // Check created_at timestamp patterns
        // Some clients have specific timestamp patterns or precision
        
    } catch (e) {
        debug(`Error in client detection: ${e.message}`, true);
    }
    
    // Default to unknown if no client detected
    debug('No specific client detected, using "Unknown"');
    return 'Unknown';
}

// Initialize the application when the page is loaded
document.addEventListener('DOMContentLoaded', initApp);
