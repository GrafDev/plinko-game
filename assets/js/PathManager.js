import { config } from './config.js';
import PathPointsGenerator from './PathPointsGenerator.js';
import SimplePathGenerator from './SimplePathGenerator.js';

class PathManager {
    constructor(gameInstance, pyramidManager, binsManager) {
        this.game = gameInstance;
        this.pyramidManager = pyramidManager;
        this.binsManager = binsManager;

        this.startPoints = [];
        this.pathPoints = [];
        this.endPoints = [];

        this.pathPointOffsetY = config.pathPointOffsetY || 6;

        this.generatePathPoints();
    }

    generatePathPoints() {
        this.startPoints = PathPointsGenerator.generateStartPoints(this.pyramidManager);
        this.pathPoints = PathPointsGenerator.generatePathPointsFromPegs(this.pyramidManager, this.pathPointOffsetY);
        this.endPoints = PathPointsGenerator.generateEndPoints(this.pyramidManager);

        console.log('Сгенерированы точки путей:');
        console.log(`- Стартовых точек: ${this.startPoints.length}`);
        console.log(`- Рядов точек пути: ${this.pathPoints.length}`);
        console.log(`- Конечных точек (лунок): ${this.endPoints.length}`);
    }

    // Обновленный метод addBouncePointsToPath в PathManager.js
    addBouncePointsToPath(path) {
        if (!path || path.length < 3) {
            return path;
        }

        const enhancedPath = [];
        enhancedPath.push(path[0]);

        // Используем шанс подскока из конфига
        const bounceChance = config.extraBounceChance || 0.3;

        for (let i = 1; i < path.length - 1; i++) {
            const prevPoint = path[i - 1];
            const currentPoint = path[i];
            const nextPoint = path[i + 1];

            const isSpecialPoint = currentPoint.number && (
                currentPoint.number.startsWith('S') ||
                currentPoint.number.startsWith('E')
            );

            const isTooCloseToEnds = i <= 1 || i >= path.length - 2;

            // Определяем изменение направления по разнице координат X
            const isDirectionChange =
                (prevPoint.x !== undefined && nextPoint.x !== undefined) &&
                (Math.sign(nextPoint.x - currentPoint.x) !== Math.sign(currentPoint.x - prevPoint.x)) &&
                (Math.abs(nextPoint.x - currentPoint.x) > 1); // Проверяем, что изменение X существенное

            // Подскок происходит с заданной вероятностью при изменении направления
            const shouldBounce = !isSpecialPoint && !isTooCloseToEnds &&
                (isDirectionChange ? Math.random() < bounceChance : false);

            enhancedPath.push(Object.assign({}, currentPoint));

            if (shouldBounce) {
                // Добавляем дополнительную информацию для точки возврата (дополнительного подскока)
                const returnPoint = {
                    x: currentPoint.x,
                    y: currentPoint.y,
                    pegLabel: currentPoint.pegLabel,
                    number: currentPoint.number ? `${currentPoint.number}-return` : 'return',
                    type: currentPoint.type,
                    isReturnPoint: true,
                    // Добавляем информацию о множителях подскока
                    extraBounceInfo: {
                        extraMultiplier: config.extraBounceHeightMultiplier,
                        minFactor: config.extraBounceRandomFactorMin,
                        maxFactor: config.extraBounceRandomFactorMax
                    }
                };

                enhancedPath.push(returnPoint);
                // console.log(`Добавлена точка дополнительного подскока после ${currentPoint.number}`);
            }
        }

        enhancedPath.push(Object.assign({}, path[path.length - 1]));

        return enhancedPath;
    }

    generatePath(targetBinIndex = null) {
        const pathId = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
        console.log(`[Путь ${pathId}] Начало генерации пути`);

        if (this.startPoints.length === 0 || this.pathPoints.length === 0 || this.endPoints.length === 0) {
            console.error(`[Путь ${pathId}] Невозможно создать путь: нет необходимых точек`);
            return [];
        }

        if (targetBinIndex !== null && (targetBinIndex < 0 || targetBinIndex >= this.endPoints.length)) {
            console.warn(`[Путь ${pathId}] Указан недопустимый индекс лунки ${targetBinIndex}, выбираем случайную лунку`);
            targetBinIndex = null;
        }

        let path = [];
        if (targetBinIndex !== null) {
            const endPoint = this.endPoints[targetBinIndex];
            console.log(`[Путь ${pathId}] Генерация пути к целевой лунке ${targetBinIndex}: x=${endPoint.x}, y=${endPoint.y}, номер=${endPoint.number}`);

            let startPointIndex;
            const totalBins = this.endPoints.length;

            if (targetBinIndex === 0) {
                startPointIndex = 0;
                console.log(`[Путь ${pathId}] Для лунки E1 используем стартовую точку S1`);
            } else if (targetBinIndex === totalBins - 1) {
                startPointIndex = 1;
                console.log(`[Путь ${pathId}] Для последней лунки E${totalBins} используем стартовую точку S2`);
            } else {
                startPointIndex = Math.floor(Math.random() * this.startPoints.length);
                console.log(`[Путь ${pathId}] Выбрана случайная стартовая точка с индексом ${startPointIndex}`);
            }

            const startPoint = this.startPoints[startPointIndex];
            console.log(`[Путь ${pathId}] Выбрана стартовая точка: x=${startPoint.x}, y=${startPoint.y}, номер=${startPoint.number}`);

            path = SimplePathGenerator.generatePath(
                startPoint,
                endPoint,
                this.pathPoints,
                this.endPoints.length
            );
        } else {
            const randomStartIndex = Math.floor(Math.random() * this.startPoints.length);
            const startPoint = this.startPoints[randomStartIndex];
            console.log(`[Путь ${pathId}] Для случайного пути выбрана стартовая точка: ${startPoint.number}`);

            path = SimplePathGenerator.generateRandomPath(startPoint, this.pathPoints, this.endPoints);
        }

        if (!path || path.length === 0) {
            console.error(`[Путь ${pathId}] Сгенерирован пустой путь!`);
            return [];
        }

        path = this.addBouncePointsToPath(path);

        console.log(`[Путь ${pathId}] Создан путь из ${path.length} точек`);
        const pathNumbers = path.map(p => p.number || '?').join(' -> ');
        console.log(`[Путь ${pathId}] Последовательность точек: ${pathNumbers}`);

        return path;
    }

    updateDimensions() {
        this.generatePathPoints();
    }

    cleanup() {
        this.startPoints = [];
        this.pathPoints = [];
        this.endPoints = [];
    }
}

export default PathManager;
