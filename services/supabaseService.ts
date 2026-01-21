import { createClient } from '@supabase/supabase-js';
import { WeighingRecord, UserProfile, KnowledgeBase } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Helper to check if supabase is configured
export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null as any;

// --- Auth Functions ---
export const signUp = async (email: string, password: string, metadata: any) => {
    return await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
    });
};

export const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
    return await supabase.auth.signOut();
};

export const getSession = async () => {
    return await supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
};

// --- Sync Functions ---
export const syncRecordToSupabase = async (record: WeighingRecord) => {
    if (!isSupabaseConfigured()) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        const { error } = await supabase
            .from('weighing_records')
            .upsert({
                id: record.id,
                user_id: userId, // Bind to authenticated user
                timestamp: record.timestamp,
                supplier: record.supplier,
                product: record.product,
                gross_weight: record.grossWeight,
                note_weight: record.noteWeight,
                net_weight: record.netWeight,
                tara_total: record.taraTotal,
                boxes: record.boxes,
                status: record.status,
                ai_analysis: record.aiAnalysis,
                evidence: record.evidence,
                batch: record.batch,
                expiration_date: record.expirationDate,
                production_date: record.productionDate,
                recommended_temperature: record.recommendedTemperature,
                store: record.store
            });

        if (error) console.error('Supabase Sync Error:', error.message);
    } catch (err) {
        console.error('Supabase caught error:', err);
    }
};

export const syncProfileToSupabase = async (profile: UserProfile) => {
    if (!isSupabaseConfigured()) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: session.user.email,
                name: profile.name,
                role: profile.role,
                store: profile.store,
                photo: profile.photo,
                updated_at: new Date().toISOString()
            });

        if (error) console.error('Supabase Profile Sync Error:', error.message);
    } catch (err) {
        console.error('Supabase caught error:', err);
    }
};

export const syncKnowledgeBaseToSupabase = async (kb: KnowledgeBase) => {
    if (!isSupabaseConfigured()) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const { error } = await supabase
            .from('knowledge_base')
            .upsert({
                user_id: userId,
                data: kb,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) console.error('Supabase KB Sync Error:', error.message);
    } catch (err) {
        console.error('Supabase caught error:', err);
    }
};

export const fetchRecordsFromSupabase = async () => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('weighing_records')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Fetch error:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.id,
        timestamp: Number(item.timestamp),
        supplier: item.supplier,
        product: item.product,
        grossWeight: item.gross_weight,
        noteWeight: item.note_weight,
        netWeight: item.net_weight,
        taraTotal: item.tara_total,
        boxes: item.boxes,
        status: item.status,
        aiAnalysis: item.ai_analysis,
        evidence: item.evidence,
        batch: item.batch,
        expirationDate: item.expiration_date,
        productionDate: item.production_date,
        recommendedTemperature: item.recommended_temperature,
        store: item.store
    })) as WeighingRecord[];
};

