export class ToastService {

    showErrorToast(message: string, durationMills: number = 3000) {
        return this.showToast(message, "error", durationMills);
    }

    showInfoToast(message: string, durationMills: number = 3000) {
        return this.showToast(message, "info", durationMills);
    }

    private showToast(message: string, type: string = "info", durationMills: number = 3000, closeOnClick: boolean = true): HTMLDivElement {
        const container: HTMLElement = document.getElementById("toast_container")!;

        const divToast: HTMLDivElement = document.createElement("div");
        divToast.className = `toast ${type === 'error' ? 'error' : ''}`;
        divToast.textContent = message;
        container.appendChild(divToast);

        const hideTimeout: number = setTimeout(
            () => {
                this.hideToast(divToast);
            },
            durationMills
        );

        if (closeOnClick) {
            divToast.addEventListener("click", () => {
                clearTimeout(hideTimeout);
                this.hideToast(divToast);
            });
        }
        return divToast;
    }

    private hideToast(divToast: HTMLDivElement): void {
        if (divToast.classList.contains("hiding")) {
            return;
        }

        divToast.classList.add('hiding');
        divToast.addEventListener("animationend", () => {
            if (divToast.parentNode) {
                divToast.parentNode.removeChild(divToast);
            }
        }, {once: true});
    }
}
