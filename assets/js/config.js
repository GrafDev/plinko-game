// Обновленная базовая конфигурация с добавлением параметров для траектории отскоков

// Базовая конфигурация игры
const baseConfig = {
    containerWidth: 800,  // Ширина контейнера по умолчанию
    containerHeight: 800, // Высота контейнера по умолчанию
    aspectRatio: 0.5,     // Соотношение сторон контейнера (width/height)
    rows: 16,             // Количество рядов гвоздиков
    topPegs: 3,           // Количество гвоздиков в верхнем ряду
    pegRadius: 5,        // Базовый радиус гвоздиков для расчетов
    ballRadius: 7,       // Базовый радиус шариков для расчетов
    wallThicknessRatio: 0.025, // Толщина стенок как доля от ширины контейнера
    binDistanceFromLastRow: 5, // Расстояние от последнего ряда до корзин
    binHeight: 30,        // Высота корзин
    topPaddingRatio: 0.1, // Отступ сверху (как доля от высоты контейнера)

    // Параметр для регулировки высоты отскока (множитель для диаметра шарика)
    bounceFactor: 3, // По умолчанию отскок в 3 раза больше диаметра шарика

    // Параметры отскока
    pegRestitution: 0.5,   // Коэффициент отскока гвоздиков

    // Добавляем в baseConfig
    showDebugInput: true, // Показывать ли отладочный инпут для задания целевых лунок

    // Параметры трения (friction)
    pegFriction: 0,        // Коэффициент трения гвоздиков
    blockFriction: 0.1,    // Коэффициент трения блоков

    // Параметры шариков
    defaultBallCount: 1,   // Количество шариков по умолчанию
    maxBallCount: 5,      // Максимальное количество шариков
    ballDropDelay: 100,     // Задержка между запуском шариков (мс)

// Параметры траектории шариков
    bounceHeightRatio: 0.7,     // Высота отскока как доля от verticalSpacing
    extraBounceChance: 0.2,            // Шанс дополнительного подскока
    extraBounceHeightMultiplier: 0.7,  // Множитель высоты дополнительного подскока
    extraBounceFactor: 0.7,              // Максимальный случайный множитель высоты подскока
    extraBounceSpeed: 0.03,     // Скорость анимации дополнительного отскока
    extraBounceWaitTime: 100,   // Время ожидания после дополнительного отскока (мс)

    // Параметры системы путей
    pathPointOffsetY: 6,   // Расстояние от гвоздика вверх для точек пути
    ballMovementSpeed: 2,   // Скорость движения шариков по пути

    // Цвета элементов игры
    colors: {
        peg: '#a7a6a6',    // Цвет гвоздика (светло-серый)
        wall: '#444444',   // Цвет стен
        floor: '#444444',  // Цвет пола
        ball: '#87CEEB',    // Цвет шарика (холодный ледовый голубой)
        ballOutline: '#4682B4'  // Контур шарика (стальной синий)
    },

    pegAura: {
        radiusMultiplier: 2.5,  // Увеличенный размер ореола в 3 раза от предыдущего значения 2.5
        color: '#FFFFFF',       // Цвет ореола (белый)
        opacity: 0.2,           // Прозрачность ореола
        duration: 100           // Длительность отображения ореола
    },

    // ------------------------------------------------------
    // Динамически изменяемые параметры в процессе работы игры
    // ------------------------------------------------------

    // Параметры для ставок и баланса
    initialBalance: 10000,      // Начальный баланс пользователя пока только для логики, тчобы потом если что применить в другом проекте.


    // Значения по умолчанию, которые будут пересчитаны
    verticalSpacing: 60,  // Динамически пересчитывается в calculateVerticalSpacing()
    wallThickness: 10,    // Динамически пересчитывается в updateConfigBasedOnSize()

    // Массив индексов целевых лунок, может изменяться через window.setTargetBins
    targetBins: [],
    planTargetsBins: [],
    targetWins:1000,
    maxBalls: 10,
    costedBins: [0,1,2,5,20,50,100,500,1000],
    // Динамически вычисляется как количество промежутков между гвоздиками последнего ряда
    binCount: 0
};

// Создаем экземпляр конфигурации для использования в игре
const config = { ...baseConfig };

