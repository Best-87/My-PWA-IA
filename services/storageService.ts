import { KnowledgeBase, WeighingRecord, UserProfile } from "../types";
import { syncRecordToSupabase, syncProfileToSupabase, syncKnowledgeBaseToSupabase } from "./supabaseService";

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
    role: 'Conferente',
    store: ''
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

const KEY_AUTH_LINKS = 'conferente_auth_links';

export const saveUserProfile = (profile: UserProfile) => {
    localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));

    // Sync to Supabase
    syncProfileToSupabase(profile);

    // If there is an email and a clientId in localstorage, link them
    if (profile.email) {
        const currentClientId = localStorage.getItem('google_client_id');
        if (currentClientId) {
            linkEmailWithAuth(profile.email, currentClientId);
        }
    }
};

export const linkEmailWithAuth = (email: string, clientId: string) => {
    try {
        const links = getAuthLinks();
        links[email.toLowerCase()] = clientId;
        localStorage.setItem(KEY_AUTH_LINKS, JSON.stringify(links));
    } catch (e) {
        console.error("Error linking email", e);
    }
};

export const getAuthLinks = (): Record<string, string> => {
    try {
        const data = localStorage.getItem(KEY_AUTH_LINKS);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
};

export const getClientIdByEmail = (email: string): string | null => {
    const links = getAuthLinks();
    return links[email.toLowerCase()] || null;
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

export const saveRecord = async (record: WeighingRecord) => {
    // Automatically attach the store from the current profile to the record
    const profile = getUserProfile();
    const enrichedRecord = {
        ...record,
        store: profile.store
    };

    // Learn from pattern (Lightweight)
    learnFromRecord(enrichedRecord);

    // Save to Local Cache immediately (Slim version)
    try {
        const local = await getRecords();
        const slim = { ...enrichedRecord, evidence: null };
        const updated = [slim, ...local].slice(0, 100);
        localStorage.setItem(KEY_RECORDS, JSON.stringify(updated));
    } catch (e) {
        console.warn("Local cache update failed", e);
    }

    // Sync DIRECTLY to Supabase (Heavy version with images)
    return await syncRecordToSupabase(enrichedRecord);
};

export const deleteRecord = async (id: string) => {
    // Also delete from Supabase
    const { deleteRecordFromSupabase } = await import('./supabaseService');
    await deleteRecordFromSupabase(id);
};

export const clearAllRecords = async () => {
    // Clear from Supabase
    const { clearAllRecordsFromSupabase } = await import('./supabaseService');
    await clearAllRecordsFromSupabase();
};

export const syncRecords = (cloudRecords: WeighingRecord[]) => {
    // Save a SLIM version to localStorage (no heavy base64 images) to avoid QuotaExceededError
    try {
        const slimRecords = cloudRecords.map(rec => ({
            ...rec,
            evidence: null // Strip heavy images for local cache
        }));
        localStorage.setItem(KEY_RECORDS, JSON.stringify(slimRecords));
    } catch (e) {
        console.warn("Local storage limit hit, slim records not cached", e);
    }

    cloudRecords.forEach(rec => learnFromRecord(rec));
};

export const getRecords = async (): Promise<WeighingRecord[]> => {
    try {
        const local = localStorage.getItem(KEY_RECORDS);
        if (local) {
            return JSON.parse(local);
        }
    } catch (e) {
        console.error("Error reading local records", e);
    }
    return [];
};

// New helper for AI Context
export const getLastRecordBySupplier = async (supplier: string): Promise<WeighingRecord | undefined> => {
    const records = await getRecords();
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

    // Sync KB to Supabase
    syncKnowledgeBaseToSupabase(kb);
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

// --- BACKUP & RESTORE ---

export const generateBackupData = () => {
    const backup = {
        version: 1,
        timestamp: Date.now(),
        app: 'Conferente Pro',
        data: {
            records: getRecords(),
            profile: getUserProfile(),
            knowledge: getKnowledgeBase(),
            theme: getTheme()
        }
    };
    return JSON.stringify(backup, null, 2);
};

export const restoreBackupData = (jsonString: string): boolean => {
    try {
        const backup = JSON.parse(jsonString);

        // Basic Validation
        if (backup.app !== 'Conferente Pro' || !backup.data) {
            return false;
        }

        const { records, profile, knowledge, theme } = backup.data;

        if (records) localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
        if (profile) localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
        if (knowledge) localStorage.setItem(KEY_KNOWLEDGE, JSON.stringify(knowledge));
        if (theme) localStorage.setItem(KEY_THEME, theme);

        return true;
    } catch (e) {
        console.error("Backup Restore Error", e);
        return false;
    }
};