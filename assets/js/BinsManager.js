import Matter from 'matter-js';
import { config } from './config.js';
import { calculateMultiplier } from './utils.js';

const { Bodies, World } = Matter;

class BinsManager {
    constructor(gameInstance, engineWorld) {
        this.game = gameInstance;
        this.world = engineWorld;
        this.bins = [];
        this.dividers = [];
        this.binWidth = 0;
        this.binNumbers = [];
        this.binLabels = [];
        this.blockAnimations = {};
        this.binHits = {};
        this.htmlBins = []; // Массив для хранения ссылок на HTML-элементы корзин
    }

    getBinColor(index, total) {
        const middle = (total - 1) / 2;
        const distance = Math.abs(index - middle) / middle;

        if (distance < 0.3) {
            return `rgb(173, 216, 230)`;  // Светло-голубой для центральных корзин
        }

        const red = Math.round(70 + 50 * (1 - distance));   // Приглушенный красный компонент
        const green = Math.round(130 + 86 * (1 - distance)); // Голубовато-зеленый компонент
        const blue = Math.round(180 + 75 * distance);        // Синий компонент усиливается к краям

        return `rgb(${red}, ${green}, ${blue})`;
    }

    getDistributedValues(logicalBinCount) {
        const costedBins = config.costedBins || [];

        if (!costedBins.length) {
            const result = [];
            for (let i = 0; i < logicalBinCount; i++) {
                result.push(calculateMultiplier(i, logicalBinCount));
            }
            return result;
        }

        // Фиксированное распределение от центра
        // Учитываем что крайние лунки сдваиваются: 0,1 сдвоены и последние две тоже
        // Реальное количество уникальных значений = logicalBinCount - 2
        const uniqueValuesCount = logicalBinCount - 2;
        const distributedValues = new Array(logicalBinCount);
        const isEven = uniqueValuesCount % 2 === 0;
        const middle = Math.floor(uniqueValuesCount / 2);
        
        // Размещаем значения симметрично от центра
        // Центральные позиции начинаются с индекса 1 (так как 0 и 1 сдвоены)
        const centerStart = 1;
        const centerEnd = logicalBinCount - 2; // Последние две тоже сдвоены
        const realMiddle = Math.floor((centerStart + centerEnd) / 2);
        
        // Центральная лунка получает 0
        distributedValues[realMiddle] = costedBins[0];
        if (uniqueValuesCount % 2 === 0) {
            distributedValues[realMiddle + 1] = costedBins[0];
        }
        
        // Заполняем симметрично от центра
        let valueIndex = 1;
        for (let distance = 1; distance < costedBins.length && valueIndex < costedBins.length; distance++) {
            const value = costedBins[valueIndex];
            
            let leftPos, rightPos;
            
            if (uniqueValuesCount % 2 === 0) {
                // Четное количество - две центральные лунки
                leftPos = realMiddle - distance;
                rightPos = realMiddle + 1 + distance;
            } else {
                // Нечетное количество - одна центральная лунка
                leftPos = realMiddle - distance;
                rightPos = realMiddle + distance;
            }
            
            // Размещаем значения если они помещаются
            if (leftPos >= centerStart && rightPos <= centerEnd) {
                distributedValues[leftPos] = value;
                distributedValues[rightPos] = value;
                valueIndex++;
            } else {
                break;
            }
        }
        
        // Сдвоенные крайние лунки получают фиксированное значение 100
        const extremeValue = 100; // Фиксированное значение для крайних лунок
        distributedValues[0] = extremeValue;  // Левая крайняя (сдвоена с 1)
        distributedValues[1] = extremeValue;  // Левая крайняя (сдвоена с 0)
        distributedValues[logicalBinCount - 2] = extremeValue; // Правая крайняя (сдвоена с последней)
        distributedValues[logicalBinCount - 1] = extremeValue; // Правая крайняя (сдвоена с предпоследней)
        
        // Если лунок больше чем значений, повторяем последнее значение
        for (let i = 0; i < logicalBinCount; i++) {
            if (distributedValues[i] === undefined) {
                distributedValues[i] = costedBins[costedBins.length - 1];
            }
        }

        return distributedValues;
    }

