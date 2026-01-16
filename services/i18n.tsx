
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Language } from '../types';

const translations = {
    pt: {
        // Header
        app_name: 'Conferente',
        app_subtitle: 'Pro Assistant',
        
        // Profile
        lbl_profile: 'Perfil do Usuário',
        lbl_name: 'Nome',
        lbl_role: 'Cargo / Função',
        lbl_store: 'Loja / Filial',
        btn_change_photo: 'Alterar Foto',
        ph_name: 'Seu Nome',
        ph_role: 'Ex: Conferente Líder',
        ph_store: 'Ex: Loja 01 - Centro',
        
        // Tabs
        tab_weigh: 'Pesar',
        tab_history: 'Histórico',
        
        // Form
        assistant_default: 'Olá 👋 Selecione um fornecedor.',
        assistant_supplier: '👋 Olá! Comece indicando quem é o fornecedor.',
        assistant_product: '🧐 Sugestão: Trouxeram {product}?',
        assistant_product_ask: '🚛 Qual produto estão entregando hoje?',
        assistant_note: '📄 Digite o peso que consta na Nota Fiscal.',
        assistant_gross: '⚖️ Agora digite o que indica a balança (Bruto).',
        assistant_ok: '✅ Perfeito! Peso dentro da margem. Tudo pronto para salvar.',
        assistant_high: '⚠️ Sobram {diff}kg. Esqueceu alguma tara?',
        assistant_low: '⚠️ Faltam {diff}kg. Verifique caixas ou mermas.',
        
        lbl_identity: 'Identificação',
        ph_supplier: 'Fornecedor',
        ph_product: 'Produto',
        ph_batch: 'Lote',
        ph_expiration: 'Validade',
        ph_production: 'Fabricação',
        btn_suggestion: 'Sugestão para {supplier}:',
        
        lbl_weighing: 'Pesagem',
        lbl_note_weight: 'Peso Nota',
        lbl_gross_weight: 'Peso Bruto',
        
        lbl_tara_section: 'Tara e Embalagens',
        lbl_ai_pattern: 'IA detectó patrón',
        btn_apply_tara: 'Usar Tara de {supplier}: {weight}g',
        lbl_qty: 'Quantidade',
        lbl_unit_weight: 'Peso Unit (g)',

        lbl_evidence_section: 'Foto / Leitura IA',
        btn_add_photo: '📷 Foto / Galeria',
        btn_camera: '📷 Câmera',
        btn_gallery: '🖼️ Galeria',
        btn_remove_photo: 'Remover',
        lbl_photo_attached: 'Foto Anexada',
        lbl_analyzing_img: '🔍 Lendo Rótulo (IA)...',
        
        // Smart Tips
        tip_title_quality: 'Qualidade Visual',
        tip_quality_visual: 'Confira aspecto da embalagem, cor e cheiro.',
        tip_title_date: 'Atenção à Validade',
        tip_date_short: 'Produto perecível com data curta. Verifique!',
        tip_date_ok: 'Validade OK. Vence em {days} dias.',
        tip_title_history: 'Histórico Recente',
        tip_title_storage: 'Conservação',
        tip_frozen: '❄️ Produto Congelado. Verifique se está a -18°C.',
        tip_chilled: '💧 Produto Resfriado. Verifique se está entre 0-7°C.',
        tip_dry: '📦 Manter em local seco e arejado.',
        tip_title_batch: 'Rastreabilidade',
        tip_batch_found: 'Lote {batch} registrado.',
        tip_title_alert: 'ALERTA CRÍTICO',
        
        btn_save: 'Salvar',
        btn_clear: 'Limpar',
        btn_erase: 'Apagar',
        btn_delete_all_history: 'Apagar Tudo',
        btn_analyzing: 'Analisando...',
        btn_consult_ai: 'Consultar Supervisão IA',
        
        alert_saved: 'Pesagem salva com sucesso.',
        msg_confirm_clear: 'Deseja limpar todo o formulário?',
        msg_confirm_delete: 'Deseja excluir este registro?',
        msg_confirm_delete_all: 'ATENÇÃO: Deseja apagar TODO o histórico?',
        msg_validation_error: 'Preencha Fornecedor, Produto e Pesos.',
        msg_form_cleared: 'Formulário limpo.',
        msg_history_cleared: 'Histórico apagado.',
        msg_profile_saved: 'Perfil atualizado com sucesso!',
        
        // History & Filters
        hist_recent: 'Histórico',
        hist_empty: 'Sem registros.',
        hist_liquid: 'LÍQUIDO',
        hist_diff: 'DIFERENÇA',
        ph_search: 'Buscar fornecedor, produto...',
        filter_all: 'Tudo',
        filter_today: 'Hoje',
        filter_week: '7 Dias',
        filter_month: 'Mês',
        filter_year: 'Ano',
        btn_export: 'Exportar CSV',
        
        // WhatsApp Report
        rpt_title: '*Relatório de Pesagem - Conferente Pro*',
        rpt_supplier: '🏭 *Fornecedor:*',
        rpt_product: '📦 *Produto:*',
        rpt_batch: '🔢 *Lote:*',
        rpt_expiration: '📅 *Validade:*',
        rpt_production: '🏭 *Fabricação:*',
        rpt_note: '📄 *Peso Nota:*',
        rpt_gross: '⚖️ *Peso Bruto:*',
        rpt_tara: '📦 *Tara:*',
        rpt_net: '✅ *Peso Líquido:*',
        rpt_diff: '📊 *Diferença:*',
        rpt_status: '🤖 *Status:*',
        rpt_valid: 'Validado',
        rpt_review: 'Revisão Necessária',
        rpt_ai_obs: '📝 *Obs IA:*',
        
        // Install
        install_modal_title: 'Instalar App',
        install_modal_desc: 'Instale o Conferente Pro para acesso offline e melhor desempenho.',
        btn_install: 'Instalar Agora',
        btn_not_now: 'Agora não',
        update_available: 'Nova versão disponível',
        btn_update: 'Atualizar',
        
        // Logic
        ai_prompt_lang: 'Português'
    },
    es: {
        app_name: 'Conferente',
        app_subtitle: 'Pro Assistant',
        
        // Profile
        lbl_profile: 'Perfil de Usuario',
        lbl_name: 'Nombre',
        lbl_role: 'Cargo / Función',
        lbl_store: 'Tienda / Sucursal',
        btn_change_photo: 'Cambiar Foto',
        ph_name: 'Tu Nombre',
        ph_role: 'Ej: Conferente Líder',
        ph_store: 'Ej: Tienda 01 - Centro',

        tab_weigh: 'Pesar',
        tab_history: 'Historial',
        assistant_default: 'Hola 👋 Selecciona un proveedor.',
        assistant_supplier: '👋 ¡Hola! Empieza indicando quién es el proveedor.',
        assistant_product: '🧐 Sugerencia: ¿Trajeron {product}?',
        assistant_product_ask: '🚛 ¿Qué producto están entregando hoy?',
        assistant_note: '📄 Ingresa el peso que figura en la Factura.',
        assistant_gross: '⚖️ Ahora ingresa lo que indica la balanza (Bruto).',
        assistant_ok: '✅ ¡Perfecto! Peso dentro del margen. Todo listo para guardar.',
        assistant_high: '⚠️ Sobran {diff}kg. ¿Olvidaste alguna tara?',
        assistant_low: '⚠️ Faltan {diff}kg. Verifica cajas o mermas.',
        
        lbl_identity: 'Identificación',
        ph_supplier: 'Proveedor',
        ph_product: 'Producto',
        ph_batch: 'Lote',
        ph_expiration: 'Vencimiento',
        ph_production: 'Fabricación',
        btn_suggestion: 'Sugerencia para {supplier}:',
        
        lbl_weighing: 'Pesaje',
        lbl_note_weight: 'Peso Nota',
        lbl_gross_weight: 'Peso Bruto',
        
        lbl_tara_section: 'Tara y Envases',
        lbl_ai_pattern: 'IA detectó patrón',
        btn_apply_tara: 'Usar Tara de {supplier}: {weight}g',
        lbl_qty: 'Cantidad',
        lbl_unit_weight: 'Peso Unit (g)',

        lbl_evidence_section: 'Foto / Lectura IA',
        btn_add_photo: '📷 Foto / Galería',
        btn_camera: '📷 Cámara',
        btn_gallery: '🖼️ Galería',
        btn_remove_photo: 'Quitar',
        lbl_photo_attached: 'Foto Adjunta',
        lbl_analyzing_img: '🔍 Leyendo Etiqueta (IA)...',

        // Smart Tips
        tip_title_quality: 'Calidad Visual',
        tip_quality_visual: 'Revisa aspecto del envase, color y olor.',
        tip_title_date: 'Ojo al Vencimiento',
        tip_date_short: 'Producto perecedero con fecha corta. ¡Verifica!',
        tip_date_ok: 'Vencimiento OK. Faltan {days} días.',
        tip_title_history: 'Historial Reciente',
        tip_title_storage: 'Conservación',
        tip_frozen: '❄️ Producto Congelado. Verifica que esté a -18°C.',
        tip_chilled: '💧 Producto Refrigerado. Verifica que esté entre 0-7°C.',
        tip_dry: '📦 Mantener en lugar seco y fresco.',
        tip_title_batch: 'Trazabilidad',
        tip_batch_found: 'Lote {batch} registrado.',
        tip_title_alert: 'ALERTA CRÍTICO',

        btn_save: 'Guardar',
        btn_clear: 'Limpiar',
        btn_erase: 'Borrar',
        btn_delete_all_history: 'Borrar Todo',
        btn_analyzing: 'Analizando...',
        btn_consult_ai: 'Consultar Supervisión IA',
        
        alert_saved: 'Pesaje guardado con éxito.',
        msg_confirm_clear: '¿Deseas limpiar todo el formulario?',
        msg_confirm_delete: '¿Deseas eliminar este registro?',
        msg_confirm_delete_all: 'ATENCIÓN: ¿Deseas borrar TODO el historial?',
        msg_validation_error: 'Completa Proveedor, Producto y Pesos.',
        msg_form_cleared: 'Formulario limpio.',
        msg_history_cleared: 'Historial borrado.',
        msg_profile_saved: '¡Perfil actualizado con éxito!',
        
        // History & Filters
        hist_recent: 'Historial',
        hist_empty: 'Sin registros.',
        hist_liquid: 'LÍQUIDO',
        hist_diff: 'DIFERENCIA',
        ph_search: 'Buscar proveedor, producto...',
        filter_all: 'Todo',
        filter_today: 'Hoy',
        filter_week: '7 Días',
        filter_month: 'Mes',
        filter_year: 'Año',
        btn_export: 'Exportar CSV',

        // WhatsApp Report
        rpt_title: '*Reporte de Pesaje - Conferente Pro*',
        rpt_supplier: '🏭 *Proveedor:*',
        rpt_product: '📦 *Producto:*',
        rpt_batch: '🔢 *Lote:*',
        rpt_expiration: '📅 *Vencimiento:*',
        rpt_production: '🏭 *Fabricación:*',
        rpt_note: '📄 *Peso Nota:*',
        rpt_gross: '⚖️ *Peso Bruto:*',
        rpt_tara: '📦 *Tara:*',
        rpt_net: '✅ *Peso Neto:*',
        rpt_diff: '📊 *Diferencia:*',
        rpt_status: '🤖 *Estado:*',
        rpt_valid: 'Validado',
        rpt_review: 'Revisión Necesaria',
        rpt_ai_obs: '📝 *Obs IA:*',

        // Install
        install_modal_title: 'Instalar App',
        install_modal_desc: 'Instala Conferente Pro para acceso offline y mejor rendimiento.',
        btn_install: 'Instalar Ahora',
        btn_not_now: 'Ahora no',
        update_available: 'Nueva versión disponible',
        btn_update: 'Actualizar',
        
        // Logic
        ai_prompt_lang: 'Español'
    },
    en: {
        app_name: 'Conferente',
        app_subtitle: 'Pro Assistant',
        
        // Profile
        lbl_profile: 'User Profile',
        lbl_name: 'Name',
        lbl_role: 'Role / Job',
        lbl_store: 'Store / Branch',
        btn_change_photo: 'Change Photo',
        ph_name: 'Your Name',
        ph_role: 'Ex: Lead Checker',
        ph_store: 'Ex: Branch 01',

        tab_weigh: 'Weigh',
        tab_history: 'History',
        assistant_default: 'Hi 👋 Select a supplier.',
        assistant_supplier: '👋 Hello! Start by selecting a supplier.',
        assistant_product: '🧐 Suggestion: Did they bring {product}?',
        assistant_product_ask: '🚛 What product is being delivered today?',
        assistant_note: '📄 Enter the weight shown on the Invoice.',
        assistant_gross: '⚖️ Now enter the scale weight (Gross).',
        assistant_ok: '✅ Perfect! Weight within range. Ready to save.',
        assistant_high: '⚠️ {diff}kg over. Did you forget any tara?',
        assistant_low: '⚠️ {diff}kg under. Check for boxes or shrinkage.',
        
        lbl_identity: 'Identity',
        ph_supplier: 'Supplier',
        ph_product: 'Product',
        ph_batch: 'Batch',
        ph_expiration: 'Expiration',
        ph_production: 'Production',
        btn_suggestion: 'Suggestion for {supplier}:',
        
        lbl_weighing: 'Weighing',
        lbl_note_weight: 'Invoice Weight',
        lbl_gross_weight: 'Gross Weight',
        
        lbl_tara_section: 'Tara & Packaging',
        lbl_ai_pattern: 'AI detected pattern',
        btn_apply_tara: 'Use Tara for {supplier}: {weight}g',
        lbl_qty: 'Qty',
        lbl_unit_weight: 'Unit Weight (g)',

        lbl_evidence_section: 'Photo / AI Read',
        btn_add_photo: '📷 Photo / Gallery',
        btn_camera: '📷 Camera',
        btn_gallery: '🖼️ Gallery',
        btn_remove_photo: 'Remove',
        lbl_photo_attached: 'Photo Attached',
        lbl_analyzing_img: '🔍 Reading Label (AI)...',

        // Smart Tips
        tip_title_quality: 'Visual Quality',
        tip_quality_visual: 'Check packaging aspect, color, and smell.',
        tip_title_date: 'Expiration Check',
        tip_date_short: 'Perishable item with short date. Verify!',
        tip_date_ok: 'Expiration OK. {days} days left.',
        tip_title_history: 'Recent History',
        tip_title_storage: 'Storage',
        tip_frozen: '❄️ Frozen Product. Verify it is at -18°C.',
        tip_chilled: '💧 Chilled Product. Verify it is 0-7°C.',
        tip_dry: '📦 Keep in dry place.',
        tip_title_batch: 'Traceability',
        tip_batch_found: 'Batch {batch} registered.',
        tip_title_alert: 'CRITICAL ALERT',

        btn_save: 'Save',
        btn_clear: 'Clear',
        btn_erase: 'Delete',
        btn_delete_all_history: 'Delete All',
        btn_analyzing: 'Analyzing...',
        btn_consult_ai: 'Consult AI Supervision',
        
        alert_saved: 'Weighing saved successfully.',
        msg_confirm_clear: 'Clear the entire form?',
        msg_confirm_delete: 'Delete this record?',
        msg_confirm_delete_all: 'WARNING: Delete ALL history?',
        msg_validation_error: 'Fill in Supplier, Product, and Weights.',
        msg_form_cleared: 'Form cleared.',
        msg_history_cleared: 'History cleared.',
        msg_profile_saved: 'Profile updated successfully!',
        
        // History & Filters
        hist_recent: 'History',
        hist_empty: 'No records.',
        hist_liquid: 'NET',
        hist_diff: 'DIFF',
        ph_search: 'Search supplier, product...',
        filter_all: 'All',
        filter_today: 'Today',
        filter_week: '7 Days',
        filter_month: 'Month',
        filter_year: 'Year',
        btn_export: 'Export CSV',

        // WhatsApp Report
        rpt_title: '*Weighing Report - Conferente Pro*',
        rpt_supplier: '🏭 *Supplier:*',
        rpt_product: '📦 *Product:*',
        rpt_batch: '🔢 *Batch:*',
        rpt_expiration: '📅 *Expiration:*',
        rpt_production: '🏭 *Production:*',
        rpt_note: '📄 *Inv. Weight:*',
        rpt_gross: '⚖️ *Gross Weight:*',
        rpt_tara: '📦 *Tara:*',
        rpt_net: '✅ *Net Weight:*',
        rpt_diff: '📊 *Diff:*',
        rpt_status: '🤖 *Status:*',
        rpt_valid: 'Validated',
        rpt_review: 'Review Needed',
        rpt_ai_obs: '📝 *AI Obs:*',

        // Install
        install_modal_title: 'Install App',
        install_modal_desc: 'Install Conferente Pro for offline access and better performance.',
        btn_install: 'Install Now',
        btn_not_now: 'Not Now',
        update_available: 'New version available',
        btn_update: 'Update',
        
        // Logic
        ai_prompt_lang: 'English'
    }
};

type LanguageContextProps = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string>) => string;
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Detect browser language or fallback to 'pt'
    const getBrowserLang = (): Language => {
        const lang = navigator.language.split('-')[0];
        if (lang === 'es') return 'es';
        if (lang === 'en') return 'en';
        return 'pt';
    };

    const [language, setLanguageState] = useState<Language>('es'); // Defaulting to Spanish per request context

    useEffect(() => {
        const savedLang = localStorage.getItem('conferente_lang') as Language;
        if (savedLang) {
            setLanguageState(savedLang);
        } else {
            setLanguageState(getBrowserLang());
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('conferente_lang', lang);
    };

    const t = (key: string, params?: Record<string, string>): string => {
        const text = translations[language][key as keyof typeof translations['pt']] || key;
        if (params) {
            return Object.entries(params).reduce((acc, [k, v]) => {
                return acc.replace(`{${k}}`, v);
            }, text);
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};