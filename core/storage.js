const PREFIX = 'barber_saas_';

export const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(PREFIX + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage Get Error', e);
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage Set Error', e);
        }
    },
    remove: (key) => {
        localStorage.removeItem(PREFIX + key);
    }
};