    createBins() {
        this.clearBins();

        const lastRowInfo = this.game.pyramidManager.getLastRowInfo();
        const logicalBinCount = lastRowInfo.pegCount - 1;
        const actualBinCount = logicalBinCount - 2;
        config.binCount = logicalBinCount;

        console.log(`Создаем лунки: логическое количество = ${logicalBinCount}, фактическое количество = ${actualBinCount}`);
        console.log(`Позиции последнего ряда:`, lastRowInfo.positions);

        const distributedValues = this.getDistributedValues(logicalBinCount);
        console.log(`Распределенные значения для лунок:`, distributedValues);

        this.binHits = {};
        for (let i = 0; i < logicalBinCount; i++) {
            this.binHits[i] = 0;
        }

        const binTopY = lastRowInfo.depth + config.binDistanceFromLastRow;
        const blockHeight = config.binHeight;
        const gapBetweenBlocks = 4;

        const physicalBins = [];

        // Получаем контейнер для HTML-корзин
        const binsContainer = document.getElementById('bins-container');
        if (!binsContainer) {
            console.error('Не найден контейнер для корзин с id="bins-container"');
            return;
        }

        // Очищаем контейнер от предыдущих корзин
        binsContainer.innerHTML = '';
        this.htmlBins = [];

        // Создаем корзины

        // Левая сдвоенная лунка
        const leftX1 = lastRowInfo.positions[0];
        const rightX1 = lastRowInfo.positions[2];
        const width1 = rightX1 - leftX1 - gapBetweenBlocks*2;
        const centerX1 = (leftX1 + rightX1) / 2;
        const binColor1 = this.getBinColor(0, logicalBinCount);
        const multiplier1 = distributedValues[0];

        // Создаем физический объект для левой корзины
        const leftBlock = Bodies.rectangle(
            centerX1,
            binTopY + blockHeight/2,
            width1,
            blockHeight,
            {
                isStatic: true,
                render: {
                    fillStyle: 'transparent', // Невидимый объект
                    lineWidth: 0,
                    strokeStyle: 'transparent'
                },
                label: `bin_0`,
                isSensor: false,
                chamfer: { radius: 4 },
                friction: config.blockFriction,
                multiplier: multiplier1,
                logicalBinIndex: 0,
                collisionFilter: {
                    category: 0x0008,
                    mask: 0xFFFFFFFF
                }
            }
        );

        physicalBins.push(leftBlock);
        World.add(this.world, leftBlock);
        this.blockAnimations[`bin_0`] = {
            originalColor: binColor1,
            isAnimating: false
        };

        // Создаем HTML-элемент для левой корзины
        const leftBinElement = document.createElement('div');
        leftBinElement.className = 'bin';
        leftBinElement.dataset.binIndex = '0';
        leftBinElement.style.backgroundColor = binColor1;
        leftBinElement.innerHTML = `<span class="bin-label-new">$${multiplier1}</span>`;
        binsContainer.appendChild(leftBinElement);
        this.htmlBins.push(leftBinElement);

        // Средние лунки
        for (let i = 1; i < actualBinCount - 1; i++) {
            const adjustedIndex = i + 1;

            const leftX = lastRowInfo.positions[adjustedIndex];
            const rightX = lastRowInfo.positions[adjustedIndex + 1];
            const width = rightX - leftX - gapBetweenBlocks;
            const centerX = (leftX + rightX) / 2;
            const binColor = this.getBinColor(adjustedIndex, logicalBinCount);

            const multiplier = distributedValues[adjustedIndex];

            // Создаем физический объект для средней корзины
            const block = Bodies.rectangle(
                centerX,
                binTopY + blockHeight/2,
                width,
                blockHeight,
                {
                    isStatic: true,
                    render: {
                        fillStyle: 'transparent', // Невидимый объект
                        lineWidth: 0,
                        strokeStyle: 'transparent'
                    },
                    label: `bin_${i}`,
                    isSensor: false,
                    chamfer: { radius: 4 },
                    friction: config.blockFriction,
                    multiplier: multiplier,
                    logicalBinIndex: adjustedIndex,
                    collisionFilter: {
                        category: 0x0008,
                        mask: 0xFFFFFFFF
                    }
                }
            );

            physicalBins.push(block);
            World.add(this.world, block);
            this.blockAnimations[`bin_${i}`] = {
                originalColor: binColor,
                isAnimating: false
            };

            // Создаем HTML-элемент для средней корзины
            const binElement = document.createElement('div');
            binElement.className = 'bin';
            binElement.dataset.binIndex = adjustedIndex.toString();
            binElement.style.backgroundColor = binColor;
            binElement.innerHTML = `<span class="bin-label-new">$${multiplier}</span>`;
            binsContainer.appendChild(binElement);
            this.htmlBins.push(binElement);
        }

        // Правая сдвоенная лунка
        const posLength = lastRowInfo.positions.length;
        const rightBinIdx = Math.min(logicalBinCount, posLength - 1);
        const leftX2 = lastRowInfo.positions[rightBinIdx - 2] || lastRowInfo.positions[posLength - 3];
        const rightX2 = lastRowInfo.positions[rightBinIdx] || lastRowInfo.positions[posLength - 1];

        console.log(`Позиции правой лунки: leftX2=${leftX2}, rightX2=${rightX2}, rightBinIdx=${rightBinIdx}, logicalBinCount=${logicalBinCount}`);

        const width2 = rightX2 - leftX2 - gapBetweenBlocks;
        const centerX2 = (leftX2 + rightX2) / 2;
        const binColor2 = this.getBinColor(logicalBinCount - 2, logicalBinCount);

        const multiplier2 = distributedValues[logicalBinCount - 1];

        // Создаем физический объект для правой корзины
        const rightBlock = Bodies.rectangle(
            centerX2,
            binTopY + blockHeight/2,
            width2,
            blockHeight,
            {
                isStatic: true,
                render: {
                    fillStyle: 'transparent', // Невидимый объект
                    lineWidth: 0,
                    strokeStyle: 'transparent'
                },
                label: `bin_${actualBinCount - 1}`,
                isSensor: false,
                chamfer: { radius: 4 },
                friction: config.blockFriction,
                multiplier: multiplier2,
                logicalBinIndex: logicalBinCount - 1,
                collisionFilter: {
                    category: 0x0008,
                    mask: 0xFFFFFFFF
                }
            }
        );

        physicalBins.push(rightBlock);
        World.add(this.world, rightBlock);
        this.blockAnimations[`bin_${actualBinCount - 1}`] = {
            originalColor: binColor2,
            isAnimating: false
        };

        // Создаем HTML-элемент для правой корзины
        const rightBinElement = document.createElement('div');
        rightBinElement.className = 'bin';
        rightBinElement.dataset.binIndex = (logicalBinCount - 1).toString();
        rightBinElement.style.backgroundColor = binColor2;
        rightBinElement.innerHTML = `<span class="bin-label-new">$${multiplier2}</span>`;
        binsContainer.appendChild(rightBinElement);
        this.htmlBins.push(rightBinElement);

        // Пол
        const floor = Bodies.rectangle(
            this.game.width / 2,
            this.game.height + config.wallThickness / 2,
            this.game.width,
            config.wallThickness,
            {
                isStatic: true,
                render: {
                    fillStyle: config.colors.floor || '#444444'
                },
                label: 'floor',
                collisionFilter: {
                    category: 0x0004,
                    mask: 0xFFFFFFFF
                }
            }
        );

        physicalBins.push(floor);
        World.add(this.world, floor);

        this.bins = physicalBins;

        // console.log(`Создано ${this.bins.length - 1} лунок (+ пол)`);
    }

