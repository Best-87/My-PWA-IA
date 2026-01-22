import { createClient } from '@supabase/supabase-js';
import { WeighingRecord, UserProfile, KnowledgeBase } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Helper to check if supabase is configured
export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            storage: window.localStorage,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null as any;

// --- Auth Functions ---
export const signUp = async (email: string, password: string, metadata: any) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    return await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
    });
};

export const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
    if (!supabase) return;
    return await supabase.auth.signOut();
};

export const getSession = async () => {
    if (!supabase) return { data: { session: null }, error: null };
    return await supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => { } } } };
    return supabase.auth.onAuthStateChange(callback);
};

// --- Sync Functions ---
export const syncRecordToSupabase = async (record: WeighingRecord) => {
    if (!supabase) return { error: 'Not configured' };

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            console.warn('Sync aborted: User not logged in');
            return { error: 'User not authenticated' };
        }

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

        if (error) {
            console.error('Supabase Sync Error:', error.message);
            return { error: error.message };
        }
        return { success: true };
    } catch (err: any) {
        console.error('Supabase caught error:', err);
        return { error: err.message };
    }
};

export const syncProfileToSupabase = async (profile: UserProfile) => {
    if (!supabase) return;

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
    if (!supabase) return;

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

export const deleteRecordFromSupabase = async (recordId: string) => {
    if (!supabase) {
        console.warn('Supabase not configured');
        return { error: 'Not configured' };
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            console.warn('No user ID found in session');
            return { error: 'Not authenticated' };
        }

        const { error } = await supabase
            .from('weighing_records')
            .delete()
            .eq('id', recordId)
            .eq('user_id', userId); // Security: only delete own records

        if (error) {
            console.error('Supabase delete error:', error);
            return { error: error.message };
        }

        console.log(`Successfully deleted record ${recordId} from cloud`);
        return { success: true };
    } catch (err: any) {
        console.error('Delete record caught error:', err);
        return { error: err.message };
    }
};

export const clearAllRecordsFromSupabase = async () => {
    if (!supabase) {
        console.warn('Supabase not configured');
        return { error: 'Not configured' };
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            console.warn('No user ID found in session');
            return { error: 'Not authenticated' };
        }

        const { error } = await supabase
            .from('weighing_records')
            .delete()
            .eq('user_id', userId); // Delete all records for this user

        if (error) {
            console.error('Supabase clear all error:', error);
            return { error: error.message };
        }

        console.log('Successfully cleared all records from cloud');
        return { success: true };
    } catch (err: any) {
        console.error('Clear all records caught error:', err);
        return { error: err.message };
    }
};

export const fetchRecordsFromSupabase = async () => {
    if (!supabase) {
        console.warn('Supabase not configured');
        return [];
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        console.log('Fetching records for user:', userId);

        if (!userId) {
            console.warn('No user ID found in session');
            return [];
        }

        const { data, error } = await supabase
            .from('weighing_records')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Supabase fetch error:', error);
            return [];
        }

        console.log(`Successfully fetched ${data?.length || 0} records from cloud`);

        return (data || []).map((item: any) => ({
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
    } catch (err) {
        console.error('Fetch records caught error:', err);
        return [];
    }
};

