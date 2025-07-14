/**
 * Упрощенный генератор пути для шариков в игре Plinko
 * Генерирует более случайные пути с гарантией попадания в целевую лунку
 */
export default class SimplePathGenerator {
    /**
     * Генерирует путь к указанной лунке
     * @param {Object} startPoint - Начальная точка пути
     * @param {Object} targetBin - Целевая лунка
     * @param {Array} pathPoints - Двумерный массив точек пути
     * @param {number} totalBins - Общее количество лунок
     * @returns {Array} - Сгенерированный путь
     */
    static generatePath(startPoint, targetBin, pathPoints, totalBins) {
        // Создаем массив для хранения пути
        const path = [];

        // Добавляем стартовую точку
        path.push({...startPoint, type: 'start'});
        console.log(`Генерация пути: стартовая точка ${startPoint.number}`);

        // Получаем индекс целевой лунки (начиная с 0)
        const binIndex = targetBin.binIndex !== undefined
            ? targetBin.binIndex
            : parseInt(targetBin.number.substring(1)) - 1;

        // Обрабатываем особые случаи для крайних лунок
        // Для лунки E1 используем только левую стартовую точку (S1)
        if (binIndex === 0 && startPoint.number !== 'S1') {
            console.log('Для лунки E1 требуется стартовая точка S1');
            return [];
        }

        // Для последней лунки используем только правую стартовую точку (S2)
        if (binIndex === totalBins - 1 && startPoint.number !== 'S2') {
            console.log(`Для последней лунки E${totalBins} требуется стартовая точка S2`);
            return [];
        }

        // Определяем точку во втором ряду (зависит от стартовой точки)
        const secondRowIndex = 1;
        let secondRowColumnIndex;

        if (startPoint.number === 'S1') {
            secondRowColumnIndex = 1; // Для точки 2-2
        } else {
            secondRowColumnIndex = 2; // Для точки 2-3
        }

        // Добавляем точку во втором ряду
        const secondRowPoint = pathPoints[secondRowIndex][secondRowColumnIndex];
        path.push({...secondRowPoint, type: 'path'});
        // console.log(`Добавлена точка второго ряда ${secondRowPoint.number}`);

        // Текущий индекс столбца
        let currentColIndex = secondRowColumnIndex;

        // Для каждого следующего ряда (начиная с третьего, индекс 2)
        for (let rowIndex = secondRowIndex + 1; rowIndex < pathPoints.length; rowIndex++) {
            const row = pathPoints[rowIndex];

            // Для нулевой лунки всегда выбираем фиксированный путь через точки с индексом 1
            if (binIndex === 0) {
                // Для нулевой лунки всегда берем индекс 1, если он доступен
                currentColIndex = 1; // Выбираем индекс 1 (то есть точку с номером 2)
                if (currentColIndex >= row.length) {
                    // Если недоступен, берем минимальный доступный
                    currentColIndex = Math.min(row.length - 1, 1);
                }
                console.log(`Лунка 0: выбрана точка с индексом ${currentColIndex} (номер ${currentColIndex+1})`);
            }
            // Для последней лунки всегда выбираем крайний правый путь
            else if (binIndex === totalBins - 1) {
                // Для последней лунки выбираем максимальный индекс
                currentColIndex = Math.min(row.length - 1, currentColIndex + 1);
            }
            else {
                // Определяем возможные варианты движения
                const possibleIndices = [];

                // Движение вниз (тот же индекс)
                if (currentColIndex < row.length) {
                    possibleIndices.push(currentColIndex);
                }

                // Движение вниз-вправо (индекс + 1)
                if (currentColIndex + 1 < row.length) {
                    possibleIndices.push(currentColIndex + 1);
                }

                // Если нет доступных вариантов, используем последний возможный
                if (possibleIndices.length === 0) {
                    currentColIndex = Math.min(row.length - 1, currentColIndex);
                }
                // Если только один вариант, используем его
                else if (possibleIndices.length === 1) {
                    currentColIndex = possibleIndices[0];
                }
                // Если есть выбор, выбираем случайно с учетом ограничений
                else {
                    // Оставшиеся ряды до конца (до последней точки)
                    const remainingRows = pathPoints.length - rowIndex - 1;

                    // Случайно выбираем направление
                    const randomChoice = Math.random() < 0.5 ? 0 : 1;
                    const nextColIndex = possibleIndices[randomChoice];

                    // Проверяем ограничение для движения с учетом номера лунки (индекс + 1)
                    if (this.isValidMove(nextColIndex, rowIndex, remainingRows, binIndex, totalBins)) {
                        currentColIndex = nextColIndex;
                    } else {
                        // Если случайный выбор не валидный, берем альтернативный
                        const alternativeIndex = possibleIndices[1 - randomChoice];

                        // Проверяем, что альтернативное направление также валидно
                        if (this.isValidMove(alternativeIndex, rowIndex, remainingRows, binIndex, totalBins)) {
                            currentColIndex = alternativeIndex;
                        } else {
                            // Если оба направления невалидны, выбираем наиболее подходящее
                            // Выбираем направление, которое ближе к целевой лунке
                            const dist1 = Math.abs(possibleIndices[0] - binIndex);
                            const dist2 = Math.abs(possibleIndices[1] - binIndex);
                            currentColIndex = dist1 <= dist2 ? possibleIndices[0] : possibleIndices[1];
                        }
                    }
                }
            }

            // Добавляем выбранную точку в путь
            const selectedPoint = row[currentColIndex];
            const nextPoint = {...selectedPoint, type: 'path'};
            path.push(nextPoint);
            // console.log(`Добавлена точка ${nextPoint.number}`);
        }

        // Добавляем конечную точку (целевую лунку)
        path.push({...targetBin, type: 'end'});
        console.log(`Добавлена конечная точка ${targetBin.number}`);

        // Выводим информацию о сгенерированном пути
        const pathNumbers = path.map(p => p.number || '?').join(' -> ');
        console.log(`Сгенерирован путь: ${pathNumbers}`);

        return path;
    }