    logBinHit(binIndex) {
        if (this.binHits.hasOwnProperty(binIndex)) {
            this.binHits[binIndex]++;
            // console.log(`Попадание в лунку ${binIndex}, всего попаданий: ${this.binHits[binIndex]}`);
        }
    }

    animateBlockFlash(binIndex) {
        this.logBinHit(binIndex);

        let blockId;
        const logicalBinCount = config.binCount;

        // Определяем какая корзина должна анимироваться
        if (binIndex <= 1) {
            blockId = `bin_0`;
            // console.log(`Анимация левой двойной лунки для индекса ${binIndex}`);
        } else if (binIndex >= logicalBinCount - 2) {
            const actualBinCount = logicalBinCount - 2;
            blockId = `bin_${actualBinCount - 1}`;
            // console.log(`Анимация правой двойной лунки для индекса ${binIndex}, блок: ${blockId}, actualBinCount: ${actualBinCount}`);
        } else {
            blockId = `bin_${binIndex - 1}`;
            // console.log(`Анимация обычной лунки для индекса ${binIndex}, блок: ${blockId}`);
        }

        // Находим соответствующий HTML-элемент корзины
        // Находим соответствующий HTML-элемент корзины
        let htmlBin = null;
        for (const bin of this.htmlBins) {
            const binIndexFromDataset = parseInt(bin.dataset.binIndex);
            if (binIndexFromDataset === binIndex ||
                (binIndex === 1 && binIndexFromDataset === 0) ||
                (binIndex === logicalBinCount - 2 && binIndexFromDataset === logicalBinCount - 1)) {
                htmlBin = bin;
                break;
            }
        }

        if (htmlBin) {
            // Анимируем HTML-элемент
            const originalBackgroundColor = htmlBin.style.backgroundColor;
            const originalPosition = parseInt(htmlBin.style.top || '0');

            // Добавляем класс для анимации вспышки
            htmlBin.classList.add('bin-flash');

            // Анимируем движение вниз
            const moveDownDistance = 5;
            htmlBin.style.transform = `translateY(${moveDownDistance}px)`;

            // Возвращаем обратно через некоторое время
            setTimeout(() => {
                // Возвращаем позицию
                htmlBin.style.transform = '';

                // Возвращаем цвет через задержку
                setTimeout(() => {
                    htmlBin.classList.remove('bin-flash');
                }, 150);
            }, 150);
        }

        // Сохраняем анимацию для физического объекта
        const blockInfo = this.blockAnimations[blockId];
        if (!blockInfo || blockInfo.isAnimating) return;

        const block = this.bins.find(bin => bin.label === blockId);
        if (!block) return;

        blockInfo.isAnimating = true;
        const originalPosition = { ...block.position };

        // Двигаем физический объект вниз для сохранения физического взаимодействия
        const moveDownDistance = 5;
        Matter.Body.translate(block, { x: 0, y: moveDownDistance });

        setTimeout(() => {
            if (block.position) {
                Matter.Body.setPosition(block, originalPosition);
            }

            setTimeout(() => {
                blockInfo.isAnimating = false;
            }, 150);
        }, 150);
    }

