export class TwoDDocParser {
  constructor() {
        // Constants for special characters and encoding
        this.GS = String.fromCharCode(0x1D);  // Group Separator
        this.RS = String.fromCharCode(0x1E);  // Record Separator
        this.FS = String.fromCharCode(0x1F);  // Field Separator
        this.US = String.fromCharCode(0x1C);  // Unit Separator
        this.DC_MARKER = 'DC';
        this.C40_CHARSET = [
            // Basic set (set 0)
            ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            // Set 1 (shift 1)
            '!\"#$%&\'()*+,-./:;<=>?@[\\]^_',
            // Set 2 (shift 2)
            '`abcdefghijklmnopqrstuvwxyz{|}~\x7F'
        ];
    }

    parse(rawData) {
        try {
            // Parse header first to determine version and encoding
            const header = this.parseHeader(rawData);
            
            // Split the remaining data into message and signature zones
            const remainingData = rawData.substring(header.headerLength);
            const [messageData, signatureData, annexData] = this.splitZones(remainingData, header.version);
            
            // Parse message zone according to version and encoding
            const message = this.parseMessageZone(messageData, header);

            // Build the response object that matches the expected interface
            return {
                version: header.version,
                country: header.countryId,
                perimeter: header.caId,
                docType: this.getDocumentType(header.perimeterId, header.docTypeId),
                fields: this.parseFields(message, header),
                signature: signatureData,
                annex: annexData ? this.parseMessageZone(annexData, header) : undefined,
                messageData: messageData  // Expose the message data for debugging
            };
    } catch (error) {
            console.error('Error parsing 2D-DOC:', error);
            throw new Error(`Failed to parse 2D-DOC: ${error.message}`);
        }
    }

    parseHeader(data) {
        if (!data.startsWith(this.DC_MARKER)) {
            throw new Error('Invalid 2D-DOC: Missing DC marker');
        }

        const version = parseInt(data.substring(2, 4), 10);
        let header = {
            version,
            headerLength: this.getHeaderLength(version)
        };

        if (version <= 3) {
            // C40 encoded headers for versions 01-03
            header = {
                ...header,
                caId: data.substring(4, 8),
                certId: data.substring(8, 12),
                issuanceDate: this.parseHexDate(data.substring(12, 16)),
                signatureDate: this.parseHexDate(data.substring(16, 20)),
                docTypeId: data.substring(20, 22),
                perimeterId: version >= 3 ? data.substring(22, 24) : '01',
                countryId: version === 4 ? data.substring(24, 26) : 'FR'
            };
        } else if (version === 4) {
            // Version 04 can be binary or C40 encoded
            const isBinary = this.isBinaryEncoded(data);
            if (isBinary) {
                header = {
                    ...header,
                    countryId: this.decodeC40(data.substring(2, 4)),
                    caId: this.decodeC40(data.substring(4, 7)),
                    certId: this.decodeC40(data.substring(7, 10)),
                    issuanceDate: this.parseBinaryDate(data.slice(10, 13)),
                    signatureDate: this.parseBinaryDate(data.slice(13, 16)),
                    docTypeId: data[16].toString(16).padStart(2, '0'),
                    perimeterId: data.slice(17, 19).toString(16).padStart(2, '0')
                };
            } else {
                // C40 encoded version 4
                header = {
                    ...header,
                    caId: data.substring(4, 8),
                    certId: data.substring(8, 12),
                    issuanceDate: this.parseHexDate(data.substring(12, 16)),
                    signatureDate: this.parseHexDate(data.substring(16, 20)),
                    docTypeId: data.substring(20, 22),
                    perimeterId: data.substring(22, 24),
                    countryId: data.substring(24, 26)
                };
            }
        } else {
            throw new Error(`Unsupported 2D-DOC version: ${version}`);
        }

        return header;
    }

    getHeaderLength(version) {
        switch (version) {
            case 1:
            case 2:
                return 22;
            case 3:
                return 24;
            case 4:
                return 26; // For C40 encoding, 19 for binary but we handle that separately
            default:
                throw new Error(`Unsupported version: ${version}`);
        }
    }

