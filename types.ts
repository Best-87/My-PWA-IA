
export type Language = 'pt' | 'es' | 'en';

export interface UserProfile {
    name: string;
    role: string;
    photo?: string; // Base64 string
}

export interface WeighingRecord {
    id: string;
    timestamp: number;
    supplier: string;
    product: string;
    grossWeight: number; // Peso Bruto
    noteWeight: number;  // Peso Nota
    netWeight: number;   // Peso Liquido
    taraTotal: number;
    boxes: { qty: number; unitTara: number };
    status: 'pending' | 'verified' | 'error';
    aiAnalysis?: string;
    evidence?: string; // Base64 string of the image
    batch?: string; // Lote do produto
    expirationDate?: string; // Data de validade
    productionDate?: string; // Data de fabricação
    recommendedTemperature?: string; // Temperatura recomendada de almacenamiento
}

export interface KnowledgeBase {
    suppliers: string[];
    products: string[];
    // Map supplier+product to typical tara/boxes
    patterns: Record<string, {
        typicalTaraBox: number;
        lastUsedProduct: string;
    }>;
}

export interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface AppConfig {
    version: string;
    lastUpdate: number;
}

export enum AppStatus {
    IDLE = 'IDLE',
    INSTALLABLE = 'INSTALLABLE',
    INSTALLED = 'INSTALLED'
}

export interface AnalyticsEvent {
    eventName: string;
    timestamp: number;
    properties?: Record<string, any>;
}

export interface UserStats {
    totalSessions: number;
    lastVisit: number;
    isInstalled: boolean;
    installDate?: number;
}

export interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}