// Функция для пересчета размеров на основе количества рядов
function updateSizesBasedOnRows() {
    // Получаем размеры экрана для расчета адаптивных коэффициентов
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const minScreenSize = Math.min(screenWidth, screenHeight);

    // Рассчитываем адаптивные коэффициенты с ограничениями для предотвращения экстремальных значений
    const adaptivePegCoefficient = Math.max(0.7, Math.min(2.0, minScreenSize / 700));
    const adaptiveBallCoefficient = Math.max(0.7, Math.min(2.0, minScreenSize / 700));
    const adaptivSpeedCoefficient = Math.max(0.7, Math.min(2.0, minScreenSize / 700));

    console.log(`Адаптивные коэффициенты: peg=${adaptivePegCoefficient.toFixed(2)}, ball=${adaptiveBallCoefficient.toFixed(2)}, для экрана ${screenWidth}x${screenHeight}`);

    // Используем динамические коэффициенты вместо фиксированных
    const sizeTable = {
        9:  [7.0 * adaptivePegCoefficient, 9.5 * adaptiveBallCoefficient, 2.0 * adaptivSpeedCoefficient],
        10: [6.5 * adaptivePegCoefficient, 9.0 * adaptiveBallCoefficient, 1.8 * adaptivSpeedCoefficient],
        11: [6.0 * adaptivePegCoefficient, 8.5 * adaptiveBallCoefficient, 1.6 * adaptivSpeedCoefficient],
        12: [5.5 * adaptivePegCoefficient, 8.0 * adaptiveBallCoefficient, 1.4 * adaptivSpeedCoefficient],
        13: [5.2 * adaptivePegCoefficient, 7.5 * adaptiveBallCoefficient, 1.3 * adaptivSpeedCoefficient],
        14: [5.0 * adaptivePegCoefficient, 7.2 * adaptiveBallCoefficient, 1.2 * adaptivSpeedCoefficient],
        15: [4.8 * adaptivePegCoefficient, 7.0 * adaptiveBallCoefficient, 1.1 * adaptivSpeedCoefficient],
        16: [4.5 * adaptivePegCoefficient, 6.5 * adaptiveBallCoefficient, 1.0 * adaptivSpeedCoefficient]
    };

    // Если у нас есть прямое соответствие в таблице, используем его
    if (sizeTable[config.rows]) {
        const [pegRadius, ballRadius, speedMultiplier] = sizeTable[config.rows];
        config.pegRadius = pegRadius;
        config.ballRadius = ballRadius;
        config.ballMovementSpeed = baseConfig.ballMovementSpeed * speedMultiplier;
    }
    // Если нет прямого соответствия, интерполируем между ближайшими значениями
    else {
        const minRows = 9;
        const maxRows = 16;
        const rows = Math.max(minRows, Math.min(maxRows, config.rows));

        // Находим ближайшие значения в таблице
        const lowerRow = Math.floor(rows);
        const upperRow = Math.ceil(rows);

        if (lowerRow === upperRow) {
            // Если у нас целое число рядов, используем соответствующее значение из таблицы
            const [pegRadius, ballRadius, speedMultiplier] = sizeTable[rows];
            config.pegRadius = pegRadius;
            config.ballRadius = ballRadius;
            config.ballMovementSpeed = baseConfig.ballMovementSpeed * speedMultiplier;
        } else {
            // Интерполируем между ближайшими значениями
            const lowerValues = sizeTable[lowerRow];
            const upperValues = sizeTable[upperRow];
            const fraction = rows - lowerRow;

            config.pegRadius = lowerValues[0] + (upperValues[0] - lowerValues[0]) * fraction;
            config.ballRadius = lowerValues[1] + (upperValues[1] - lowerValues[1]) * fraction;
            config.ballMovementSpeed = baseConfig.ballMovementSpeed *
                (lowerValues[2] + (upperValues[2] - lowerValues[2]) * fraction);
        }

        // Округляем до одного десятичного знака для более стабильного отображения
        config.pegRadius = Math.round(config.pegRadius * 10) / 10;
        config.ballRadius = Math.round(config.ballRadius * 10) / 10;
        config.ballMovementSpeed = Math.round(config.ballMovementSpeed * 100) / 100;
    }

    console.log(`Обновлены размеры: rows=${config.rows}, pegRadius=${config.pegRadius}, ballRadius=${config.ballRadius}, ballSpeed=${config.ballMovementSpeed}`);
}

// Вызываем функцию при инициализации
updateSizesBasedOnRows();

// Функция для прямого обновления массива целевых лунок
window.setTargetBins = function(bins) {
    if (Array.isArray(bins)) {
        config.targetBins = [...bins];
        console.log('Массив целевых лунок обновлен:', config.targetBins);
        return true;
    }
    return false;
};

export { baseConfig, config, updateSizesBasedOnRows };