    splitZones(data, version) {
        let messageData, signatureData, annexData;
        
        // For version 4, try US first, then fall back to FS
        const separators = version === 4 ? [this.US, this.FS] : [this.FS];
        
        let parts;
        for (const separator of separators) {
            parts = data.split(separator);
            if (parts.length > 1) break;
        }

        if (parts.length === 1) {
            // If no separator found, assume everything before the last 128 chars is message
            // and the rest is signature (common format for some implementations)
            const sigLength = 128; // Typical signature length
            if (data.length > sigLength) {
                messageData = data.slice(0, -sigLength);
                signatureData = data.slice(-sigLength);
            } else {
                messageData = data;
                signatureData = '';
            }
        } else {
            [messageData, signatureData] = parts;
        }

        // Handle version 4's optional annex zone
        if (version === 4 && signatureData) {
            const annexParts = signatureData.split(this.GS);
            if (annexParts.length > 1) {
                [signatureData, annexData] = annexParts;
            }
        }

        return [messageData, signatureData, annexData];
    }

    parseMessageZone(data, header) {
        const fields = [];
        const seenFieldIds = new Set();
        let position = 0;

        console.log("Starting message zone parsing. Data:", data);

        // Field specifications - just the rules for each field type
        const fieldSpecs = {
            '43': { 
                name: 'Nombre de parts',
                type: 'variable',
                maxLength: 5
            },
            '44': { 
                name: 'Référence de l\'avis d\'impôt',
                type: 'fixed',
                length: 13
            },
            '45': { 
                name: 'Année fiscale',
                type: 'fixed',
                length: 4
            },
            '46': { 
                name: 'Nom du Déclarant 1',
                type: 'variable',
                maxLength: 38
            },
            '4A': { 
                name: 'Date limite de paiement',
                type: 'fixed',
                length: 8
            },
            '47': { 
                name: 'Numéro fiscal du Déclarant 1',
                type: 'fixed',
                length: 13
            },
            '41': { 
                name: 'Revenu fiscal de référence',
                type: 'variable',
                maxLength: 12
            },
            '48': { 
                name: 'Nom du Déclarant 2',
                type: 'variable',
                maxLength: 38
            },
            '49': { 
                name: 'Numéro fiscal du Déclarant 2',
                type: 'fixed',
                length: 13
            },
            '4W': { 
                name: 'Montant restant à payer',
                type: 'variable',
                maxLength: 10
            },
            '4X': { 
                name: 'Montant prélevé à la source',
                type: 'variable',
                maxLength: 10
            }
        };

        while (position < data.length - 1) {
            const fieldId = data.substring(position, position + 2);
            
            if (fieldId === 'S6') {
                console.log("Found signature marker at position", position);
                break;
            }

            if (fieldId.startsWith('4') && fieldSpecs[fieldId]) {
                if (seenFieldIds.has(fieldId)) {
                    console.warn(`Warning: Duplicate field ID ${fieldId} found at position ${position}, skipping...`);
                    position++;
                    continue;
                }

                position += 2; // Move past field ID
                console.log(`Found field ${fieldId} at position ${position - 2}`);

                const spec = fieldSpecs[fieldId];
                let value;

                if (spec.type === 'fixed') {
                    // For fixed length fields, just take the exact length
                    value = data.substring(position, position + spec.length);
                    position += spec.length;
                } else {
                    // For variable length fields, read until separator or maxLength
                    let endPos = position;
                    while (endPos < data.length && 
                           endPos - position < spec.maxLength && 
                           data[endPos] !== this.GS && 
                           data[endPos] !== this.RS) {
                        endPos++;
                    }

                    value = data.substring(position, endPos);
                    position = endPos;
                }

                // Skip separator if present
                if (position < data.length && data[position] === this.GS) {
                    position++;
                }

                // Clean up value based on field type
                const cleanValue = this.cleanFieldValue(value, fieldId);
                console.log(`Field ${fieldId} raw value: "${value}", cleaned value: "${cleanValue}"`);
                
                if (cleanValue) {
                    fields.push({ fieldId, value: cleanValue });
                    seenFieldIds.add(fieldId);
                }
            } else {
                position++;
            }
        }

        return fields;
    }

    isValidFieldValue(value, fieldId) {
        // Helper to validate if a value matches the expected format for a field
        switch (fieldId) {
            case '41': // Revenu fiscal de référence
                return /^[0-9,.-]*$/.test(value);
            case '43': // Nombre de parts
                return /^[0-9]{1,5}$/.test(value);
            case '44': // Référence de l'avis d'impôt
                return /^[A-Z0-9]{13}$/.test(value);
            case '45': // Année fiscale
                return /^[0-9]{4}$/.test(value);
            case '4A': // Date limite de paiement
                return /^[0-9]{8}$/.test(value);
            case '47': // Numéro fiscal du Déclarant 1
            case '49': // Numéro fiscal du Déclarant 2
                return /^[0-9]{13}$/.test(value);
            case '4W': // Montant restant à payer
            case '4X': // Montant prélevé à la source
                return /^[0-9,.-]*$/.test(value);
            default:
                return true; // For other fields, accept any value
        }
    }

