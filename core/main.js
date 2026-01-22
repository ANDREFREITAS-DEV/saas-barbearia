import { ui } from './ui.js';
import { storage } from './storage.js';
import { supabase } from '../modules/supabaseClient.js';
import { tenants } from '../modules/tenants.js';
import { services } from '../modules/services.js';
import { schedule } from '../modules/schedule.js';
import { customers } from '../modules/customers.js';

// --- Estado Global Simples ---
const state = {
    tenant: null,
    theme: storage.get('theme', 'light'),
    view: 'view-booking'
};

// --- Inicialização ---
async function init() {
    // 1. Aplicar Tema
    ui.setTheme(state.theme);
    
    // 2. Resolver Tenant
    try {
        state.tenant = await tenants.resolveTenant();
        document.getElementById('tenant-name').textContent = state.tenant.name;
        document.getElementById('settings-slug').textContent = state.tenant.slug;
    } catch (err) {
        document.getElementById('tenant-name').textContent = 'Erro de Tenant';
        alert('Barbearia não encontrada (URL ?tenant=slug faltando ou inválido).');
        return; // Para execução crítica
    }

    // 3. Event Listeners
    setupEventListeners();
    
    // 4. Inicializar View Padrão
    ui.showView('view-booking');
    loadBookingData(); // Carregar dados iniciais da home

    // 5. Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('SW Registrado'))
            .catch(err => console.error('SW Falha', err));
    }

    // 6. Monitorar Conexão
    window.addEventListener('online', () => ui.toggleOfflineBanner(false));
    window.addEventListener('offline', () => ui.toggleOfflineBanner(true));
    ui.toggleOfflineBanner(!navigator.onLine);
}

// --- Event Listeners ---
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            state.view = target;
            ui.showView(target);
            handleViewChange(target);
        });
    });

    // Tema
    document.getElementById('theme-toggle').addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        ui.setTheme(state.theme);
        storage.set('theme', state.theme);
    });

    // Form Agendamento
    document.getElementById('booking-date').addEventListener('change', loadSlots);
    document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);

    // Form Admin Serviço
    document.getElementById('service-form').addEventListener('submit', handleServiceSubmit);
    
    // Dashboard Filtro
    const today = new Date().toISOString().split('T')[0];
    const dashDate = document.getElementById('dashboard-date');
    dashDate.value = today;
    dashDate.addEventListener('change', loadDashboard);

    // Configurações
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        const open = document.getElementById('config-open').value;
        const close = document.getElementById('config-close').value;
        storage.set('config_hours', { open, close });
        alert('Horários salvos localmente!');
    });
}

// --- Lógica de Views ---
async function handleViewChange(viewId) {
    if (viewId === 'view-admin') loadServicesAdmin();
    if (viewId === 'view-dashboard') loadDashboard();
}

// --- Lógica Agendamento (Booking) ---
async function loadBookingData() {
    const list = await services.list(state.tenant.id);
    const select = document.getElementById('booking-service');
    select.innerHTML = '<option value="">Selecione...</option>';
    list.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.duration_minutes}m) - R$${s.price || '0'}`;
        opt.dataset.duration = s.duration_minutes;
        select.appendChild(opt);
    });
}

async function loadSlots() {
    const date = document.getElementById('booking-date').value;
    const serviceId = document.getElementById('booking-service').value;
    const container = document.getElementById('slots-container');
    
    if (!date || !serviceId) return;

    container.innerHTML = 'Carregando...';

    // Obter agendamentos existentes
    const existingAppointments = await schedule.listByDate(state.tenant.id, date);
    
    // Gerar slots (Lógica simplificada baseada em config local ou hardcoded)
    const config = storage.get('config_hours', { open: '09:00', close: '18:00' });
    const slots = schedule.generateSlots(config.open, config.close, 30, existingAppointments); // Assumindo 30m fixo para calculo de slots livres por enquanto

    ui.renderList('slots-container', slots, (slot) => {
        const btn = document.createElement('div');
        btn.className = `slot-btn ${slot.available ? '' : 'disabled'}`;
        btn.textContent = slot.time;
        if(slot.available) {
            btn.onclick = () => {
                document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                btn.dataset.selected = "true";
            };
        }
        return btn;
    }, 'Sem horários livres.');
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    if(!navigator.onLine) return alert('Modo Offline: Não é possível criar agendamentos agora.');

    const selectedSlot = document.querySelector('.slot-btn.selected');
    if (!selectedSlot) return alert('Selecione um horário!');

    const data = {
        tenant_id: state.tenant.id,
        service_id: document.getElementById('booking-service').value,
        date: document.getElementById('booking-date').value,
        time: selectedSlot.textContent,
        customer_name: document.getElementById('client-name').value,
        customer_phone: document.getElementById('client-phone').value
    };

    // 1. Criar ou buscar cliente (Simplificado: Cria no modulo customers)
    const customer = await customers.ensureCustomer(state.tenant.id, data.customer_name, data.customer_phone);
    
    // 2. Criar Agendamento
    const result = await schedule.create({
        tenant_id: data.tenant_id,
        service_id: data.service_id,
        customer_id: customer.id,
        date: data.date,
        time: data.time
    });

    if (result) {
        alert('Agendamento realizado com sucesso!');
        e.target.reset();
        document.getElementById('slots-container').innerHTML = '';
        loadBookingData(); // recarrega para limpar estado visual
    } else {
        alert('Erro ao agendar.');
    }
}

// --- Lógica Dashboard ---
async function loadDashboard() {
    const date = document.getElementById('dashboard-date').value;
    const apps = await schedule.listByDate(state.tenant.id, date);
    
    ui.renderList('appointments-list', apps, (app) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div>
                <strong>${app.time.slice(0,5)}</strong> - ${app.customers?.name || 'Cliente'}<br>
                <span class="text-muted">${app.services?.name || 'Serviço'}</span>
            </div>
            <a href="tel:${app.customers?.phone}" class="btn-icon">📞</a>
        `;
        return div;
    }, 'Nenhum agendamento para este dia.');
}

// --- Lógica Admin Serviços ---
async function loadServicesAdmin() {
    const list = await services.list(state.tenant.id);
    ui.renderList('admin-services-list', list, (s) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
            <span>${s.name} (${s.duration_minutes}m)</span>
            <strong>R$ ${s.price}</strong>
        `;
        return li;
    });
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    if(!navigator.onLine) return alert('Offline: Não é possível adicionar serviços.');

    const newService = {
        tenant_id: state.tenant.id,
        name: document.getElementById('service-name').value,
        duration_minutes: parseInt(document.getElementById('service-duration').value),
        price: parseFloat(document.getElementById('service-price').value)
    };

    await services.create(newService);
    e.target.reset();
    loadServicesAdmin();
}

// Iniciar app
init();