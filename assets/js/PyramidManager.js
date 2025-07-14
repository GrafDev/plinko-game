import Matter from 'matter-js';
import {baseConfig, config} from './config.js';

const { Bodies, World, Events } = Matter;

/**
 * Класс для управления пирамидой гвоздиков в игре Plinko
 */
class PyramidManager {
    /**
     * Конструктор класса PyramidManager
     * @param {Object} gameInstance - Экземпляр основного класса игры
     * @param {Object} engineWorld - Мир физического движка Matter.js
     */
    constructor(gameInstance, engineWorld) {
        this.game = gameInstance;
        this.world = engineWorld;
        this.dropArea = { left: 0, right: 0 };
        this.pegs = [];
        this.topRowY = 0;
        this.topRowPegs = []; // Сохраняем гвоздики верхнего ряда

        // Добавляем коллекцию для хранения состояния анимации гвоздиков
        this.pegAnimations = {};

        // Коллекция для хранения ореолов гвоздиков
        this.auras = {};
    }

    /**
     * Инициализирует обработчики событий
     */
    initialize() {
        console.log('PyramidManager: инициализирован');
    }

    /**
     * Анимирует вспышку гвоздика, создавая ореол и меняя цвет самого гвоздика
     * @param {string} pegLabel - Метка гвоздика
     */
    animatePegFlash(pegLabel) {
        const pegInfo = this.pegAnimations[pegLabel];

        // Проверяем что у нас есть информация о гвоздике и что он не анимируется сейчас
        if (!pegInfo || pegInfo.isAnimating) return;

        // Находим гвоздик по метке
        const peg = this.pegs.find(p => p.label === pegLabel);
        if (!peg) return;

        // Помечаем гвоздик как анимирующийся
        pegInfo.isAnimating = true;

        // Сохраняем оригинальный цвет
        const originalColor = pegInfo.originalColor;

        // Яркий цвет для вспышки
        const flashColor = '#FFFFFF';

        // Меняем цвет гвоздика на яркий белый
        peg.render.fillStyle = flashColor;

        // Проверяем, существует ли уже ореол для этого гвоздика
        if (this.auras[pegLabel]) {
            // Если ореол существует, удаляем его
            World.remove(this.world, this.auras[pegLabel]);
            this.auras[pegLabel] = null;
        }

        // Создаем один ореол
        const aura = this.createAura(peg.position.x, peg.position.y, pegLabel);
        World.add(this.world, aura);
        this.auras[pegLabel] = aura;

        // Первая фаза - яркая вспышка
        setTimeout(() => {
            // Возвращаем исходный цвет гвоздика
            peg.render.fillStyle = originalColor;

            // Удаляем ореол через время, указанное в конфигурации
            setTimeout(() => {
                if (this.auras[pegLabel]) {
                    World.remove(this.world, this.auras[pegLabel]);
                    this.auras[pegLabel] = null;
                }

                // Снимаем флаг анимации
                pegInfo.isAnimating = false;
            }, config.pegAura.duration);
        }, 100);
    }

