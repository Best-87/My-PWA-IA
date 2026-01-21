import { createClient } from '@supabase/supabase-js';
import { WeighingRecord, UserProfile, KnowledgeBase } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Helper to check if supabase is configured
export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null as any;

export const syncRecordToSupabase = async (record: WeighingRecord) => {
    if (!isSupabaseConfigured()) return;

    try {
        const { error } = await supabase
            .from('weighing_records')
            .upsert({
                id: record.id,
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
        // Since we don't have user auth yet, we'll use a fixed ID or email as key
        // For now, let's upsert by email if available, otherwise we'd need auth
        if (!profile.email) return;

        const { error } = await supabase
            .from('profiles')
            .upsert({
                email: profile.email,
                name: profile.name,
                role: profile.role,
                store: profile.store,
                photo: profile.photo
            }, { onConflict: 'email' });

        if (error) console.error('Supabase Profile Sync Error:', error.message);
    } catch (err) {
        console.error('Supabase caught error:', err);
    }
};

export const syncKnowledgeBaseToSupabase = async (kb: KnowledgeBase, email: string) => {
    if (!isSupabaseConfigured() || !email) return;

    try {
        // Get user profile id first
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (profile) {
            const { error } = await supabase
                .from('knowledge_base')
                .upsert({
                    user_id: profile.id,
                    data: kb
                }, { onConflict: 'user_id' });

            if (error) console.error('Supabase KB Sync Error:', error.message);
        }
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