    /**
     * Проверяет, является ли движение к следующей точке валидным
     * для достижения целевой лунки
     * @param {number} colIndex - Индекс колонки точки
     * @param {number} rowIndex - Индекс ряда точки
     * @param {number} remainingRows - Оставшееся количество рядов до конца
     * @param {number} targetBinIndex - Индекс целевой лунки
     * @param {number} totalBins - Общее количество лунок
     * @returns {boolean} - true если движение валидно
     */
    static isValidMove(colIndex, rowIndex, remainingRows, targetBinIndex, totalBins) {
        // Для особых случаев (крайние лунки) всегда следуем прямому пути
        if (targetBinIndex === 0 || targetBinIndex === totalBins - 1) {
            return true;
        }

        // Учитываем, что индекс точки и номер лунки относятся к разным координатным системам
        // Для лунки с индексом 0 (первая лунка) колонка может быть только 0
        if (targetBinIndex === 0 && colIndex > 0) {
            return false;
        }

        // Максимальный индекс, который может достичь шарик от текущей позиции
        const maxReachableIndex = colIndex + remainingRows;

        // Проверка для лунки с номером (индекс + 1)
        // Индекс точки не должен быть больше чем номер лунки (индекс + 1)
        const targetBinNumber = targetBinIndex + 1; // преобразуем индекс в номер

        // Проверяем, что текущая позиция не слишком далеко вправо
        if (colIndex > targetBinNumber) {
            return false;
        }

        // Проверяем, что из текущей позиции можно достичь лунку
        // Учитывая оставшиеся ряды и возможность движения вправо
        if (colIndex + remainingRows < targetBinIndex) {
            return false;
        }

        return true;
    }

    /**
     * Создает случайный путь (без указания целевой лунки)
     * @param {Object} startPoint - Начальная точка пути
     * @param {Array} pathPoints - Двумерный массив точек пути
     * @param {Array} endPoints - Массив конечных точек (лунок)
     * @returns {Array} - Сгенерированный случайный путь
     */
    static generateRandomPath(startPoint, pathPoints, endPoints) {
        // Создаем массив для хранения пути
        const path = [];

        // Добавляем стартовую точку
        path.push({...startPoint, type: 'start'});
        console.log(`Случайный путь: стартовая точка ${startPoint.number}`);

        // Определяем точку во втором ряду (зависит от стартовой точки)
        const secondRowIndex = 1;
        let secondRowColumnIndex;

        if (startPoint.number === 'S1') {
            secondRowColumnIndex = 1; // Для точки 2-2
        } else {
            secondRowColumnIndex = 2; // Для точки 2-3
        }

        // Добавляем точку во втором ряду
        const secondRowPoint = pathPoints[secondRowIndex][secondRowColumnIndex];
        path.push({...secondRowPoint, type: 'path'});
        // console.log(`Добавлена точка второго ряда ${secondRowPoint.number}`);

        // Текущий индекс столбца
        let currentColIndex = secondRowColumnIndex;

        // Для каждого ряда кроме последнего
        for (let rowIndex = secondRowIndex + 1; rowIndex < pathPoints.length - 1; rowIndex++) {
            const row = pathPoints[rowIndex];

            // Определяем возможные варианты движения
            const possibleIndices = [];

            // Движение вниз (тот же индекс)
            if (currentColIndex < row.length) {
                possibleIndices.push(currentColIndex);
            }

            // Движение вниз-вправо (индекс + 1)
            if (currentColIndex + 1 < row.length) {
                possibleIndices.push(currentColIndex + 1);
            }

            // Если нет доступных вариантов, используем последний возможный
            if (possibleIndices.length === 0) {
                currentColIndex = Math.min(row.length - 1, currentColIndex);
            }
            // Если только один вариант, используем его
            else if (possibleIndices.length === 1) {
                currentColIndex = possibleIndices[0];
            }
            // Если есть выбор, выбираем случайно
            else {
                currentColIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];
            }

            // Добавляем выбранную точку в путь
            const selectedPoint = row[currentColIndex];
            const nextPoint = {...selectedPoint, type: 'path'};
            path.push(nextPoint);
            // console.log(`Добавлена точка ${nextPoint.number}`);
        }

