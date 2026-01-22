import { createClient } from '@supabase/supabase-js';

// TODO: Inserir credenciais reais aqui
const SUPABASE_URL = 'https://aopauiwavjqbyhcnhkee.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_rn_uS0krjsM5niBeZe7Ibw_sMFwzIJP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);