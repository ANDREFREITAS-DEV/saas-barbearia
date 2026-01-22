import { supabase } from './supabaseClient.js';
import { storage } from '../core/storage.js';

export const tenants = {
    async resolveTenant() {
        // 1. Tentar pegar da URL
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('tenant');

        if (!slug) {
            // Fallback: Tentar pegar do storage (se o usuário recarregar a pág sem query string)
            const cached = storage.get('current_tenant');
            if (cached) return cached;
            throw new Error('Tenant Slug not found');
        }

        // 2. Buscar ID no Supabase
        // Se offline, tentar usar cache
        if (!navigator.onLine) {
            const cached = storage.get('current_tenant');
            if (cached && cached.slug === slug) return cached;
            // Se não tem cache e está offline, erro crítico
            throw new Error('Offline e sem tenant cacheado');
        }

        const { data, error } = await supabase
            .from('tenants')
            .select('id, name, slug')
            .eq('slug', slug)
            .single();

        if (error || !data) throw error || new Error('Tenant not found');

        // 3. Cachear
        storage.set('current_tenant', data);
        return data;
    }
};