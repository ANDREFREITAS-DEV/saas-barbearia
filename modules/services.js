import { supabase } from './supabaseClient.js';
import { storage } from '../core/storage.js';

export const services = {
    async list(tenantId) {
        if (!navigator.onLine) {
            return storage.get(`services_${tenantId}`, []);
        }

        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('tenant_id', tenantId);

        if (!error && data) {
            storage.set(`services_${tenantId}`, data);
            return data;
        }
        return [];
    },

    async create(serviceObj) {
        const { data, error } = await supabase
            .from('services')
            .insert([serviceObj])
            .select();
        
        if(error) {
            console.error(error);
            return null;
        }
        return data;
    }
};