    getMultiplier(binIndex) {
        const logicalBinCount = config.binCount;
        const distributedValues = this.getDistributedValues(logicalBinCount);

        if (binIndex === 0 || binIndex === 1) {
            return distributedValues[0];
        } else if (binIndex >= logicalBinCount - 2) {
            return distributedValues[logicalBinCount - 1];
        } else {
            return distributedValues[binIndex];
        }
    }

    clearBins() {
        // Удаляем физические объекты
        for (const bin of this.bins) {
            World.remove(this.world, bin);
        }

        for (const divider of this.dividers) {
            World.remove(this.world, divider);
        }

        // Очищаем HTML-корзины
        const binsContainer = document.getElementById('bins-container');
        if (binsContainer) {
            binsContainer.innerHTML = '';
        }

        this.bins = [];
        this.dividers = [];
        this.binNumbers = [];
        this.binLabels = [];
        this.blockAnimations = {};
        this.binHits = {};
        this.htmlBins = [];
    }

    getBinHitsStatistics() {
        return {
            binHits: { ...this.binHits },
            totalHits: Object.values(this.binHits).reduce((a, b) => a + b, 0)
        };
    }

    updateDimensions() {
        // При изменении размеров пересоздаем корзины
        this.createBins();

        // Обновляем контейнер в игре (если доступен)
        if (this.game && typeof this.game.updateBinsContainer === 'function') {
            this.game.updateBinsContainer();
        }
    }
}

export default BinsManager;
