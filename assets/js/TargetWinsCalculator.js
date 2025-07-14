import { config } from './config.js';

/**
 * Класс для расчета целевого распределения шариков по лункам
 * для достижения заданной суммы выигрыша
 */
class TargetWinsCalculator {
    constructor(gameInstance, binsManager) {
        this.game = gameInstance;
        this.binsManager = binsManager;
        this.availableMultipliers = [];
    }

    /**
     * Обновляет доступные множители на основе текущего количества лунок
     */
    updateAvailableMultipliers() {
        // Получаем информацию о лунках от менеджера лунок
        const binCount = config.binCount;

        if (!binCount) {
            console.error('Не удалось определить количество лунок');
            return [];
        }

        // Получаем распределенные значения множителей для текущего количества лунок
        this.availableMultipliers = this.binsManager.getDistributedValues(binCount);
        console.log('Доступные множители:', this.availableMultipliers);

        return this.availableMultipliers;
    }

    /**
     * Рассчитывает распределение шариков по лункам для достижения целевого выигрыша
     * @returns {Array} Массив индексов лунок для каждого шарика
     */
    calculateTargetDistribution() {
        // Обновляем доступные множители
        this.updateAvailableMultipliers();

        // Получаем параметры из конфигурации
        const maxBalls = config.maxBalls || 5;
        const targetWins = config.targetWins || 1000;
        const ballCost = config.ballCost || 10;

        console.log(`Расчет распределения шариков:`);
        console.log(`- Количество шариков: ${maxBalls}`);
        console.log(`- Целевой выигрыш: ${targetWins}`);
        console.log(`- Стоимость шарика: ${ballCost}`);
        console.log(`- Доступные множители:`, this.availableMultipliers);
        console.log(`- Количество лунок: ${config.binCount}`);

        // Проверяем, достаточно ли у нас шариков и множителей
        if (!this.availableMultipliers.length) {
            console.error('Нет доступных множителей для расчета');
            return [];
        }

        // Проверяем достижимость цели с имеющимися множителями
        const maxPossibleWin = Math.max(...this.availableMultipliers) * ballCost * maxBalls;
        if (targetWins > maxPossibleWin) {
            console.warn(`Невозможно достичь выигрыша ${targetWins} с текущими множителями. Максимально возможный выигрыш: ${maxPossibleWin}`);
        }

        // Вызываем метод поиска оптимального распределения
        const bestDistribution = this.findBestDistribution(maxBalls, targetWins, ballCost);

        // Если нашли распределение, проверяем его
        if (bestDistribution && bestDistribution.length > 0) {
            const expectedWin = bestDistribution.reduce((sum, binIndex) => {
                return sum + this.availableMultipliers[binIndex] * ballCost;
            }, 0);

            console.log(`Итоговое распределение (индексы лунок):`, bestDistribution);
            console.log(`Ожидаемый выигрыш: ${expectedWin} (целевой: ${targetWins}), разница: ${expectedWin - targetWins}`);

            // Если разница между ожидаемым и целевым выигрышем слишком большая, выводим предупреждение
            if (Math.abs(expectedWin - targetWins) > targetWins * 0.05) {
                console.warn(`Внимание: Большая разница между ожидаемым и целевым выигрышем!`);
            }

            return bestDistribution;
        }

        // Если не удалось найти распределение, возвращаем пустой массив
        console.error('Не удалось найти распределение для целевого выигрыша');
        return [];
    }

