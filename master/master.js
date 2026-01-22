import { supabase } from '../core/supabase.js';

/* =========================
   UTIL
========================= */
function gerarSlug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* =========================
   SESSÃO MASTER
========================= */
const {
  data: { session }
} = await supabase.auth.getSession();

if (!session) {
  window.location.href = './login.html';
}

/* =========================
   ELEMENTOS
========================= */
const form = document.getElementById('formCriar');
const tbody = document.querySelector('tbody');
const filtros = document.querySelectorAll('[data-filtro]');
const btnSair = document.getElementById('btnSair');

let filtroAtual = 'todos';

/* =========================
   SAIR
========================= */
if (btnSair) {
  btnSair.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = './login.html';
  });
}

/* =========================
   CARREGAR TENANTS
========================= */
async function carregar() {
  let query = supabase.from('tenants').select('*').order('created_at', { ascending: false });

  if (filtroAtual !== 'todos') {
    query = query.eq('status', filtroAtual);
  }

  const { data, error } = await query;

  if (error) {
    alert('Erro ao carregar dados');
    return;
  }

  tbody.innerHTML = '';

  data.forEach((tenant) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${tenant.name}</td>
      <td>${tenant.admin_email || '-'}</td>
      <td class="${tenant.status}">${tenant.status}</td>
      <td>
        ${
          tenant.status === 'inativo'
            ? `<button data-acao="ativar" data-id="${tenant.id}">Reativar</button>`
            : `<button data-acao="inativar" data-id="${tenant.id}">Inativar</button>`
        }
        <button data-acao="reenviar" data-id="${tenant.id}">Reenviar acesso</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   FILTROS
========================= */
filtros.forEach((btn) => {
  btn.addEventListener('click', () => {
    filtroAtual = btn.dataset.filtro;
    carregar();
  });
});

/* =========================
   AÇÕES (ATIVAR / INATIVAR / REENVIAR)
========================= */
tbody.addEventListener('click', async (e) => {
  const acao = e.target.dataset.acao;
  const id = e.target.dataset.id;

  if (!acao || !id) return;

  if (acao === 'ativar') {
    await supabase.from('tenants').update({ status: 'ativo' }).eq('id', id);
    carregar();
  }

  if (acao === 'inativar') {
    await supabase.from('tenants').update({ status: 'inativo' }).eq('id', id);
    carregar();
  }

  if (acao === 'reenviar') {
    reenviarAcesso(id);
  }
});

/* =========================
   REENVIAR ACESSO
========================= */
async function reenviarAcesso(tenantId) {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('name, slug, admin_email')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    alert('Erro ao localizar barbearia');
    return;
  }

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
        slug: tenant.slug
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    alert('Erro ao reenviar acesso');
    return;
  }

  alert('Acesso reenviado com sucesso');
}

/* =========================
   CRIAR BARBEARIA
========================= */
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
        email: admin_email,
        nome_barbearia: name,
        slug
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    alert('Erro ao criar acesso');
    return;
  }

  // 2️⃣ Salvar tenant
  const { error } = await supabase.from('tenants').insert({
    name,
    slug,
    admin_email,
    status: 'pendente'
  });

  if (error) {
    alert('Erro ao salvar barbearia');
    return;
  }

  alert('Barbearia criada e convite enviado');

  form.reset();
  carregar();
});

/* =========================
   INIT
========================= */
carregar();
