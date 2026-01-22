import { supabase } from './core/supabase.js';

/* =======================
   PROTEÇÃO MASTER
======================= */
const MASTER_EMAIL = 'andre_ssp@live.com';
const { data: { user } } = await supabase.auth.getUser();

if (!user || user.email !== MASTER_EMAIL) {
  window.location.href = './login.html';
}

/* =======================
   ELEMENTOS
======================= */
const lista = document.getElementById('lista');
const form = document.getElementById('formCriar');
const filtros = document.querySelectorAll('.filtros button');
const btnSair = document.getElementById('btnSair');

/* =======================
   ESTADO
======================= */
let statusAtual = 'todos';
let cache = [];

/* =======================
   LISTAR TENANTS
======================= */
async function carregar() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, status, admin_email, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar tenants:', error);
    lista.innerHTML = `
      <tr>
        <td colspan="4">Erro ao carregar dados</td>
      </tr>
    `;
    return;
  }

  cache = data ?? [];
  render();
}

/* =======================
   RENDER
======================= */
function render() {
  lista.innerHTML = '';

  const filtrados = cache.filter(t =>
    statusAtual === 'todos' ? true : t.status === statusAtual
  );

  if (filtrados.length === 0) {
    lista.innerHTML = `
      <tr>
        <td colspan="4">Nenhuma barbearia encontrada</td>
      </tr>
    `;
    return;
  }

  filtrados.forEach(t => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${t.name}</td>
      <td>${t.admin_email ?? '-'}</td>
      <td class="status-${t.status}">${t.status}</td>
      <td>${acoesPorStatus(t)}</td>
    `;

    lista.appendChild(tr);
  });
}

/* =======================
   AÇÕES POR STATUS
======================= */
function acoesPorStatus(t) {
  if (t.status === 'pendente') {
    return `
      <button data-id="${t.id}" data-acao="inativar">Inativar</button>
      <button data-id="${t.id}" data-acao="reenviar">Reenviar acesso</button>
    `;
  }

  if (t.status === 'ativo') {
    return `
      <button data-id="${t.id}" data-acao="inativar">Inativar</button>
    `;
  }

  if (t.status === 'inativo') {
    return `
      <button data-id="${t.id}" data-acao="ativar">Reativar</button>
    `;
  }

  return '';
}

/* =======================
   HANDLER DE AÇÕES
======================= */
lista.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const id = btn.dataset.id;
  const acao = btn.dataset.acao;

  if (acao === 'ativar') {
    await atualizarStatus(id, 'ativo');
  }

  if (acao === 'inativar') {
    await atualizarStatus(id, 'inativo');
  }

  if (acao === 'reenviar') {
    await reenviarAcesso(id);
  }
});

/* =======================
   UPDATE STATUS
======================= */
async function atualizarStatus(id, status) {
  const { error } = await supabase
    .from('tenants')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar status:', error);
    alert('Erro ao atualizar status');
    return;
  }

  carregar();
}

/* =======================
   REENVIAR ACESSO (EDGE)
======================= */
async function reenviarAcesso(tenantId) {
  const tenant = cache.find(t => t.id === tenantId);

  if (!tenant || !tenant.admin_email) {
    alert('Email do dono não encontrado');
    return;
  }

  const slug = gerarSlug(tenant.name);

  const response = await fetch(
    'https://aopauiwavjqbyhcnhkee.supabase.co/functions/v1/criar-admin-barbearia',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: tenant.admin_email,
        nome_barbearia: tenant.name,
        slug
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    alert('Erro ao reenviar acesso: ' + (result.error || 'erro desconhecido'));
    return;
  }

  // WhatsApp (opcional)
  const msg = `
Olá! 👋
Seu acesso ao sistema foi criado ou reenviado com sucesso.

👉 Verifique seu email para definir a senha e acessar o painel.
`.trim();

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(whatsappUrl, '_blank');

  alert('Acesso reenviado com sucesso');
}


/* =======================
   GERAR SLUG
======================= */
function gerarSlug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/* =======================
   FILTROS
======================= */
filtros.forEach(btn => {
  btn.addEventListener('click', () => {
    filtros.forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');

    statusAtual = btn.dataset.status;
    render();
  });
});

/* =======================
   CRIAR TENANT (EDGE)
======================= */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('nome').value.trim();
  const admin_email = document.getElementById('email').value.trim();

  if (!name || !admin_email) {
    alert('Preencha todos os campos');
    return;
  }

  const slug = gerarSlug(name);

  // 1️⃣ Criar usuário Auth + enviar email
  const response = await fetch(
  'https://aopauiwavjqbyhcnhkee.supabase.co/functions/v1/criar-admin-barbearia',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      email: tenant.admin_email,
      nome_barbearia: tenant.name,
      slug
    })
  }
);



  const result = await response.json();

  if (!response.ok) {
    alert('Erro ao criar acesso: ' + (result.error || 'erro desconhecido'));
    return;
  }

  // 2️⃣ Salvar tenant no banco
  const { error } = await supabase
    .from('tenants')
    .insert({
      name,
      slug,
      admin_email,
      status: 'pendente'
    });

  if (error) {
    console.error('Erro ao criar tenant:', error);
    alert('Erro ao salvar barbearia');
    return;
  }

  alert('Barbearia criada e convite enviado com sucesso');

  form.reset();
  carregar();
});

/* =======================
   LOGOUT
======================= */
if (btnSair) {
  btnSair.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = './login.html';
  });
}

/* =======================
   INIT
======================= */
carregar();
