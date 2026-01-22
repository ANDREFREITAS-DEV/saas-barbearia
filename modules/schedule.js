import { supabase } from './supabaseClient.js';
import { storage } from '../core/storage.js';

export const schedule = {
    async listByDate(tenantId, dateStr) {
        // Cache key baseada em dia
        const cacheKey = `appointments_${tenantId}_${dateStr}`;

        if (!navigator.onLine) {
            return storage.get(cacheKey, []);
        }

        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                customers (name, phone),
                services (name)
            `)
            .eq('tenant_id', tenantId)
            .eq('date', dateStr)
            .order('time', { ascending: true });

        if (!error && data) {
            storage.set(cacheKey, data);
            return data;
        }
        return [];
    },

    async create(apptObj) {
        const { data, error } = await supabase
            .from('appointments')
            .insert([{ ...apptObj, status: 'confirmed' }]); // Status default
        
        if (error) {
            console.error(error);
            return false;
        }
        return true;
    },

    // Algoritmo simples para gerar slots de tempo
    generateSlots(openTime, closeTime, intervalMinutes, existingAppts) {
        const slots = [];
        let current = new Date(`2000-01-01T${openTime}`);
        const end = new Date(`2000-01-01T${closeTime}`);

        // Set de horários ocupados para lookup rápido
        const busyTimes = new Set(existingAppts.map(a => a.time.slice(0,5)));

        while (current < end) {
            const timeStr = current.toTimeString().slice(0,5);
            
            slots.push({
                time: timeStr,
                available: !busyTimes.has(timeStr)
            });

            current.setMinutes(current.getMinutes() + intervalMinutes);
        }
        return slots;
    }
};