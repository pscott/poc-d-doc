const API_BASE_URL = 'http://localhost:3000/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Map EC curve names to Web Crypto API format
const CURVE_NAME_MAP = {
    'prime256v1': 'P-256',
    'secp256r1': 'P-256',
    'secp384r1': 'P-384',
    'secp521r1': 'P-521'
};

// Base32 alphabet used in 2D-DOC
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Retry a function with exponential backoff
 * @template T
 * @param {function(): Promise<T>} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise<T>} - Result of the function
 */
async function retry(fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}

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
 * Get certificate for signature verification
 * @param {string} caId - CA ID from 2D-DOC
 * @param {string} certId - Certificate ID from 2D-DOC
 * @returns {Promise<Object>} Certificate data
 * @throws {Error} If certificate not found or API error
 */
export async function getCertificateForVerification(caId, certId) {
    return retry(async () => {
        const response = await fetch(
            `${API_BASE_URL}/certificates/verification?caId=${encodeURIComponent(caId)}&certId=${encodeURIComponent(certId)}`
        );
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Certificate not found for CA ID: ${caId}, Cert ID: ${certId}`);
            }
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    });
}

/**
 * Convert a base32 string to Uint8Array
 * @param {string} base32 - Base32 encoded string
 * @returns {Uint8Array} - Decoded bytes
 */
function base32ToUint8Array(base32) {
    // Remove any padding characters
    base32 = base32.replace(/=+$/, '');
    
    // Convert to uppercase and remove any non-base32 characters
    base32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
    
    const length = base32.length;
    const buffer = new Uint8Array(Math.floor(length * 5 / 8));
    let bits = 0;
    let value = 0;
    let index = 0;

    for (let i = 0; i < length; i++) {
        value = (value << 5) | BASE32_ALPHABET.indexOf(base32[i]);
        bits += 5;

        if (bits >= 8) {
            buffer[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }

    return buffer;
}

/**
 * Verify a 2D-DOC signature
 * @param {Object} params - Verification parameters
 * @param {string} params.header - Header data
 * @param {string} params.message - Message data
 * @param {string} params.signature - Signature data
 * @param {string} params.caId - CA ID
 * @param {string} params.certId - Certificate ID
 * @returns {Promise<boolean>} Whether signature is valid
 */
export async function verifySignature({ header, message, signature, caId, certId }) {
    console.log('Starting signature verification...');
    console.log('Header:', header);
    console.log('Message:', message);
    console.log('Signature:', signature);
    console.log('CA ID:', caId);
    console.log('Cert ID:', certId);

    try {
        const cert = await getCertificateForVerification(caId, certId);
        if (!cert) {
            throw new Error(`Certificate not found for ID: ${certId}`);
        }

        const publicKeyBytes = new Uint8Array(cert.public_key.data);
        const signatureBytes = base32ToUint8Array(signature);
        const dataToVerify = header + message;
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(dataToVerify);

        const publicKey = await importPublicKey(publicKeyBytes, cert.key_type, cert.key_info);
        return await crypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: { name: 'SHA-256' },
            },
            publicKey,
            signatureBytes,
            dataBytes
        );
    } catch (error) {
        console.error('Error during signature verification:', error);
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