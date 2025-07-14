import PlinkoGame from './PlinkoGame.js';
import { updateSizesBasedOnRows } from './config.js';

// Функция для проверки готовности DOM
function domReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Функция инициализации игры
function initGame() {
    console.log('DOM готов, инициализируем игру');

    // Обновляем размеры при загрузке страницы
    updateSizesBasedOnRows();

    // Короткая задержка перед созданием игры
    setTimeout(() => {
        const game = new PlinkoGame('plinko-game');

        // Добавляем обработчик для скрытия элементов управления при клике вне них
        document.addEventListener('click', (event) => {
            const controls = document.querySelector('.controls-container');
            if (controls && !controls.contains(event.target)) {
                controls.style.opacity = '0.4';
                setTimeout(() => {
                    controls.style.opacity = '0.8';
                }, 2000); // Через 2 секунды возвращаем видимость
            }
        });

        // Добавляем адаптивное обновление при изменении размеров окна
        window.addEventListener('resize', () => {
            updateSizesBasedOnRows();
        });

        console.log('Игра создана и обработчики событий установлены');
    }, 100);
}

// Запускаем инициализацию когда DOM готов
domReady(initGame);
