
import { KnowledgeBase, WeighingRecord, UserProfile } from "../types";

const KEY_RECORDS = 'conferente_records';
const KEY_KNOWLEDGE = 'conferente_knowledge';
const KEY_PROFILE = 'conferente_profile';
const KEY_THEME = 'conferente_theme';

const defaultKnowledge: KnowledgeBase = {
    suppliers: [],
    products: [],
    patterns: {}
};

const defaultProfile: UserProfile = {
    name: 'Usuario',
    role: 'Conferente'
};

// --- Theme Functions ---
export const getTheme = (): 'light' | 'dark' => {
    try {
        return (localStorage.getItem(KEY_THEME) as 'light' | 'dark') || 'light';
    } catch {
        return 'light';
    }
};

export const saveTheme = (theme: 'light' | 'dark') => {
    localStorage.setItem(KEY_THEME, theme);
};

// --- Profile Functions ---

export const saveUserProfile = (profile: UserProfile) => {
    localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
};

export const getUserProfile = (): UserProfile => {
    try {
        const data = localStorage.getItem(KEY_PROFILE);
        return data ? JSON.parse(data) : defaultProfile;
    } catch {
        return defaultProfile;
    }
};

// --- Record Functions ---

export const saveRecord = (record: WeighingRecord) => {
    const records = getRecords();
    records.unshift(record);
    localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
    learnFromRecord(record);
};

export const deleteRecord = (id: string) => {
    const records = getRecords();
    const updatedRecords = records.filter(r => r.id !== id);
    localStorage.setItem(KEY_RECORDS, JSON.stringify(updatedRecords));
};

export const clearAllRecords = () => {
    localStorage.removeItem(KEY_RECORDS);
};

export const getRecords = (): WeighingRecord[] => {
    try {
        const data = localStorage.getItem(KEY_RECORDS);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

// New helper for AI Context
export const getLastRecordBySupplier = (supplier: string): WeighingRecord | undefined => {
    const records = getRecords();
    return records.find(r => r.supplier.toLowerCase() === supplier.toLowerCase());
};

const learnFromRecord = (record: WeighingRecord) => {
    const kb = getKnowledgeBase();
    
    // Add unique supplier/product
    if (!kb.suppliers.includes(record.supplier)) kb.suppliers.push(record.supplier);
    if (!kb.products.includes(record.product)) kb.products.push(record.product);

    // Learn patterns STRICTLY by Supplier + Product combination
    // This ensures "Tomatoes" from Supplier A (wood box) are different from Supplier B (plastic box)
    const key = `${record.supplier}::${record.product}`; 
    
    // Get existing pattern to preserve data if needed
    const existingPattern = kb.patterns[key];

    kb.patterns[key] = {
        typicalTaraBox: record.boxes.unitTara > 0 ? record.boxes.unitTara : (existingPattern?.typicalTaraBox || 0),
        lastUsedProduct: record.product 
    };

    // Update supplier preference (Last product brought by this supplier)
    const supplierKey = `SUP::${record.supplier}`;
    
    kb.patterns[supplierKey] = {
        typicalTaraBox: 0, // Not used for general supplier key
        lastUsedProduct: record.product
    };

    localStorage.setItem(KEY_KNOWLEDGE, JSON.stringify(kb));
};

export const getKnowledgeBase = (): KnowledgeBase => {
    try {
        const data = localStorage.getItem(KEY_KNOWLEDGE);
        return data ? JSON.parse(data) : defaultKnowledge;
    } catch {
        return defaultKnowledge;
    }
};

export const predictData = (supplier: string, product?: string) => {
    const kb = getKnowledgeBase();
    
    if (supplier && !product) {
        // Predict product based on supplier history
        const supKey = `SUP::${supplier}`;
        const lastProduct = kb.patterns[supKey]?.lastUsedProduct;
        return { suggestedProduct: lastProduct };
    }

    if (supplier && product) {
        // Predict taras based on Supplier AND Product specific combination
        const key = `${supplier}::${product}`;
        const pattern = kb.patterns[key];
        if (pattern) {
            return {
                suggestedTaraBox: pattern.typicalTaraBox
            };
        }
    }
    return {};
};
