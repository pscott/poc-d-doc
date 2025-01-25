# 2D-DOC Parser and Verifier

This project provides a web-based tool for parsing and verifying French 2D-DOC documents. It includes a browser-based scanner using the device's camera and a certificate verification API.

## Features

- Real-time scanning of 2D-DOC using device camera
- Support for multiple document types:
  - Type 01: Justificatif de Domicile
  - Type 04: Avis d'Impôt sur les Revenus
- Full parsing of document fields with proper formatting
- Digital signature verification
- Support for all 2D-DOC versions (01-04)
- Handles both C40 and binary encodings
- Certificate management through SQLite database

## Project Structure

```
.
├── README.md
├── index.html              # Main web interface
├── script.js              # Camera and UI handling
├── parser.js             # 2D-DOC parsing logic
├── cert_utils.js         # Certificate and signature verification
├── fields.js            # Field definitions for document types
├── styles.css           # UI styling
└── certificates-api/    # Certificate management API
    ├── dl_certs.py     # Certificate download and processing
    ├── requirements.txt # Python dependencies
    └── certificates.db  # SQLite database (created by dl_certs.py)
```

## Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- Modern web browser with camera access
- Internet connection (for initial certificate download)

## Setup Instructions

### 1. Certificate API Setup

First, set up the certificates API:

```bash
# Navigate to the API directory
cd certificates-api

# Create and activate a Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download and process certificates
python dl_certs.py
```

### 2. Web Interface Setup

In a separate terminal:

```bash
# Install Node.js dependencies
npm install

# Start the development server
npm start
```

### 3. Access the Application

Open your web browser and navigate to:

```
http://localhost:3000
```

## Usage

1. Allow camera access when prompted
2. Point your device's camera at a 2D-DOC
3. The application will automatically:
   - Scan and decode the 2D-DOC
   - Parse the document information
   - Verify the signature using the certificate API
   - Display the results with a verification status indicator

## Technical Details

### Document Parsing

- Supports all 2D-DOC versions (01-04)
- Handles both C40 and binary encodings
- Implements field-specific formatting rules
- Validates field contents against specifications

### Signature Verification

- Uses Web Crypto API for cryptographic operations
- Supports EC keys with P-256 curve
- Implements proper ASN.1/DER encoding
- Handles SEC1 to SPKI key format conversion

### Certificate Management

- Downloads certificates from ANTS
- Processes X.509 certificates
- Extracts and stores public keys
- Manages certificate validity periods

## Error Handling

The application includes comprehensive error handling for:

- Camera access issues
- Invalid 2D-DOC formats
- Certificate retrieval failures
- Signature verification errors

## Security Considerations

- Certificates are verified against the official ANTS TSL
- All cryptographic operations use standard Web Crypto API
- No sensitive data is stored persistently
- Certificate private keys never leave their secure storage

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
