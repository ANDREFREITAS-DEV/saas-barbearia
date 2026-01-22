import { supabase } from '../master/core/supabase.js';

const form = document.getElementById('formSenha');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const senha = document.getElementById('senha').value;
  const confirmar = document.getElementById('confirmar').value;

  if (senha !== confirmar) {
    msg.textContent = 'As senhas não conferem';
    return;
  }

  // 1. Atualiza a senha do usuário autenticado pelo link
  const { data, error } = await supabase.auth.updateUser({
    password: senha
  });

  if (error) {
    msg.textContent = 'Erro ao definir senha';
    console.error(error);
    return;
  }

  // 2. Buscar tenant do usuário
  const user = data.user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  // 3. Ativar o tenant
  if (profile?.tenant_id) {
    await supabase
      .from('tenants')
      .update({ status: 'ativo' })
      .eq('id', profile.tenant_id);
  }

  // 4. Redirecionar para o painel do cliente
  window.location.href = '/cliente/painel.html';
});