        // Обработка последнего ряда с проверкой попадания в лунку
        const lastRowIndex = pathPoints.length - 1;
        if (lastRowIndex >= 0) {
            const lastRow = pathPoints[lastRowIndex];

            // Определяем возможные варианты движения
            const possibleIndices = [];

            // Движение вниз (тот же индекс)
            if (currentColIndex < lastRow.length) {
                possibleIndices.push(currentColIndex);
            }

            // Движение вниз-вправо (индекс + 1)
            if (currentColIndex + 1 < lastRow.length) {
                possibleIndices.push(currentColIndex + 1);
            }

            // Проверяем, какие из возможных индексов приведут к лунке
            const validBinIndices = possibleIndices.filter(colIndex => {
                // Проверяем, есть ли лунка для данного индекса
                return this.hasValidBin(colIndex, endPoints);
            });

            // Если есть индексы, ведущие к лунке, выбираем из них
            if (validBinIndices.length > 0) {
                currentColIndex = validBinIndices[Math.floor(Math.random() * validBinIndices.length)];
            }
            // Если нет валидных индексов, используем любой доступный
            else if (possibleIndices.length > 0) {
                currentColIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];
            }
            else {
                currentColIndex = Math.min(lastRow.length - 1, currentColIndex);
            }

            // Добавляем последнюю точку в путь
            const lastPathPoint = lastRow[currentColIndex];
            path.push({...lastPathPoint, type: 'path'});
            console.log(`Добавлена последняя точка пути ${lastPathPoint.number}`);
        }

        // Находим ближайшую доступную лунку к последней точке пути
        const lastPoint = path[path.length - 1];
        const nearestBin = this.findNearestBin(lastPoint, endPoints);

        if (nearestBin) {
            path.push({...nearestBin, type: 'end'});
            console.log(`Добавлена конечная точка ${nearestBin.number}`);
        } else {
            console.warn('Не удалось найти подходящую лунку для случайного пути');

            // Создаем виртуальную лунку прямо под последней точкой
            const virtualBin = {
                x: lastPoint.x,
                y: lastPoint.y + 40,
                binIndex: 0, // Будет скорректировано при обработке
                number: 'E?',
                type: 'end'
            };

            path.push(virtualBin);
        }

        // Выводим информацию о сгенерированном пути
        const pathNumbers = path.map(p => p.number || '?').join(' -> ');
        console.log(`Сгенерирован случайный путь: ${pathNumbers}`);

        return path;
    }

    /**
     * Проверяет, есть ли валидная лунка для указанного индекса колонки
     * @param {number} colIndex - Индекс колонки
     * @param {Array} endPoints - Массив конечных точек (лунок)
     * @returns {boolean} - true если есть валидная лунка
     */
    static hasValidBin(colIndex, endPoints) {
        // Лунки располагаются между гвоздиками, поэтому проверяем две возможные лунки
        const possibleBinIndices = [colIndex - 1, colIndex];

        for (const binIndex of possibleBinIndices) {
            if (binIndex >= 0 && binIndex < endPoints.length) {
                return true;
            }
        }

        return false;
    }

    /**
     * Находит ближайшую доступную лунку к указанной точке
     * @param {Object} point - Точка, для которой ищем ближайшую лунку
     * @param {Array} endPoints - Массив конечных точек (лунок)
     * @returns {Object|null} - Ближайшая лунка или null
     */
    static findNearestBin(point, endPoints) {
        if (!endPoints || endPoints.length === 0) {
            return null;
        }

        let nearestBin = null;
        let minDistance = Infinity;

        for (const bin of endPoints) {
            // Учитываем только лунки, которые находятся справа от точки или под ней
            // (в Plinko шарик не может двигаться влево)
            if (bin.x >= point.x - 10) { // Небольшой допуск для точности
                const distance = Math.abs(bin.x - point.x);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestBin = bin;
                }
            }
        }

        return nearestBin;
    }
}
