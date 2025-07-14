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

        // Простое распределение от центра без сдваивания
        const distributedValues = new Array(logicalBinCount);
        const isEven = logicalBinCount % 2 === 0;
        const middle = Math.floor(logicalBinCount / 2);
        
        // Центральная лунка получает 0
        if (isEven) {
            // Четное количество - две центральные лунки
            distributedValues[middle - 1] = costedBins[0];
            distributedValues[middle] = costedBins[0];
        } else {
            // Нечетное количество - одна центральная лунка
            distributedValues[middle] = costedBins[0];
        }
        
        // Заполняем симметрично от центра
        let valueIndex = 1;
        for (let distance = 1; distance < costedBins.length && valueIndex < costedBins.length; distance++) {
            const value = costedBins[valueIndex];
            
            let leftPos, rightPos;
            
            if (isEven) {
                // Четное количество - две центральные лунки
                leftPos = middle - 1 - distance;
                rightPos = middle + distance;
            } else {
                // Нечетное количество - одна центральная лунка
                leftPos = middle - distance;
                rightPos = middle + distance;
            }
            
            // Размещаем значения если они помещаются
            if (leftPos >= 0 && rightPos < logicalBinCount) {
                distributedValues[leftPos] = value;
                distributedValues[rightPos] = value;
                valueIndex++;
            } else {
                break;
            }
        }
        
        // Если лунок больше чем значений, не используем максимальное значение
        // Оставляем неопределенные позиции пустыми или используем предыдущее значение
        for (let i = 0; i < logicalBinCount; i++) {
            if (distributedValues[i] === undefined) {
                // Находим ближайшее определенное значение
                let nearestValue = 0;
                for (let j = 1; j <= Math.min(i, logicalBinCount - 1 - i); j++) {
                    if (i - j >= 0 && distributedValues[i - j] !== undefined) {
                        nearestValue = distributedValues[i - j];
                        break;
                    }
                    if (i + j < logicalBinCount && distributedValues[i + j] !== undefined) {
                        nearestValue = distributedValues[i + j];
                        break;
                    }
                }
                distributedValues[i] = nearestValue;
            }
        }

        return distributedValues;
    }

    createBins() {
        this.clearBins();

        const lastRowInfo = this.game.pyramidManager.getLastRowInfo();
        const logicalBinCount = lastRowInfo.pegCount - 1;
        config.binCount = logicalBinCount;

        console.log(`Создаем лунки: количество = ${logicalBinCount}`);
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

        // Создаем все лунки одинаково
        for (let i = 0; i < logicalBinCount; i++) {
            const leftX = lastRowInfo.positions[i];
            const rightX = lastRowInfo.positions[i + 1];
            const width = rightX - leftX - gapBetweenBlocks;
            const centerX = (leftX + rightX) / 2;
            const binColor = this.getBinColor(i, logicalBinCount);
            const multiplier = distributedValues[i];

            // Создаем физический объект для корзины
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
                    logicalBinIndex: i,
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

            // Создаем HTML-элемент для корзины
            const binElement = document.createElement('div');
            binElement.className = 'bin';
            binElement.dataset.binIndex = i.toString();
            binElement.style.backgroundColor = binColor;
            binElement.innerHTML = `<span class="bin-label-new">$${multiplier}</span>`;
            binsContainer.appendChild(binElement);
            this.htmlBins.push(binElement);
        }

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

        console.log(`Создано ${logicalBinCount} лунок (+ пол)`);
    }

    logBinHit(binIndex) {
        if (this.binHits.hasOwnProperty(binIndex)) {
            this.binHits[binIndex]++;
            // console.log(`Попадание в лунку ${binIndex}, всего попаданий: ${this.binHits[binIndex]}`);
        }
    }

    animateBlockFlash(binIndex) {
        this.logBinHit(binIndex);

        const blockId = `bin_${binIndex}`;

        // Находим соответствующий HTML-элемент корзины
        let htmlBin = null;
        for (const bin of this.htmlBins) {
            const binIndexFromDataset = parseInt(bin.dataset.binIndex);
            if (binIndexFromDataset === binIndex) {
                htmlBin = bin;
                break;
            }
        }

        if (htmlBin) {
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
        return distributedValues[binIndex];
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
