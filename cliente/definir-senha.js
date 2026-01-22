import { supabase } from '../core/supabase.js';

const form = document.getElementById('formSenha');
const msg = document.getElementById('msg');
const sucesso = document.getElementById('sucesso');
const btnLogin = document.getElementById('btnLogin');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';

  const senha = document.getElementById('senha').value;
  const confirmar = document.getElementById('confirmar').value;

  if (senha !== confirmar) {
    msg.textContent = 'As senhas não conferem';
    return;
  }

  // Atualiza a senha do usuário autenticado pelo link
  const { data, error } = await supabase.auth.updateUser({
    password: senha
  });

  if (error) {
    msg.textContent = 'Erro ao definir senha';
    console.error(error);
    return;
  }

  const user = data.user;

  // Buscar tenant do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single();

  // Ativar o tenant
  if (profile?.tenant_id) {
    await supabase
      .from('tenants')
      .update({ status: 'ativo' })
      .eq('id', profile.tenant_id);
  }

  // UX final (opção 3)
  form.style.display = 'none';
  sucesso.style.display = 'block';
});

// Botão explícito para login
btnLogin.addEventListener('click', () => {
  window.location.href = '/login.html';
});
