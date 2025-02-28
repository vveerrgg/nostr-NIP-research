# Nostr DM Protocol Checker

## Concept

A web application that allows users to check which Nostr clients are using secure DM protocols (NIP-17/NIP-44) versus the less secure NIP-04.

## How It Would Work

1. **User Input**: 
   - User enters their npub (Nostr public key)
   - Optionally, user can specify a time range to analyze

2. **Data Collection**:
   - The tool connects to multiple popular relays
   - It fetches:
     - Kind 4 events (NIP-04 DMs) sent to or from the user
     - Kind 1059 events (NIP-17 gift wraps) sent to or from the user
     - Kind 13 events (NIP-17 seals) if they can be decrypted
     - Kind 14 events (NIP-17 DMs) if they can be decrypted
   - For each event, record the client that sent it (from the tags or content if available)

3. **Analysis**:
   - Count the number of DMs sent using each protocol
   - Identify which clients are using which protocols
   - Calculate the percentage of secure vs. insecure DMs

4. **Results Display**:
   - Show a table of clients and which protocols they use
   - Provide statistics on the user's DM security
   - Offer recommendations for more secure clients

## Technical Implementation

### Backend Components

```javascript
// Example structure for a Node.js backend

// 1. Connect to relays
async function connectToRelays(relayUrls) {
  // Connect to multiple relays using nostr-tools or similar library
}

// 2. Fetch DM events
async function fetchDMEvents(npub, startTime, endTime) {
  // Fetch kind:4 events (NIP-04)
  const nip04Events = await fetchKind4Events(npub, startTime, endTime);
  
  // Fetch kind:1059 events (NIP-17 gift wraps)
  const giftWrapEvents = await fetchKind1059Events(npub, startTime, endTime);
  
  return {
    nip04Events,
    giftWrapEvents
  };
}

// 3. Analyze client usage
function analyzeClientUsage(events) {
  const clientStats = {};
  
  // Process NIP-04 events
  for (const event of events.nip04Events) {
    const client = extractClientInfo(event);
    if (!clientStats[client]) {
      clientStats[client] = { nip04: 0, nip17: 0 };
    }
    clientStats[client].nip04++;
  }
  
  // Process NIP-17 events
  for (const event of events.giftWrapEvents) {
    const client = extractClientInfo(event);
    if (!clientStats[client]) {
      clientStats[client] = { nip04: 0, nip17: 0 };
    }
    clientStats[client].nip17++;
  }
  
  return clientStats;
}

// 4. Extract client information from event
function extractClientInfo(event) {
  // Look for client info in tags
  const clientTag = event.tags.find(tag => tag[0] === 'client');
  if (clientTag) return clientTag[1];
  
  // Some clients put their info in the content
  // This would require more sophisticated parsing
  
  return 'unknown';
}
```

### Frontend Components

```javascript
// Example React component structure

function DMProtocolChecker() {
  const [npub, setNpub] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  async function checkProtocols() {
    setLoading(true);
    try {
      const response = await fetch('/api/check-protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npub })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error checking protocols:', error);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="dm-protocol-checker">
      <h1>Nostr DM Protocol Checker</h1>
      
      <div className="input-section">
        <label htmlFor="npub">Enter your npub:</label>
        <input 
          type="text" 
          id="npub" 
          value={npub} 
          onChange={(e) => setNpub(e.target.value)} 
          placeholder="npub1..."
        />
        <button onClick={checkProtocols} disabled={loading}>
          {loading ? 'Checking...' : 'Check DM Protocols'}
        </button>
      </div>
      
      {results && (
        <div className="results-section">
          <h2>Results</h2>
          
          <div className="summary">
            <p>Total DMs analyzed: {results.totalDMs}</p>
            <p>Secure DMs (NIP-17/44): {results.secureDMs} ({results.securePercentage}%)</p>
            <p>Insecure DMs (NIP-04): {results.insecureDMs} ({results.insecurePercentage}%)</p>
          </div>
          
          <h3>Client Analysis</h3>
          <table className="client-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Protocol</th>
                <th>DM Count</th>
                <th>Security Rating</th>
              </tr>
            </thead>
            <tbody>
              {results.clientAnalysis.map(client => (
                <tr key={client.name}>
                  <td>{client.name}</td>
                  <td>{client.protocol}</td>
                  <td>{client.count}</td>
                  <td className={client.isSecure ? 'secure' : 'insecure'}>
                    {client.isSecure ? '✅ Secure' : '❌ Insecure'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <h3>Recommendations</h3>
          <ul className="recommendations">
            {results.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Privacy Considerations

1. **Local Decryption Only**: All decryption of DMs should happen locally in the browser, never on the server.

2. **No Private Key Required**: The tool should only require the user's public key (npub), not their private key.

3. **Optional Deeper Analysis**: If the user wants to analyze the actual content of their DMs (to check which ones are using NIP-17/44 vs NIP-04), they would need to provide their private key, but this should be:
   - Completely optional
   - Processed entirely client-side
   - Never transmitted to any server

4. **Transparency**: The tool should be open source so users can verify it doesn't mishandle their data.

## Technical Challenges

1. **Identifying Clients**: Not all Nostr events contain clear client information. We might need to build a database of known event patterns to identify clients.

2. **Decrypting NIP-17 Messages**: To fully analyze NIP-17 messages, we'd need the user's private key to unwrap the gift wraps and seals.

3. **Relay Selection**: We'd need to connect to a diverse set of relays to get a comprehensive view of the user's DMs.

4. **Performance**: Fetching and analyzing large numbers of events could be resource-intensive.

## Future Enhancements

1. **Client Leaderboard**: Show which clients have the best adoption of secure DM protocols.

2. **Visualization**: Add charts and graphs to make the data more understandable.

3. **Recommendations Engine**: Suggest specific clients based on the user's platform and needs.

4. **Community Contributions**: Allow users to submit information about which clients are using which protocols.

5. **API**: Provide an API for other tools to check client compliance.