    cleanFieldValue(value, fieldId) {
        // Store the last field ID for formatting purposes
        this.lastFieldId = fieldId;

        // Remove any control characters except comma for decimal values
        value = value.replace(/[\x00-\x1C\x1E-\x1F]/g, '');

        switch (fieldId) {
            case '43': // Nombre de parts (1-5 chars)
                return value.replace(/[^0-9]/g, '').slice(0, 5);
            case '44': // Référence de l'avis d'impôt (13 chars)
                return value.replace(/[^A-Z0-9]/g, '').slice(0, 13);
            case '45': // Année fiscale (4 chars)
                return value.replace(/[^0-9]/g, '').slice(0, 4);
            case '41': // Revenu fiscal de référence
            case '4W': // Montant restant à payer
            case '4X': // Montant prélevé à la source
                // Preserve decimal comma and negative sign
                return value.replace(/[^0-9,-]/g, '');
            case '47': // Numéro fiscal du Déclarant 1
            case '49': // Numéro fiscal du Déclarant 2
                return value.replace(/[^0-9]/g, '').slice(0, 13);
            case '46': // Nom du Déclarant 1
            case '48': // Nom du Déclarant 2
                return value.replace(/[^A-Z0-9 ]/g, '').trim();
            case '4A': // Date limite de paiement
                return value.replace(/[^0-9]/g, '').slice(0, 8);
            default:
                return value.trim();
        }
    }

    parseFields(message, header) {
        const parsedFields = {};
        
        for (const field of message) {
            // Store the field ID before getting field info and formatting
            this.lastFieldId = field.fieldId;
            
            const fieldInfo = this.getFieldInfo(field.fieldId, header);
            if (fieldInfo) {
                const formattedValue = this.formatFieldValue(field.value, fieldInfo.type, header);
                console.log(`Field ${field.fieldId}: "${field.value}" -> "${formattedValue}"`);
                
                parsedFields[field.fieldId] = {
                    name: fieldInfo.name,
                    value: formattedValue
                };
            }
        }

        return parsedFields;
    }

    getFieldInfo(fieldId, header) {
        // Field definitions based on document type and perimeter
        const fieldDefinitions = {
            // Common fields
            '01': { name: 'ID Document', type: 'string' },
            '02': { name: 'Date d\'émission', type: 'date' },
            '03': { name: 'Date de signature', type: 'date' },
            
            // Tax Notice (Type 04) fields - Mandatory
            '43': { name: 'Nombre de parts', type: 'integer' },
            '44': { name: 'Référence de l\'avis d\'impôt', type: 'string' },
            '45': { name: 'Année fiscale', type: 'year' },
            '46': { name: 'Nom du Déclarant 1', type: 'string' },
            '4A': { name: 'Date limite de paiement', type: 'formatted_date' },
            
            // Tax Notice (Type 04) fields - Optional
            '41': { name: 'Revenu fiscal de référence', type: 'amount' },
            '47': { name: 'Numéro fiscal du Déclarant 1', type: 'string' },
            '48': { name: 'Nom du Déclarant 2', type: 'string' },
            '49': { name: 'Numéro fiscal du Déclarant 2', type: 'string' },
            '4W': { name: 'Montant restant à payer', type: 'amount' },
            '4X': { name: 'Montant prélevé à la source', type: 'amount' }
        };

        return fieldDefinitions[fieldId];
    }

    formatFieldValue(value, type, header) {
        // Add debug logging
        console.log(`Formatting value "${value}" of type "${type}" for field "${this.lastFieldId}"`);
        
        switch (type) {
            case 'date':
                const isoDate = header.version === 4 && this.isBinaryEncoded(value) 
                    ? this.parseBinaryDate(value)
                    : this.parseHexDate(value);
                // Convert ISO date to DD-MM-YYYY
                const [year, month, day] = isoDate.split('-');
                return `${day}-${month}-${year}`;
            case 'formatted_date':
                // Convert DDMMYYYY to DD-MM-YYYY
                const dd = value.substring(0, 2);
                const mm = value.substring(2, 4);
                const yyyy = value.substring(4, 8);
                return `${dd}-${mm}-${yyyy}`;
            case 'year':
                return value; // YYYY format, no transformation needed
            case 'integer':
                return parseInt(value, 10).toString();
            case 'amount':
                // Add € symbol for monetary values
                return `${value.trim()} €`;
            case 'string':
                // Special formatting for specific fields
                if (value.length === 13) {
                    if (this.lastFieldId === '44') {
                        // Format reference: XX XX XXXXXXX XX
                        const formatted = `${value.substring(0, 2)} ${value.substring(2, 4)} ${value.substring(4, 11)} ${value.substring(11)}`;
                        console.log(`Formatting reference number: "${value}" -> "${formatted}"`);
                        return formatted;
                    } else if (this.lastFieldId === '47' || this.lastFieldId === '49') {
                        // Format fiscal number: XX XX XXX XXX XXX
                        const formatted = `${value.substring(0, 2)} ${value.substring(2, 4)} ${value.substring(4, 7)} ${value.substring(7, 10)} ${value.substring(10)}`;
                        console.log(`Formatting fiscal number: "${value}" -> "${formatted}"`);
                        return formatted;
                    }
                }
                return value;
            default:
                return value;
        }
    }