    /**
     * Создает пирамиду гвоздиков
     * @returns {Object} Объект с информацией о созданной пирамиде
     */
    createPyramid() {
        console.log(`Создание пирамиды: rows=${config.rows}, pegRadius=${config.pegRadius}, ballRadius=${config.ballRadius}`);
        // Очищаем старые данные
        this.pegs = [];
        this.topRowPegs = [];
        this.pegAnimations = {};
        this.auras = {};
        this.clearPegs();

        // Определяем доступное пространство для пирамиды
        const gameWidth = this.game.width;
        const gameHeight = this.game.height;
        
        console.log(`🎮 Размеры игры в PyramidManager: ${gameWidth}x${gameHeight}`);

        // Определяем размеры пирамиды
        const pyramidBaseWidth = gameWidth - config.pegRadius*2.2;
        const lastRowPegCount = config.topPegs + config.rows - 1;
        const baseHorizontalSpacing = pyramidBaseWidth / (lastRowPegCount - 1);
        
        // Вычисляем реальную ширину пирамиды
        const actualPyramidWidth = baseHorizontalSpacing * (lastRowPegCount - 1);
        
        console.log(`📊 pyramidBaseWidth=${pyramidBaseWidth}, lastRowPegCount=${lastRowPegCount}, baseHorizontalSpacing=${baseHorizontalSpacing}`);
        console.log(`📏 Ширина канваса: ${gameWidth}px`);
        console.log(`📏 Расчетная ширина пирамиды: ${actualPyramidWidth}px`);
        console.log(`📏 Ширина контейнера: ${this.game.container.offsetWidth}px`);
        
        // Добавляем отладочные прямоугольники
        // this.addDebugRectangles(gameWidth, gameHeight, actualPyramidWidth);

        // Отступ сверху для стартовых точек
        const topOffset = config.ballRadius * 4;

        // Отступ снизу для шариков (диаметр шарика)
        const bottomOffset = config.ballRadius * 2;

        // Доступная высота для пирамиды
        const availablePyramidHeight = gameHeight - topOffset - bottomOffset;

        // Рассчитываем вертикальное расстояние между рядами, чтобы пирамида занимала все доступное пространство
        const verticalSpacing = availablePyramidHeight / (config.rows - 1);

        // Обновляем config.verticalSpacing для использования в других частях кода
        config.verticalSpacing = verticalSpacing;

        // Теперь рассчитываем Y-координату верхнего ряда
        const topRowY = topOffset;

        // Y-координата нижнего ряда с учетом отступа от низа канваса
        const bottomRowY = gameHeight - bottomOffset - config.pegRadius;

        // Сохраняем Y-координату верхнего ряда гвоздиков
        this.topRowY = topRowY;

        // Переменные для хранения позиций крайних гвоздиков
        let leftmostPegX = 0;
        let rightmostPegX = 0;

        // Создаем гвоздики в пирамидальной структуре
        for (let row = 0; row < config.rows; row++) {
            // Количество гвоздиков в текущем ряду
            const pegsInRow = config.topPegs + row;

            // Ширина текущего ряда (расстояние между крайними гвоздиками ряда)
            const rowWidth = baseHorizontalSpacing * (pegsInRow - 1);

            // Начальная позиция X для текущего ряда
            const startX = (gameWidth - rowWidth) / 2;

            // Вычисляем Y-позицию для текущего ряда, интерполируя между верхним и нижним рядом
            const progress = row / (config.rows - 1);
            const y = topRowY + progress * (bottomRowY - topRowY);

            for (let col = 0; col < pegsInRow; col++) {
                const x = startX + baseHorizontalSpacing * col;

                // Создаем уникальную метку для каждого гвоздика
                const pegLabel = `peg_${row}_${col}`;

                const peg = this.createPeg(x, y, pegLabel);
                this.pegs.push(peg);
                World.add(this.world, peg);

                // Сохраняем оригинальный цвет гвоздика для анимации
                this.pegAnimations[pegLabel] = {
                    originalColor: config.colors.peg,
                    isAnimating: false
                };

                // Сохраняем позиции крайних гвоздиков верхнего ряда
                if (row === 0) {
                    if (col === 0) {
                        leftmostPegX = x;
                    }
                    if (col === pegsInRow - 1) {
                        rightmostPegX = x;
                    }

                    // Сохраняем гвоздики верхнего ряда
                    this.topRowPegs.push(peg);
                }
            }
        }

        // Сохраняем диапазон для падения шаров
        this.dropArea = {
            left: leftmostPegX,
            right: rightmostPegX
        };

        console.log(`Пирамида создана: верхний ряд на Y=${this.topRowY}, нижний ряд на Y=${bottomRowY}, verticalSpacing=${verticalSpacing}`);
        console.log(`Отступ снизу: ${bottomOffset}px, полная высота игры: ${gameHeight}px`);

        return {
            topRowY: this.topRowY,
            dropArea: this.dropArea,
            pyramidHeight: bottomRowY - topRowY
        };
    }

    /**
     * Создает один гвоздик с заданными параметрами
     * @param {number} x - Координата X
     * @param {number} y - Координата Y
     * @param {string} label - Метка гвоздика
     * @returns {Object} Объект гвоздика Matter.js
     */
    createPeg(x, y, label = 'peg') {
        return Bodies.circle(x, y, config.pegRadius, {
            isStatic: true,
            render: {
                fillStyle: config.colors.peg
            },
            friction: config.pegFriction,          // Используем трение из конфига
            restitution: config.pegRestitution,    // Используем коэффициент отскока из конфига
            label: label,
            collisionFilter: {
                category: 0x0002, // Категория для гвоздиков
                mask: 0xFFFFFFFF  // Сталкиваются со всеми категориями
            }
        });
    }

    /**
     * Создает визуальный ореол вокруг гвоздика
     * @param {number} x - Координата X гвоздика
     * @param {number} y - Координата Y гвоздика
     * @param {string} label - Метка гвоздика
     * @returns {Object} Объект ореола Matter.js
     */
    createAura(x, y, label) {
        // Параметры ореола из конфигурации
        const auraParams = config.pegAura;

        // Радиус ореола на основе множителя из конфигурации
        const auraRadius = config.pegRadius * auraParams.radiusMultiplier;

        // Создаем белый полупрозрачный ореол
        const aura = Bodies.circle(x, y, auraRadius, {
            isStatic: true,
            isSensor: true, // Ореол не взаимодействует с другими объектами
            render: {
                fillStyle: `rgba(255, 255, 255, ${auraParams.opacity})`, // Используем прозрачность из конфига
                opacity: 1, // Общая прозрачность объекта
                lineWidth: 0 // Без границы
            },
            label: `aura_${label}`,
            collisionFilter: {
                category: 0x0002,
                mask: 0x0000 // Не сталкивается ни с чем
            }
        });

        return aura;
    }

