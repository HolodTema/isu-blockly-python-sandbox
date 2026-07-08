
export class ToastService {

    showToast(message, type = "info", duration = 3000, closeOnClick = true) {
        const container = document.getElementById('toast_container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'error' : ''}`;
        toast.textContent = message;

        container.appendChild(toast);

        let hideTimeout = setTimeout(() => {
            this.hideToast(toast);
        }, duration);

        if (closeOnClick) {
            toast.addEventListener('click', () => {
                clearTimeout(hideTimeout);
                this.hideToast(toast);
            });
        }

        return toast;
    }


    hideToast(toast) {
        if (toast.classList.contains('hiding')) {
            return;
        }

        toast.classList.add('hiding');

        toast.addEventListener('animationend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, { once: true });
    }

    showErrorToast(message, duration = 3000) {
        return this.showToast(message, 'error', duration);
    }

    showInfoToast(message, duration = 3000) {
        return this.showToast(message, 'info', duration);
    }

}