    parseHexDate(hexDate) {
        const days = parseInt(hexDate, 16);
        const baseDate = new Date('2000-01-01');
        const resultDate = new Date(baseDate);
        resultDate.setDate(baseDate.getDate() + days);
        return resultDate.toISOString().split('T')[0];
    }

    parseBinaryDate(bytes) {
        // Convert 3 bytes to MMDDYYYY format
        const value = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
        const month = Math.floor(value / 1000000);
        const day = Math.floor((value % 1000000) / 10000);
        const year = value % 10000;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    decodeC40(data) {
        // Basic C40 decoding implementation
        let result = '';
        for (let i = 0; i < data.length; i += 2) {
            const byte1 = data.charCodeAt(i);
            const byte2 = data.charCodeAt(i + 1);
            const value = (byte1 << 8) | byte2;
            
            // Convert to C40 values
            const c1 = Math.floor(value / 1600);
            const c2 = Math.floor((value % 1600) / 40);
            const c3 = value % 40;
            
            result += this.C40_CHARSET[0][c1];
            result += this.C40_CHARSET[0][c2];
            result += this.C40_CHARSET[0][c3];
        }
        return result;
    }

    isBinaryEncoded(data) {
        // Check if any character in the string has a code point above 0x7F
        for (let i = 0; i < data.length; i++) {
            if (data.charCodeAt(i) > 0x7F) {
                return true;
            }
        }
        return false;
    }

    getDocumentType(perimeterId, docTypeId) {
        const docTypes = {
            '01': { // ANTS Perimeter
                '04': { name: 'Avis d\'impôt sur les Revenus', category: 'IMPOTS' },
                // ... other ANTS document types ...
            },
            'JD': {
                '01': { name: 'Facture d\'électricité', category: 'RESIDENCE' },
                '02': { name: 'Facture de gaz', category: 'RESIDENCE' },
                '03': { name: 'Facture d\'eau', category: 'RESIDENCE' },
                '04': { name: 'Facture de téléphonie', category: 'RESIDENCE' },
                '05': { name: 'Facture d\'internet', category: 'RESIDENCE' },
                '06': { name: 'Quittance de loyer', category: 'RESIDENCE' },
                '07': { name: 'Avis d\'imposition', category: 'RESIDENCE' },
                '08': { name: 'Attestation d\'assurance logement', category: 'RESIDENCE' }
            },
            'ID': {
                '01': { name: 'Carte Nationale d\'Identité', category: 'IDENTITE' },
                '02': { name: 'Passeport', category: 'IDENTITE' },
                '03': { name: 'Titre de séjour', category: 'IDENTITE' },
                '04': { name: 'Permis de conduire', category: 'IDENTITE' }
            },
            'SN': {
                'L1': { name: 'Attestation vaccinale', category: 'SANTE' },
                'L2': { name: 'Certificat de test', category: 'SANTE' },
                'L3': { name: 'Certificat de rétablissement', category: 'SANTE' }
            },
            'FI': {
                '01': { name: 'Avis d\'impôt sur le revenu', category: 'IMPOTS' },
                '02': { name: 'Avis de taxe d\'habitation', category: 'IMPOTS' },
                '03': { name: 'Avis de taxe foncière', category: 'IMPOTS' },
                '04': { name: 'Déclaration de revenus', category: 'IMPOTS' }
            }
        };

        const perimeterTypes = docTypes[perimeterId];
        if (perimeterTypes) {
            const docType = perimeterTypes[docTypeId];
            if (docType) {
                return docType;
            }
        }

        return {
            name: `Type inconnu (Périmètre: ${perimeterId}, Type: ${docTypeId})`,
            category: 'INCONNU'
        };
    }
} 