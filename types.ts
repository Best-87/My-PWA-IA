
export type Language = 'pt' | 'es' | 'en';

export interface UserProfile {
    name: string;
    email?: string;
    role: string;
    store?: string; // Tienda / Sucursal
    photo?: string; // Base64 string
    telegramId?: string; // ID do usuário no Telegram
}

export interface CustomChatSession {
    systemInstruction?: string;
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
    store?: string; // Tienda donde se realizó el registro
    cnpj?: string; // CNPJ do emitente da nota
    noteNumber?: string; // Número da nota fiscal
    accessKey?: string; // Chave de acesso da NF-e (44 dígitos)
}

export interface KnowledgeBase {
    suppliers: string[];
    products: string[];
    // Map supplier or supplier+product to details
    patterns: Record<string, {
        typicalTaraBox: number;
        typicalUnitTara: number;
        lastUsedProduct: string;
        typicalCnpj?: string;
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
