import { supabase } from './supabaseClient.js';

export const customers = {
    async ensureCustomer(tenantId, name, phone) {
        // 1. Tentar encontrar pelo telefone
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .single();

        if (existing) return existing;

        // 2. Se não existir, criar
        const { data: created, error } = await supabase
            .from('customers')
            .insert([{ tenant_id: tenantId, name, phone }])
            .select()
            .single();

        if (error) throw error;
        return created;
    }
};