    /**
     * Находит наилучшее распределение шариков для точного попадания в целевую сумму
     * с условием минимизации повторов одинаковых лунок
     * @param {number} maxBalls - Максимальное количество шариков
     * @param {number} targetWins - Целевая сумма выигрыша
     * @param {number} ballCost - Стоимость одного шарика
     * @returns {Array} - Массив индексов лунок для каждого шарика
     */
    findBestDistribution(maxBalls, targetWins, ballCost) {
        // Создаем массив возможных комбинаций множителей
        const multipliers = [...this.availableMultipliers];
        const multiplierIndices = multipliers.map((_, index) => index);

        // Преобразуем целевую сумму в целевое значение множителей
        const targetMultiplierSum = targetWins / ballCost;

        console.log(`Ищем распределение для целевой суммы множителей: ${targetMultiplierSum}`);
        console.log(`Доступные множители:`, multipliers);

        // Массив для хранения лучшего распределения
        let bestDistribution = [];
        let bestDifference = Infinity;
        let bestUniqueCount = 0; // Счетчик уникальных лунок в лучшем решении

        // Пробуем разные комбинации множителей
        // Начинаем с высоких множителей для максимальных шансов попадания в сумму
        const sortedIndices = multiplierIndices.sort((a, b) =>
            multipliers[b] - multipliers[a]);

        // Функция для подсчета уникальных лунок в распределении
        const countUniqueBins = (distribution) => {
            return new Set(distribution).size;
        };

        // Функция для генерации комбинаций с определенным начальным множителем
        const generateCombinations = (currentIndex, currentSum, combination, usedBins) => {
            // Если достигли нужного количества шариков, проверяем насколько близко к цели
            if (combination.length === maxBalls) {
                const diff = Math.abs(currentSum - targetMultiplierSum);
                const uniqueCount = countUniqueBins(combination);

                // Если нашли точное совпадение и больше уникальных лунок
                if (diff === 0 && uniqueCount > bestUniqueCount) {
                    console.log('Найдено точное попадание с большим числом уникальных лунок!');
                    bestDistribution = [...combination];
                    bestDifference = 0;
                    bestUniqueCount = uniqueCount;
                    return true;
                }

                // Если нашли точное совпадение, но не больше уникальных лунок
                if (diff === 0 && bestDifference !== 0) {
                    bestDistribution = [...combination];
                    bestDifference = 0;
                    bestUniqueCount = uniqueCount;
                    return false;
                }

                // Если нашли более близкое к цели распределение или то же, но с большим количеством уникальных лунок
                if (diff < bestDifference || (diff === bestDifference && uniqueCount > bestUniqueCount)) {
                    bestDifference = diff;
                    bestDistribution = [...combination];
                    bestUniqueCount = uniqueCount;
                }

                return false;
            }

            // Если текущая сумма уже превысила целевую, прекращаем поиск в этой ветке
            if (currentSum > targetMultiplierSum) {
                return false;
            }

            // Массив для отслеживания уже проверенных множителей (для оптимизации)
            const checkedMultipliers = new Set();

            // Пробуем различные комбинации множителей
            for (let i = 0; i < multipliers.length; i++) {
                const multiplierIndex = sortedIndices[i];
                const multiplier = multipliers[multiplierIndex];

                // Пропускаем повторные множители (для оптимизации)
                if (checkedMultipliers.has(multiplier)) continue;
                checkedMultipliers.add(multiplier);

                // Обновляем счетчик использованных лунок
                const newUsedBins = new Map(usedBins);
                const usedCount = newUsedBins.get(multiplierIndex) || 0;
                newUsedBins.set(multiplierIndex, usedCount + 1);

                // Если лунка использована слишком много раз, пропускаем
                // Для больших maxBalls разрешаем повторения, но стараемся их минимизировать
                const maxRepeats = Math.max(1, Math.ceil(maxBalls / multipliers.length));
                if (usedCount >= maxRepeats) continue;

                // Добавляем текущий множитель
                combination.push(multiplierIndex);

                // Рекурсивно продолжаем поиск
                const found = generateCombinations(i, currentSum + multiplier, combination, newUsedBins);

                // Если нашли точное совпадение, возвращаем его
                if (found) return true;

                // Убираем текущий множитель для следующей итерации
                combination.pop();
            }

            return false;
        };

        // Для небольшого числа шариков можно попробовать полный перебор
        if (maxBalls <= 3) {
            generateCombinations(0, 0, [], new Map());
        } else {
            // Для большего числа шариков используем модифицированный алгоритм
            // Предпочитаем более разнообразные лунки

            // Сначала пробуем разные стартовые лунки
            for (let startIdx = 0; startIdx < Math.min(5, multipliers.length); startIdx++) {
                const combination = [];
                const usedBins = new Map();
                let currentSum = 0;

                // Жадно выбираем множители, максимизируя разнообразие лунок
                for (let i = 0; i < maxBalls; i++) {
                    const remainingAmount = targetMultiplierSum - currentSum;
                    const neededPerBall = remainingAmount / (maxBalls - i);

                    // Находим наилучший множитель: близкий к нужному и наименее используемый
                    let bestIdx = -1;
                    let bestScore = Infinity; // Меньше - лучше

                    for (let j = 0; j < multipliers.length; j++) {
                        const multiplier = multipliers[j];
                        const usageCount = usedBins.get(j) || 0;

                        // Штраф за повторное использование
                        const usagePenalty = usageCount * 10;

                        // Вычисляем близость к требуемому значению (с учетом штрафа)
                        const score = Math.abs(multiplier - neededPerBall) + usagePenalty;

                        if (score < bestScore) {
                            bestScore = score;
                            bestIdx = j;
                        }
                    }

                    if (bestIdx >= 0) {
                        combination.push(bestIdx);
                        currentSum += multipliers[bestIdx];
                        const usageCount = usedBins.get(bestIdx) || 0;
                        usedBins.set(bestIdx, usageCount + 1);
                    }
                }

                // Проверяем, насколько близко к цели
                const diff = Math.abs(currentSum - targetMultiplierSum);
                const uniqueCount = countUniqueBins(combination);

                if (diff < bestDifference || (diff === bestDifference && uniqueCount > bestUniqueCount)) {
                    bestDifference = diff;
                    bestDistribution = [...combination];
                    bestUniqueCount = uniqueCount;
                }
            }

            // Применяем финальную оптимизацию, если нужно
            if (bestDifference > 0) {
                console.log('Пытаемся улучшить найденное распределение');

                // Копируем лучшее найденное распределение
                const distribution = [...bestDistribution];
                const currentSum = distribution.reduce((sum, idx) => sum + multipliers[idx], 0);
                const diff = targetMultiplierSum - currentSum;

                // Если разница небольшая, пробуем подкорректировать одну лунку
                if (Math.abs(diff) < Math.max(...multipliers)) {
                    for (let i = 0; i < distribution.length; i++) {
                        const oldIdx = distribution[i];
                        const oldMultiplier = multipliers[oldIdx];

                        for (let j = 0; j < multipliers.length; j++) {
                            if (j === oldIdx) continue;

                            const newMultiplier = multipliers[j];
                            const newDiff = Math.abs(targetMultiplierSum - (currentSum - oldMultiplier + newMultiplier));

                            if (newDiff < bestDifference) {
                                distribution[i] = j;
                                bestDifference = newDiff;
                                bestDistribution = [...distribution];
                                bestUniqueCount = countUniqueBins(distribution);

                                // Если нашли точное совпадение, прекращаем поиск
                                if (newDiff === 0) break;
                            }
                        }

                        // Если нашли точное совпадение, прекращаем поиск
                        if (bestDifference === 0) break;

                        // Восстанавливаем исходное значение для следующей итерации
                        distribution[i] = oldIdx;
                    }
                }
            }
        }

        // Проверяем найденное распределение
        const finalSum = bestDistribution.reduce((sum, idx) => sum + multipliers[idx], 0);
        const expectedWin = finalSum * ballCost;
        const uniqueCount = countUniqueBins(bestDistribution);

        console.log(`Найдено распределение: ${bestDistribution.map(idx => idx + 1).join(', ')}`);
        console.log(`Множители: ${bestDistribution.map(idx => multipliers[idx]).join(', ')}`);
        console.log(`Ожидаемый выигрыш: ${expectedWin} (целевой: ${targetWins}), разница: ${expectedWin - targetWins}`);
        console.log(`Количество уникальных лунок: ${uniqueCount} из ${maxBalls}`);

        return bestDistribution;
    }

    /**
     * Применяет рассчитанное распределение шариков, устанавливая целевые лунки
     */
    applyTargetDistribution() {
        const distribution = this.calculateTargetDistribution();

        if (distribution && distribution.length > 0) {
            console.log('Применение распределения:', distribution);

            // Устанавливаем целевые лунки через глобальную функцию
            if (typeof window.setTargetBins === 'function') {
                window.setTargetBins(distribution);
                return true;
            } else {
                console.error('Функция setTargetBins не доступна');
            }
        }

        return false;
    }
}

export default TargetWinsCalculator;
