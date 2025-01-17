export const FIELD_DEFINITIONS = {
    // Type 01 (Justificatif de Domicile) - Mandatory fields
    '10': { 
        name: 'Ligne 1 adresse postale bénéficiaire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '11': { 
        name: 'Qualité/titre du bénéficiaire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '12': { 
        name: 'Prénom du bénéficiaire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '13': { 
        name: 'Nom du bénéficiaire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '20': { 
        name: 'Ligne 2 adresse point de service',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '22': { 
        name: 'Numéro et nom de voie bénéficiaire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '24': { 
        name: 'Code postal point de service',
        type: 'string',
        lengthType: 'fixed',
        length: 5
    },
    '26': { 
        name: 'Pays point de service',
        type: 'string',
        lengthType: 'fixed',
        length: 2
    },

    // Type 01 (Justificatif de Domicile) - Optional fields
    '15': { 
        name: 'Qualité/titre destinataire facture',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '16': { 
        name: 'Prénom destinataire facture',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '17': { 
        name: 'Nom destinataire facture',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '18': { 
        name: 'Numéro de facture',
        type: 'string',
        lengthType: 'variable'
    },
    '1A': { 
        name: 'Numéro de contrat',
        type: 'string',
        lengthType: 'variable',
        maxLength: 50
    },
    '1B': { 
        name: 'Identifiant souscripteur',
        type: 'string',
        lengthType: 'variable',
        maxLength: 50
    },
    '1C': { 
        name: 'Date d\'effet du contrat',
        type: 'formatted_date',
        lengthType: 'fixed',
        length: 8
    },
    '1D': { 
        name: 'Montant TTC',
        type: 'amount',
        lengthType: 'variable',
        maxLength: 16
    },
    '1F': { 
        name: 'Téléphone destinataire',
        type: 'phone',
        lengthType: 'variable',
        maxLength: 30
    },
    '25': { 
        name: 'Localité point de service',
        type: 'string',
        lengthType: 'variable',
        maxLength: 32
    },
    '27': { 
        name: 'Ligne 2 adresse destinataire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '28': { 
        name: 'Ligne 3 adresse destinataire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '29': { 
        name: 'Ligne 4 adresse destinataire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '2A': { 
        name: 'Ligne 5 adresse destinataire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '2B': { 
        name: 'Code postal destinataire',
        type: 'string',
        lengthType: 'fixed',
        length: 5
    },
    '2C': { 
        name: 'Localité destinataire',
        type: 'string',
        lengthType: 'variable',
        maxLength: 32
    },
    '2D': { 
        name: 'Pays destinataire',
        type: 'string',
        lengthType: 'fixed',
        length: 2
    },

    // Type 04 (Tax Notice) fields
    '43': { 
        name: 'Nombre de parts',
        type: 'integer',
        lengthType: 'variable',
        maxLength: 5
    },
    '44': { 
        name: 'Référence de l\'avis d\'impôt',
        type: 'string',
        lengthType: 'fixed',
        length: 13
    },
    '45': { 
        name: 'Année fiscale',
        type: 'year',
        lengthType: 'fixed',
        length: 4
    },
    '46': { 
        name: 'Nom du Déclarant 1',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '4A': { 
        name: 'Date limite de paiement',
        type: 'formatted_date',
        lengthType: 'fixed',
        length: 8
    },
    '47': { 
        name: 'Numéro fiscal du Déclarant 1',
        type: 'string',
        lengthType: 'fixed',
        length: 13
    },
    '41': { 
        name: 'Revenu fiscal de référence',
        type: 'amount',
        lengthType: 'variable',
        maxLength: 12
    },
    '48': { 
        name: 'Nom du Déclarant 2',
        type: 'string',
        lengthType: 'variable',
        maxLength: 38
    },
    '49': { 
        name: 'Numéro fiscal du Déclarant 2',
        type: 'string',
        lengthType: 'fixed',
        length: 13
    },
    '4W': { 
        name: 'Montant restant à payer',
        type: 'amount',
        lengthType: 'variable',
        maxLength: 10
    },
    '4X': { 
        name: 'Montant prélevé à la source',
        type: 'amount',
        lengthType: 'variable',
        maxLength: 10
    }
}; 