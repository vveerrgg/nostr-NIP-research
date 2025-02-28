// Bech32 implementation for browser
// Simplified version for Nostr npub decoding

(function() {
    // Bech32 character set for encoding
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    
    // Decode a bech32 string (npub) to hex
    function decodeNpub(npub) {
        if (!npub.startsWith('npub1')) {
            throw new Error('Invalid npub: must start with npub1');
        }
        
        // Remove prefix and decode
        const data = npub.substring(5).toLowerCase();
        const words = [];
        
        // Convert characters to 5-bit integers
        for (let i = 0; i < data.length; i++) {
            const index = CHARSET.indexOf(data[i]);
            if (index === -1) {
                throw new Error('Invalid character in npub');
            }
            words.push(index);
        }
        
        // Convert 5-bit words to 8-bit bytes (excluding checksum)
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
    }
    
    // Expose the function globally
    window.decodeNpub = decodeNpub;
})();
