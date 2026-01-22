import { supabase } from './supabaseClient.js';

export const auth = {
    getUser: async () => {
        const { data } = await supabase.auth.getUser();
        return data.user;
    },
    // No MVP, a autenticação é simplificada (SaaS público para clientes, admin "aberto" pela URL)
    // Futuramente aqui entraria signInWithPassword
};