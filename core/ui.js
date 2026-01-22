export const ui = {
    // Alterna visibilidade das telas
    showView: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        
        // Atualiza Nav
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === viewId);
        });
    },

    // Alterna Tema
    setTheme: (themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
        // Atualiza meta tag para barra de status mobile
        const color = themeName === 'dark' ? '#121212' : '#ffffff';
        document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
    },

    // Renderiza lista genérica
    renderList: (containerId, items, rendererFn, emptyMsg = 'Nenhum item encontrado.') => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (!items || items.length === 0) {
            container.innerHTML = `<div class="text-muted" style="text-align:center; padding: 1rem;">${emptyMsg}</div>`;
            return;
        }

        items.forEach(item => {
            container.appendChild(rendererFn(item));
        });
    },

    // Mostra/Oculta banner offline
    toggleOfflineBanner: (isOffline) => {
        const banner = document.getElementById('offline-banner');
        if (isOffline) banner.classList.remove('hidden');
        else banner.classList.add('hidden');
    }
};