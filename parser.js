export class TwoDDocParser {
    constructor() {
        this.VERSION_FORMATS = {
            "01": "C40",
            "02": "C40",
            "03": "C40",
            "04": "BINARY"
        };

        this.FIELD_SEPARATORS = {
            GS: String.fromCharCode(0x1D), // Group Separator
            US: String.fromCharCode(0x1F)  // Unit Separator
        };
    }

    parse(data) {
        // Split into main components using Unit Separator
        const parts = data.split(this.FIELD_SEPARATORS.US);
        if (parts.length < 2) {
            throw new Error("Invalid 2D-DOC format: missing signature section");
        }

        const message = parts[0];
        const signature = parts[1];

        // Parse header (first part of message)
        const header = this._parseHeader(message.substring(0, 12));

        // Parse message fields
        const fields = this._parseMessageFields(message.substring(12));

        return {
            header,
            fields,
            signature
        };
    }

    _parseHeader(header) {
        if (header.length !== 12) {
            throw new Error("Invalid header length");
        }

        return {
            format: header.substring(0, 4),    // DC01, DC02, DC03, DC04
            country: header.substring(4, 6),    // FR, etc.
            issuer: header.substring(6, 12)     // 000001, etc.
        };
    }

    _parseMessageFields(message) {
        const fields = {};

        // Split fields by Group Separator
        const parts = message.split(this.FIELD_SEPARATORS.GS);

        parts.forEach(part => {
            if (!part) return;

            // First 2 chars are the field identifier
            const fieldId = part.substring(0, 2);
            const fieldValue = part.length > 2 ? part.substring(2) : "";

            fields[fieldId] = fieldValue;
        });

        return fields;
    }
} 