const API_BASE_URL = 'http://localhost:3000/api';

// Add this mapping for EC curve names
const CURVE_NAME_MAP = {
    'prime256v1': 'P-256',
    'secp256r1': 'P-256',
    'secp384r1': 'P-384',
    'secp521r1': 'P-521'
};

/**
 * Get all certificates for a given provider name
 * @param {string} providerName - The name of the provider to search for
 * @returns {Promise<Array>} Array of certificates with their details
 */
export async function getCertificatesForProvider(providerName) {
    try {
        const response = await fetch(`${API_BASE_URL}/certificates/provider/${encodeURIComponent(providerName)}`);
        if (!response.ok) throw new Error('Failed to fetch certificates');
        return await response.json();
    } catch (error) {
        console.error('Error fetching certificates:', error);
        throw error;
    }
}

/**
 * Get certificate details by serial number
 * @param {string} serialNumber - The serial number of the certificate
 * @returns {Promise<Object>} Certificate details including provider information
 */
export async function getCertificateBySerial(serialNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/certificates/serial/${encodeURIComponent(serialNumber)}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to fetch certificate');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching certificate:', error);
        throw error;
    }
}

/**
 * List all available providers
 * @returns {Promise<Array>} Array of providers with their details
 */
export async function listProviders() {
    try {
        const response = await fetch(`${API_BASE_URL}/providers`);
        if (!response.ok) throw new Error('Failed to fetch providers');
        return await response.json();
    } catch (error) {
        console.error('Error fetching providers:', error);
        throw error;
    }
}

/**
 * Get all valid certificates for the current date
 * @returns {Promise<Array>} Array of valid certificates with their details
 */
export async function getValidCertificates() {
    try {
        const response = await fetch(`${API_BASE_URL}/certificates/valid`);
        if (!response.ok) throw new Error('Failed to fetch valid certificates');
        return await response.json();
    } catch (error) {
        console.error('Error fetching valid certificates:', error);
        throw error;
    }
}

/**
 * Get certificate by CA ID and Certificate ID
 * @param {string} caId - The CA ID from the 2D-DOC header
 * @param {string} certId - The Certificate ID from the 2D-DOC header
 * @returns {Promise<Object>} Certificate details including the public key
 */
export async function getCertificateForVerification(caId, certId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/certificates/verification?caId=${encodeURIComponent(caId)}&certId=${encodeURIComponent(certId)}`
        );
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to fetch certificate');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching certificate for verification:', error);
        throw error;
    }
}

/**
 * Convert string to ArrayBuffer for crypto operations
 * @param {string} str - String to convert
 * @returns {Uint8Array} Converted array buffer
 */
function stringToArrayBuffer(str) {
    return new TextEncoder().encode(str);
}

/**
 * Convert SEC1 format to SPKI format for Web Crypto API
 * @param {Uint8Array} sec1Key - The public key in SEC1 format
 * @param {string} curve - The curve name (e.g., 'P-256')
 * @returns {Uint8Array} - The public key in SPKI format
 */
function convertSEC1toSPKI(sec1Key, curve) {
    // SEC1 format starts with 0x04 for uncompressed point
    if (sec1Key[0] !== 0x04) {
        throw new Error('Only uncompressed SEC1 format is supported');
    }

    // Map curve name to Web Crypto API format
    const namedCurve = CURVE_NAME_MAP[curve.toLowerCase()] || curve;
    console.log('Using curve:', namedCurve);

    // ASN.1 DER structure for SPKI format with P-256 curve
    const spkiPrefix = new Uint8Array([
        0x30, 0x59, // SEQUENCE, length 89
        0x30, 0x13, // SEQUENCE, length 19
        0x06, 0x07, // OBJECT IDENTIFIER, length 7
        0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01, // OID 1.2.840.10045.2.1 (ecPublicKey)
        0x06, 0x08, // OBJECT IDENTIFIER, length 8
        0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07, // OID 1.2.840.10045.3.1.7 (prime256v1/secp256r1)
        0x03, 0x42, // BIT STRING, length 66
        0x00, // no unused bits
    ]);

    // Combine prefix with SEC1 bytes
    const result = new Uint8Array(spkiPrefix.length + sec1Key.length);
    result.set(spkiPrefix);
    result.set(sec1Key, spkiPrefix.length);

    return result;
}

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Helper function to convert Uint8Array to base64
function uint8ArrayToBase64(uint8Array) {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

/**
 * Verify a 2D-DOC signature
 * @param {Object} params - Parameters for signature verification
 * @param {string} params.header - The header data
 * @param {string} params.message - The message zone data
 * @param {string} params.signature - The signature data
 * @param {string} params.caId - The CA ID from the header
 * @param {string} params.certId - The Certificate ID from the header
 * @returns {Promise<boolean>} Whether the signature is valid
 */
export async function verifySignature({ header, message, signature, caId, certId }) {
    console.log('Starting signature verification...');
    console.log('Header:', header);
    console.log('Message:', message);
    console.log('Signature:', signature);
    console.log('CA ID:', caId);
    console.log('Cert ID:', certId);

    try {
        // Find the certificate
        const cert = await getCertificateForVerification(caId, certId);
        if (!cert) {
            throw new Error(`Certificate not found for ID: ${certId}`);
        }
        console.log('Found certificate:', certId);
        console.log('Raw certificate data:', cert);

        // Convert public key to Uint8Array
        const publicKeyBytes = new Uint8Array(cert.public_key.data);
        console.log('Public key (base64):', uint8ArrayToBase64(publicKeyBytes));

        // Convert signature from base32 to Uint8Array
        const signatureBytes = base32ToUint8Array(signature);

        // Create the data to verify (header + message)
        const dataToVerify = header + message;
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(dataToVerify);

        // Import the public key
        const publicKey = await importPublicKey(publicKeyBytes, cert.key_type, cert.key_info);

        // Verify the signature
        const isValid = await crypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: { name: 'SHA-256' },
            },
            publicKey,
            signatureBytes,
            dataBytes
        );

        return isValid;
    } catch (error) {
        console.error('Error during signature verification:', error);
        throw error;
    }
}

// Helper function to convert base32 to Uint8Array
function base32ToUint8Array(base32) {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = [];

    for (let i = 0; i < base32.length; i++) {
        const c = base32.charAt(i);
        const idx = ALPHABET.indexOf(c);
        if (idx === -1) {
            throw new Error('Invalid base32 character: ' + c);
        }

        value = (value << 5) | idx;
        bits += 5;

        if (bits >= 8) {
            output.push((value >> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return new Uint8Array(output);
}

async function importPublicKey(keyBytes, keyType, keyInfo) {
    if (keyType === 'EC') {
        // Map curve name to Web Crypto API format
        const namedCurve = CURVE_NAME_MAP[keyInfo.toLowerCase()] || keyInfo;
        console.log('Using curve for import:', namedCurve);

        // Convert SEC1 format to SPKI format
        const spkiBytes = convertSEC1toSPKI(keyBytes, keyInfo);
        return await crypto.subtle.importKey(
            'spki',
            spkiBytes,
            {
                name: 'ECDSA',
                namedCurve: namedCurve,
            },
            true,
            ['verify']
        );
    }
    throw new Error(`Unsupported key type: ${keyType}`);
} 