    /**
     * Получает информацию о последнем ряде гвоздиков
     * @returns {Object} Объект с информацией о позициях гвоздиков в последнем ряде
     */
    getLastRowInfo() {
        // Получаем количество рядов из конфигурации
        const rows = config.rows;

        // Количество гвоздиков в последнем ряду
        const lastRowPegCount = config.topPegs + rows - 1;

        // Создаем массив для хранения позиций гвоздиков последнего ряда
        const lastRowPositions = [];

        // Находим гвоздики последнего ряда (они были созданы последними)
        const lastRowStartIndex = this.pegs.length - lastRowPegCount;

        for (let i = lastRowStartIndex; i < this.pegs.length; i++) {
            lastRowPositions.push(this.pegs[i].position.x);
        }

        return {
            pegCount: lastRowPegCount,
            positions: lastRowPositions,
            // Глубина последнего ряда
            depth: this.pegs[this.pegs.length - 1].position.y + config.pegRadius
        };
    }

    /**
     * Получает информацию о пирамиде, включая позиции гвоздиков верхнего ряда
     * @returns {Object} Объект с информацией о пирамиде
     */
    getPyramidInfo() {
        // Проверяем, что пирамида создана
        if (!this.pegs || this.pegs.length === 0) {
            return null;
        }

        // Собираем позиции гвоздиков верхнего ряда
        const topRow = [];

        // Используем сохраненные гвоздики верхнего ряда
        for (const peg of this.topRowPegs) {
            if (peg && peg.position) {
                topRow.push(peg.position.x);
            }
        }

        return {
            topRow: topRow,
            topRowY: this.topRowY,
            dropArea: this.dropArea
        };
    }

    /**
     * Очищает все гвоздики и их ореолы из мира
     */
    clearPegs() {
        // Удаляем все ореолы
        for (const pegLabel in this.auras) {
            if (this.auras[pegLabel]) {
                World.remove(this.world, this.auras[pegLabel]);
            }
        }
        this.auras = {};

        // Удаляем все гвоздики
        for (const peg of this.pegs) {
            World.remove(this.world, peg);
        }
        this.pegs = [];
        this.topRowPegs = [];
        this.pegAnimations = {};
    }

    /**
     * Обновляет настройки пирамиды при изменении размеров игры
     * @param {number} width - Новая ширина игрового поля
     * @param {number} height - Новая высота игрового поля
     */
    updateDimensions(width, height) {
        // Пересоздаем пирамиду с новыми размерами
        return this.createPyramid();
    }

    /**
     * Получает информацию о дропзоне и верхнем ряде гвоздиков
     * @returns {Object} Объект с информацией о дропзоне
     */
    getDropInfo() {
        return {
            dropArea: this.dropArea,
            topRowY: this.topRowY
        };
    }

    /**
     * Добавляет отладочные прямоугольники для визуализации границ
     */
    addDebugRectangles(gameWidth, gameHeight, pyramidWidth) {
        // Удаляем старые отладочные элементы
        this.removeDebugRectangles();
        
        // Прямоугольник границ канваса (красный)
        const canvasBorder = Bodies.rectangle(gameWidth/2, gameHeight/2, gameWidth, gameHeight, {
            isStatic: true,
            isSensor: true,
            render: {
                fillStyle: 'transparent',
                strokeStyle: '#ff0000',
                lineWidth: 3
            },
            label: 'debug_canvas_border'
        });
        
        // Линия центра канваса (зеленая)
        const centerLine = Bodies.rectangle(gameWidth/2, gameHeight/2, 2, gameHeight, {
            isStatic: true,
            isSensor: true,
            render: {
                fillStyle: '#00ff00',
                strokeStyle: '#00ff00',
                lineWidth: 2
            },
            label: 'debug_center_line'
        });
        
        // Прямоугольник пирамиды (синий)
        const pyramidCenter = config.pegRadius + pyramidWidth/2;
        const pyramidBorder = Bodies.rectangle(pyramidCenter, gameHeight/2, pyramidWidth, gameHeight, {
            isStatic: true,
            isSensor: true,
            render: {
                fillStyle: 'transparent',
                strokeStyle: '#0000ff',
                lineWidth: 3
            },
            label: 'debug_pyramid_border'
        });
        
        World.add(this.world, [canvasBorder, centerLine, pyramidBorder]);
        
        // Сохраняем ссылки для удаления
        this.debugElements = [canvasBorder, centerLine, pyramidBorder];
    }
    
    /**
     * Удаляет отладочные прямоугольники
     */
    removeDebugRectangles() {
        if (this.debugElements) {
            for (const element of this.debugElements) {
                World.remove(this.world, element);
            }
            this.debugElements = [];
        }
    }

    /**
     * Очищает ресурсы класса при уничтожении
     */
    cleanup() {
        // Удаляем все ореолы
        for (const pegLabel in this.auras) {
            if (this.auras[pegLabel]) {
                World.remove(this.world, this.auras[pegLabel]);
            }
        }
        this.auras = {};

        // Удаляем отладочные элементы
        this.removeDebugRectangles();

        // Очищаем гвоздики
        this.clearPegs();
    }
}

export default PyramidManager;
