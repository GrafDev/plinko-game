// WinModalManager.js - модуль для управления модальным окном выигрыша

class WinModalManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.initialized = false;
    }

    // Инициализация менеджера модального окна
    initialize() {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        // Добавляем обработчик для кнопки "TRY AGAIN"
        const claimButton = document.getElementById('claim-bonus-btn');
        if (claimButton) {
            this.clickHandler = () => {
                this.hideWinModal();
                this.restartGame();
            };
            claimButton.addEventListener('click', this.clickHandler);
        }

        console.log('WinModalManager инициализирован');
    }

    // Метод для отображения модального окна с выигрышем
    showWinModal(winsAmount) {
        if (!this.initialized) {
            this.initialize();
        }

        const modal = document.getElementById('win-modal');
        if (!modal) {
            console.error('Модальное окно не найдено в DOM');
            return;
        }

        // Установка текста выигрыша
        const winAmount = Number(winsAmount) || 0;
        const formattedWins = winAmount.toFixed(0);

        const winAmountElement = document.getElementById('win-amount');
        if (winAmountElement) {
            winAmountElement.textContent = `1000€`;
        }

        // Добавляем класс для анимации появления
        modal.classList.add('show');
        modal.classList.remove('hide');

        console.log(`✅ Показано модальное окно выигрыша: ${formattedWins}$ + 150FS`);
    }


    // Метод для скрытия модального окна
    hideWinModal() {
        const modal = document.getElementById('win-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hide');

            // Ждём завершения анимации, затем скрываем display
            setTimeout(() => {
                modal.classList.remove('hide');
                modal.style.display = 'none';
            }, 300); // должно совпадать с таймингом анимации в CSS
        }
    }

    // Метод для перезапуска игры
    restartGame() {
        // Простая перезагрузка страницы
        window.location.reload();
    }

    // Очистка ресурсов
    cleanup() {
        // Сохраняем ссылку на обработчик для корректного удаления
        const claimButton = document.getElementById('claim-bonus-btn');
        if (claimButton && this.clickHandler) {
            claimButton.removeEventListener('click', this.clickHandler);
        }

        this.initialized = false;
        this.clickHandler = null;
    }
}

export default WinModalManager;
