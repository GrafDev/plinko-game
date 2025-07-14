import Matter from 'matter-js';
import { config } from './config.js';

/**
 * Класс для визуализации точек пути в игре Plinko
 */
class PathRenderer {
    /**
     * Конструктор класса PathRenderer
     * @param {Object} gameInstance - Экземпляр основного класса игры
     * @param {Object} engineWorld - Мир физического движка Matter.js
     * @param {Object} pathManager - Менеджер путей движения шариков
     */
    constructor(gameInstance, engineWorld, pathManager) {
        this.game = gameInstance;
        this.world = engineWorld;
        this.pathManager = pathManager;
        this.visible = false;
        this.pointLabels = [];

        // Параметры отображения точек пути
        this.showPathNumbers = config.showPathNumbers || false; // Параметр из конфига
    }

    /**
     * Инициализирует рендерер путей
     */
    initialize() {
        // Проверяем, нужно ли показывать номера точек
        if (this.showPathNumbers) {
            this.showPathPoints();
        }
    }

    /**
     * Показывает все точки путей на экране
     */
    showPathPoints() {
        if (this.visible) return;
        this.visible = true;

        console.log("Отображение номеров точек пути...");

        // Отображаем стартовые точки
        for (const point of this.pathManager.startPoints) {
            this.addPointLabel(point);
        }

        // Отображаем все точки пути (по рядам)
        for (const row of this.pathManager.pathPoints) {
            for (const point of row) {
                this.addPointLabel(point);
            }
        }

        // Отображаем конечные точки
        for (const point of this.pathManager.endPoints) {
            this.addPointLabel(point);
        }

        console.log(`Отображено ${this.pointLabels.length} точек пути`);
    }

    /**
     * Скрывает все точки путей
     */
    hidePathPoints() {
        if (!this.visible) return;
        this.visible = false;

        // Удаляем все метки
        for (const label of this.pointLabels) {
            if (label && label.parentNode) {
                label.parentNode.removeChild(label);
            }
        }

        this.pointLabels = [];
        console.log("Скрыты номера точек пути");
    }

    /**
     * Добавляет метку с номером для точки пути
     * @param {Object} point - Точка пути
     */
    addPointLabel(point) {
        // Получаем положение canvas в DOM для правильного позиционирования
        const canvas = this.game.render.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = this.game.container.getBoundingClientRect();

        // Расчет масштаба для корректного позиционирования
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        // Позиция относительно контейнера
        const offsetX = (canvasRect.left - containerRect.left);
        const offsetY = (canvasRect.top - containerRect.top);

        // Создаем элемент div для номера
        const labelElement = document.createElement('div');
        // Отображаем номер точки
        labelElement.textContent = point.number || '';

        // Определяем классы на основе типа точки
        let className = 'path-point-label';
        if (point.number && point.number.startsWith('S')) {
            className += ' path-point-label--start';
        } else if (point.number && point.number.startsWith('E')) {
            className += ' path-point-label--end';
        } else if (point.number && point.number.startsWith('4-')) {
            className += ' path-point-label--row4';
        }
        labelElement.className = className;

        // Задаем только позиционирование
        labelElement.style.left = `${offsetX + (point.x / scaleX)}px`;
        labelElement.style.top = `${offsetY + (point.y / scaleY)}px`;

        // Добавляем элемент к контейнеру игры
        this.game.container.appendChild(labelElement);

        // Сохраняем ссылку на элемент
        this.pointLabels.push(labelElement);
    }

    /**
     * Обновляет позиции меток при изменении размеров окна
     */
    updateLabelsPositions() {
        if (!this.visible) return;

        // Удаляем все старые метки
        this.hidePathPoints();

        // Создаем новые метки
        this.showPathPoints();
    }

    /**
     * Переключает видимость точек пути
     */
    togglePathPoints() {
        if (this.visible) {
            this.hidePathPoints();
        } else {
            this.showPathPoints();
        }
    }

    /**
     * Обновляет настройки отображения
     * @param {boolean} showNumbers - Показывать ли номера точек
     */
    updateSettings(showNumbers) {
        this.showPathNumbers = showNumbers;

        if (this.showPathNumbers !== this.visible) {
            this.togglePathPoints();
        }
    }

    /**
     * Обновляет рендерер при изменении размеров игры
     */
    updateDimensions() {
        this.updateLabelsPositions();
    }

    /**
     * Очищает ресурсы класса при уничтожении
     */
    cleanup() {
        this.hidePathPoints();
    }
}

export default PathRenderer;
