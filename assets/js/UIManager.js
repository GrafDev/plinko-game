import {baseConfig, config, updateSizesBasedOnRows} from './config.js';
import Matter from 'matter-js';
import WinModalManager from "./WinModalManager.js";
import TargetWinsCalculator from "./TargetWinsCalculator.js";

class UIManager {
    constructor(gameInstance) {
        this.game = gameInstance;

        this.ballCount = config.maxBalls || 10;
        this.maxBallCount = config.maxBalls || 10;

        // Устанавливаем начальный баланс, гарантируя, что он не отрицательный
        this.balance = Math.max(0, config.initialBalance || 50);
        this.ballCost = config.ballCost || 10;

        // Добавляем поля для количества бросков (шаров) и выигрышей
        this.throwsLeft = config.maxBalls || 10; // Количество оставшихся шаров
        this.winsAmount = 0;

        // Флаг для отслеживания первого броска
        this.isFirstBetPlaced = false;

        // Флаг для отслеживания активной игры (когда катятся шарики)
        this.isGameActive = false;

        // Менеджер модального окна
        this.winModalManager = null;

        // Ссылки на слайдеры
        this.rowsSlider = null;
        this.ballsSlider = null;

        // Массив всех слайдеров (для облегчения блокировки/разблокировки)
        this.sliders = [];

        // Добавляем индекс для отслеживания позиции в planTargetsBins
        this.planTargetBinsIndex = 0;
    }

    // Метод для обновления отображения оставшихся шаров с учетом текущего выбора
    updateRemainingBalls() {
        // Убираем отображение "Balls remaining"
        return;
    }

    initialize() {
        // Сначала очищаем все существующие элементы управления
        this.cleanup();

        this.createMoneyBetUI();
        this.updateBalanceDisplay(); // Оставляем для совместимости
        this.updateThrowsAndWins();  // Вызываем новый метод
        this.createWinsDisplay();
        this.createSliders();
        this.createDebugInput();
        this.setupBetButton();
        this.setupResponsiveWins(); // Добавляем адаптивность для wins
        this.setupResponsiveSliders(); // Добавляем адаптивность для слайдеров

        // Инициализируем менеджер модального окна
        this.winModalManager = new WinModalManager(this.game);
        this.winModalManager.initialize();

        // После инициализации слайдера обновляем отображение оставшихся шаров
        this.updateRemainingBalls();
        this.initializeTargetBins();
    }

    showWinModal(winsAmount) {
        if (this.winModalManager) {
            this.winModalManager.showWinModal(winsAmount);
        }
    }

    createMoneyBetUI() {
        // Скрываем этот блок - он не нужен
        return;
    }

    createWinsDisplay() {
        // Проверяем, существует ли уже контейнер для отображения выигрыша
        const winsContainer = document.getElementById('wins-container');
        if (!winsContainer) {
            console.error('Wins container not found, cannot create wins display');
            return;
        }

        // Очищаем существующий контейнер
        winsContainer.innerHTML = '';

        // Создаем красивый элемент для отображения выигрыша
        const winsAmountSpan = document.createElement('span');
        winsAmountSpan.className = 'wins-amount';
        winsAmountSpan.textContent = `${this.winsAmount}€`;

        const winsLabelSpan = document.createElement('span');
        winsLabelSpan.className = 'wins-label';
        winsLabelSpan.textContent = 'WINS';

        winsContainer.appendChild(winsAmountSpan);
        winsContainer.appendChild(winsLabelSpan);
    }

    updateBalanceDisplay() {
        const balanceDisplay = document.getElementById('balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = `Баланс: $${this.balance}`;
        }
    }

// Метод для инициализации массива целевых лунок
    initializeTargetBins() {
        // ✅ Защита от пересоздания плана, если он уже есть
        if (config.planTargetsBins?.length > 0 && this.planTargetBinsIndex < config.planTargetsBins.length) {
            console.log("✅ План целевых лунок уже существует, не пересоздаём");
            return;
        }

        if (config.targetWins > 0 && this.game.binsManager) {
            console.log('🧠 Инициализация массива целевых лунок для достижения выигрыша:', config.targetWins);

            setTimeout(() => {
                const targetWinsCalculator = new TargetWinsCalculator(this.game, this.game.binsManager);
                const success = targetWinsCalculator.applyTargetDistribution();

                if (success) {
                    config.planTargetsBins = [...config.targetBins]; // зафиксировать распределение
                    this.planTargetBinsIndex = 0;
                    console.log('✅ Целевые лунки установлены в план:', config.planTargetsBins);
                } else {
                    console.warn('❌ Не удалось установить планируемые лунки');
                }
            }, 300);
        } else {
            console.log('⏩ Пропущена инициализация целевых лунок:', {
                'config.targetWins': config.targetWins,
                'binsManager доступен': !!this.game.binsManager
            });
        }
    }



    updateThrowsAndWins() {
        // Обновляем красивое отображение суммы выигрыша
        const winsAmountElement = document.querySelector('.wins-amount');
        if (winsAmountElement) {
            winsAmountElement.textContent = `${this.winsAmount}€`;
        }
    }

    createSliders() {
        // Находим контейнер для слайдеров
        const slidersContainer = document.getElementById('sliders-container');
        if (!slidersContainer) {
            console.error('Sliders container not found, cannot create sliders');
            return;
        }

        // Очищаем существующий контейнер
        slidersContainer.innerHTML = '';

        const initialRows = baseConfig.rows - 4; // Минимальное количество рядов
        config.rows = initialRows; // Устанавливаем в конфигурацию

        const rowsContainer = document.createElement('div');
        rowsContainer.className = 'slider-container';

        const rowsLabel = document.createElement('label');
        rowsLabel.className = 'slider-label';
        rowsLabel.textContent = 'Rows';
        rowsContainer.appendChild(rowsLabel);

        const rowsValue = document.createElement('span');
        rowsValue.className = 'slider-value';
        rowsValue.textContent = initialRows;
        rowsContainer.appendChild(rowsValue);

        const rowsSlider = document.createElement('input');
        rowsSlider.type = 'range';
        rowsSlider.className = 'slider';
        rowsSlider.min = (baseConfig.rows-4).toString();
        rowsSlider.max = baseConfig.rows.toString();
        rowsSlider.value = (baseConfig.rows-4).toString(); // Устанавливаем минимальное значение
        rowsContainer.appendChild(rowsSlider);

        // Сохраняем ссылку на слайдер rows
        this.rowsSlider = rowsSlider;

        // Если уже был сделан первый бросок, блокируем слайдер
        if (this.isFirstBetPlaced) {
            this.rowsSlider.disabled = true;
            this.rowsSlider.style.opacity = '0.5';
            this.rowsSlider.style.cursor = 'not-allowed';
        }

        const ballsContainer = document.createElement('div');
        ballsContainer.className = 'slider-container';

        const ballsLabel = document.createElement('label');
        ballsLabel.className = 'slider-label';
        ballsLabel.textContent = 'Balls';
        ballsContainer.appendChild(ballsLabel);

        const ballsValue = document.createElement('span');
        ballsValue.className = 'slider-value';
        ballsValue.textContent = this.ballCount;
        ballsContainer.appendChild(ballsValue);

        const ballsSlider = document.createElement('input');
        ballsSlider.type = 'range';
        ballsSlider.className = 'slider';
        ballsSlider.min = '1';
        ballsSlider.max = this.maxBallCount.toString();
        // Переворачиваем значение: если ballCount = 1, то value = maxBallCount
        ballsSlider.value = (this.maxBallCount - this.ballCount + 1).toString();
        ballsContainer.appendChild(ballsSlider);

        // Сохраняем ссылку на слайдер шаров
        this.ballsSlider = ballsSlider;

        // Добавляем оба слайдера в массив для облегчения управления
        this.sliders = [this.rowsSlider, this.ballsSlider];

        // Создаем переменную, на которую можно ссылаться в this
        const self = this;

        ballsSlider.addEventListener('input', function() {
            const previousCount = self.ballCount;
            // Переворачиваем значение слайдера: если value = 1, то ballCount = maxBallCount
            self.ballCount = self.maxBallCount - parseInt(this.value, 10) + 1;

            // Если выбранное количество шаров больше оставшихся, ограничиваем его
            if (self.ballCount > self.throwsLeft) {
                self.ballCount = self.throwsLeft;
                // Обновляем значение слайдера с учетом переворота
                this.value = (self.maxBallCount - self.ballCount + 1).toString();
            }

            // Обновляем значение слайдера
            ballsValue.textContent = self.ballCount;

            const betButton = document.getElementById('bet-button');
            if (betButton) {
                betButton.textContent = `Bet`;

                // Делаем кнопку неактивной, если нет оставшихся шаров
                if (self.throwsLeft <= 0) {
                    betButton.disabled = true;
                    betButton.style.opacity = '0.5';
                    betButton.style.cursor = 'not-allowed';
                } else {
                    betButton.disabled = false;
                    betButton.style.opacity = '1';
                    betButton.style.cursor = 'pointer';
                }
            }

            // Обновляем отображение оставшихся шаров с учетом выбранного количества
            self.updateRemainingBalls();
            
            // Обновляем placeholder в debug input
            self.updateDebugInputPlaceholder();
        });

        // Добавляем обработчик для динамического обновления значения rows
        rowsSlider.addEventListener('input', function() {
            const currentRows = parseInt(this.value, 10);
            rowsValue.textContent = currentRows;
        });

        rowsSlider.addEventListener('change', () => {
            const newRows = parseInt(rowsSlider.value, 10);
            if (config.rows !== newRows) {
                const oldRows = config.rows;

                try {
                    // Обновляем конфигурацию
                    config.rows = newRows;

                    // ВАЖНО: сбрасываем планируемые лунки при изменении количества рядов
                    config.planTargetsBins = [];
                    config.targetBins = [];
                    this.planTargetBinsIndex = 0;
                    console.log('Сброшены целевые лунки из-за изменения количества рядов');

                    // Обновляем размеры на основе нового количества рядов
                    updateSizesBasedOnRows();

                    // Обновляем размеры контейнера и расчеты размеров
                    this.game.updateContainerDimensions();

                    // Удаляем все объекты из мира
                    Matter.World.clear(this.game.engine.world);

                    // Пересоздаем мир
                    this.game.createWorld();

                    // Обновляем все менеджеры
                    if (this.game.pathManager) {
                        this.game.pathManager.updateDimensions();
                    }

                    if (this.game.pathRenderer) {
                        this.game.pathRenderer.updateDimensions();
                    }

                    if (this.game.physicsManager) {
                        this.game.physicsManager.updateDimensions();
                    }

                    // Обновляем контейнер корзин
                    this.game.updateBinsContainer();

                    // Выводим коэффициенты лунок после обновления
                    setTimeout(() => {
                        if (this.game.binsManager) {
                            const binCount = config.binCount || 0;
                            const coefficients = this.game.binsManager.getDistributedValues(binCount);
                            console.log(`Коэффициенты лунок для ${newRows} рядов (${binCount} лунок):`, coefficients);
                        }
                    }, 100);

                    // ВАЖНО: инициализируем массив целевых лунок ПОСЛЕ пересоздания мира
                    this.initializeTargetBins();
                    
                    // Обновляем placeholder в debug input
                    this.updateDebugInputPlaceholder();

                    console.log(`Количество рядов изменено с ${oldRows} на ${newRows}`);
                } catch (error) {
                    config.rows = oldRows;
                    rowsSlider.value = oldRows.toString();
                    console.error('Ошибка при обновлении количества рядов:', error);
                }
            }
        });

        slidersContainer.appendChild(rowsContainer);
        slidersContainer.appendChild(ballsContainer);
    }

    createDebugInput() {
        if (!config.showDebugInput) return;

        // Проверяем, нет ли уже созданного элемента
        const existingContainer = document.querySelector('.debug-input-container');
        if (existingContainer) {
            console.log('Debug input container already exists, skipping creation');
            return;
        }

        const debugContainer = document.createElement('div');
        debugContainer.className = 'debug-input-container';
        debugContainer.style.display = 'block';

        const debugInput = document.createElement('input');
        debugInput.type = 'text';
        debugInput.id = 'debug-target-bins';
        debugInput.className = 'debug-input';
        
        // Рассчитываем максимально возможную сумму
        const maxPossibleSum = this.calculateMaxPossibleSum();
        
        // Генерируем любое случайное число от 0 до максимума
        const randomValue = Math.floor(Math.random() * maxPossibleSum);
        
        debugInput.placeholder = `Target win sum (now ${randomValue}, max: ${maxPossibleSum})`;

        debugContainer.appendChild(debugInput);

        const binsContainer = document.getElementById('bins-container');
        if (binsContainer && binsContainer.parentNode) {
            binsContainer.parentNode.insertBefore(debugContainer, binsContainer.nextSibling);
        }

        // Создаем элемент для отображения результата под полем
        const resultDisplay = document.createElement('div');
        resultDisplay.className = 'target-result-display';
        resultDisplay.style.cssText = `
            margin-top: 5px;
            font-size: 18px;
            color: white;
            min-height: 20px;
            font-weight: bold;
        `;
        
        debugContainer.appendChild(resultDisplay);

        // Сохраняем ссылки
        this.debugInput = debugInput;
        this.resultDisplay = resultDisplay;
    }

    // Функция для расчета максимально возможной суммы выигрыша
    calculateMaxPossibleSum() {
        // Рассчитываем реальное количество лунок для текущего количества рядов
        const actualBinCount = config.rows + 1; // Количество лунок = количество рядов + 1
        const realAvailableValues = this.game.binsManager.getDistributedValues(actualBinCount);
        const maxBinValue = Math.max(...realAvailableValues);
        
        // Умножаем на количество шариков
        const maxPossibleSum = maxBinValue * this.ballCount;
        
        
        return maxPossibleSum;
    }

    // Функция для генерации реальной рандомной суммы
    generateRandomRealSum() {
        // Получаем реальные значения лунок
        const binCount = config.binCount || 17;
        const realAvailableValues = this.game.binsManager.getDistributedValues(binCount);
        
        // Генерируем рандомную комбинацию из ballCount шариков
        let totalSum = 0;
        for (let i = 0; i < this.ballCount; i++) {
            const randomBinIndex = Math.floor(Math.random() * realAvailableValues.length);
            totalSum += realAvailableValues[randomBinIndex];
        }
        
        return totalSum;
    }

    // Функция проверки возможности достижения целевой суммы
    isTargetSumAchievable(targetSum, ballCount = this.ballCount) {
        // Получаем доступные значения для текущего количества рядов
        const actualBinCount = config.rows + 1;
        const availableValues = this.game.binsManager.getDistributedValues(actualBinCount);
        
        // Проверяем минимальную и максимальную возможные суммы
        const minSum = Math.min(...availableValues) * ballCount;
        const maxSum = Math.max(...availableValues) * ballCount;
        
        if (targetSum < minSum || targetSum > maxSum) {
            return false;
        }
        
        // Используем динамическое программирование для проверки возможности набрать точную сумму
        const dp = new Array(targetSum + 1).fill(false);
        dp[0] = true;
        
        for (let ball = 1; ball <= ballCount; ball++) {
            const newDp = new Array(targetSum + 1).fill(false);
            for (let sum = 0; sum <= targetSum; sum++) {
                if (dp[sum]) {
                    for (const value of availableValues) {
                        if (sum + value <= targetSum) {
                            newDp[sum + value] = true;
                        }
                    }
                }
            }
            Object.assign(dp, newDp);
        }
        
        return dp[targetSum];
    }

    // Функция для генерации альтернативного достижимого значения
    suggestAlternativeTarget(originalTarget, ballCount = this.ballCount) {
        const actualBinCount = config.rows + 1;
        const availableValues = this.game.binsManager.getDistributedValues(actualBinCount);
        const maxPossibleSum = Math.max(...availableValues) * ballCount;
        
        // Ищем ближайшее достижимое значение
        let bestAlternative = 0;
        let minDiff = Infinity;
        
        for (let target = 1; target <= maxPossibleSum; target++) {
            if (this.isTargetSumAchievable(target, ballCount)) {
                const diff = Math.abs(target - originalTarget);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestAlternative = target;
                }
            }
        }
        
        return bestAlternative;
    }

    // Функция для обновления placeholder в debug input
    updateDebugInputPlaceholder() {
        const debugInput = document.getElementById('debug-target-bins');
        if (debugInput) {
            const maxPossibleSum = this.calculateMaxPossibleSum();
            
            // Генерируем любое случайное число от 0 до максимума
            const randomValue = Math.floor(Math.random() * maxPossibleSum);
            
            debugInput.placeholder = `Target win sum (now ${randomValue}, max: ${maxPossibleSum})`;
        }
    }

    setupBetButton() {
        const betButton = document.getElementById('bet-button');
        if (!betButton) {
            console.error('Bet button not found, cannot setup');
            return;
        }

        const newButton = betButton.cloneNode(true);
        betButton.parentNode.replaceChild(newButton, betButton);

        newButton.className = 'bet-button';
        newButton.textContent = `Bet`;

        if (this.throwsLeft <= 0) {
            newButton.disabled = true;
            newButton.style.opacity = '0.5';
            newButton.style.cursor = 'not-allowed';
        }

        const self = this;
        newButton.addEventListener('click', function () {
            console.log('====== НАЖАТА КНОПКА СТАВКИ ======');
            console.log('Время нажатия:', new Date().toISOString());
            console.log('Выбрано шариков:', self.ballCount);


            if (self.throwsLeft <= 0) {
                console.log('У пользователя закончились шары');
                return;
            }

            const betCost = self.ballCount * self.ballCost;
            if (self.balance < betCost) {
                console.log(`Недостаточно средств для ставки: требуется ${betCost}, доступно ${self.balance}`);
                return;
            }

            if (!self.isFirstBetPlaced) {
                self.isFirstBetPlaced = true;
                if (self.rowsSlider) {
                    self.rowsSlider.disabled = true;
                    self.rowsSlider.style.opacity = '0.5';
                    self.rowsSlider.style.cursor = 'not-allowed';
                    console.log('Слайдер rows заблокирован после первого броска');
                }
            }

            self.isGameActive = true;
            self.disableAllSliders();

            let checkInterval = setInterval(() => {
                if (self.game.physicsManager && self.game.physicsManager.getActiveBallsCount() === 0) {
                    self.isGameActive = false;
                    self.enableSlidersAfterGame();
                    console.log('Игра завершена, слайдеры обновлены (интервал)');
                    clearInterval(checkInterval);
                    checkInterval = null;
                }
            }, 500);

            if (self.game.gameLogic) {
                self.game.gameLogic.on('gameFinished', function handleGameFinished() {
                    self.isGameActive = false;
                    self.enableSlidersAfterGame();
                    console.log('Игра завершена, слайдеры обновлены (событие)');
                    if (checkInterval) {
                        clearInterval(checkInterval);
                        checkInterval = null;
                    }
                    self.game.gameLogic.off('gameFinished', handleGameFinished);
                });
            }

            self.throwsLeft -= self.ballCount;
            self.throwsLeft = Math.max(0, self.throwsLeft);
            self.balance -= betCost;
            
            // НЕ изменяем ballCount автоматически! Пользователь сам выбирает количество слайдером
            
            self.updateThrowsAndWins();

            console.log(`Сделана ставка: ${betCost} (${self.ballCount} шариков по ${self.ballCost})`);
            console.log(`Новый баланс (под капотом): ${self.balance}`);
            console.log(`Осталось шаров: ${self.throwsLeft}`);

            let targetBins = null;
            // Сохраняем target значение для отображения в wins
            self.lastTargetValue = undefined;
            self.lastResultValue = undefined;
            
            if (config.showDebugInput) {
                const debugInput = document.getElementById('debug-target-bins');
                if (debugInput && debugInput.value.trim()) {
                    const targetWinsInput = parseInt(debugInput.value.trim(), 10);
                    
                    if (!isNaN(targetWinsInput) && targetWinsInput > 0) {
                        // Сохраняем target значение
                        self.lastTargetValue = targetWinsInput;
                        console.log(`🎯 Попытка рассчитать распределение для целевой суммы: ${targetWinsInput}`);
                        
                        // Получаем реальные доступные значения из BinsManager
                        const binCount = config.binCount || 17;
                        const realAvailableValues = self.game.binsManager.getDistributedValues(binCount);
                        const availableValues = [...realAvailableValues].sort((a, b) => b - a); // Сортируем по убыванию
                        
                        console.log(`📊 Количество лунок: ${binCount}`);
                        console.log(`📊 Реальные значения лунок:`, realAvailableValues);
                        console.log(`📊 Доступные значения (отсортированные):`, availableValues);
                        
                        // Алгоритм поиска комбинации лунок для целевой суммы
                        console.log(`🔢 Поиск ${self.ballCount} лунок для суммы ${targetWinsInput}...`);
                        
                        let bestBinIndices = [];
                        let bestSum = 0;
                        let bestDifference = Infinity;
                        
                        // Простой жадный алгоритм с разложением по порядкам
                        let remaining = targetWinsInput;
                        let tempBinIndices = [];
                        
                        // Сортируем реальные значения по убыванию с их индексами
                        // Убираем дубликаты значений, оставляя только уникальные
                        const uniqueValues = [...new Set(realAvailableValues)];
                        const valueWithIndex = uniqueValues.map(value => {
                            return {value};
                        }).sort((a, b) => b.value - a.value);
                        
                        console.log(`🔍 Уникальные значения для ${binCount} лунок:`, valueWithIndex.map(item => `$${item.value}`));
                        
                        // Улучшенный алгоритм - пытаемся найти точную комбинацию
                        function findBestCombination(targetSum, maxBalls) {
                            let bestCombination = [];
                            let bestSum = 0;
                            let bestDifference = Infinity;
                            
                            // Пробуем различные комбинации
                            function tryCombo(currentCombo, currentSum, remainingBalls) {
                                if (remainingBalls === 0 || currentSum >= targetSum) {
                                    const diff = Math.abs(currentSum - targetSum);
                                    if (diff < bestDifference) {
                                        bestDifference = diff;
                                        bestSum = currentSum;
                                        bestCombination = [...currentCombo];
                                    }
                                    return;
                                }
                                
                                // Пробуем каждое уникальное значение
                                for (const {value} of valueWithIndex) {
                                    if (value === 0) continue;
                                    if (currentSum + value <= targetSum + (targetSum * 0.2)) { // Допускаем превышение на 20%
                                        // Находим все лунки с таким значением
                                        const binIndicesWithValue = realAvailableValues
                                            .map((val, idx) => val === value ? idx : -1)
                                            .filter(idx => idx !== -1);
                                        
                                        // Пробуем первую доступную лунку с этим значением
                                        const binIndex = binIndicesWithValue[0];
                                        currentCombo.push(binIndex);
                                        tryCombo(currentCombo, currentSum + value, remainingBalls - 1);
                                        currentCombo.pop();
                                    }
                                }
                                
                                // Если ничего не подошло, добавляем ноль
                                const zeroIndex = realAvailableValues.indexOf(0);
                                if (zeroIndex !== -1) {
                                    currentCombo.push(zeroIndex);
                                    tryCombo(currentCombo, currentSum, remainingBalls - 1);
                                    currentCombo.pop();
                                }
                            }
                            
                            tryCombo([], 0, maxBalls);
                            
                            return {
                                combination: bestCombination,
                                sum: bestSum,
                                difference: bestDifference
                            };
                        }
                        
                        // Если шариков мало, используем точный поиск
                        if (self.ballCount <= 5) {
                            const result = findBestCombination(targetWinsInput, self.ballCount);
                            tempBinIndices = result.combination;
                            console.log(`🎯 Точный поиск: получено ${result.sum} (разница: ${result.difference})`);
                        } else {
                            // Для большого количества шариков используем жадный алгоритм
                            for (const {value} of valueWithIndex) {
                                if (value === 0) continue;
                                
                                const count = Math.floor(remaining / value);
                                if (count > 0) {
                                    const binIndicesWithValue = realAvailableValues
                                        .map((val, idx) => val === value ? idx : -1)
                                        .filter(idx => idx !== -1);
                                    
                                    const maxCount = Math.min(count, self.ballCount - tempBinIndices.length);
                                    
                                    for (let i = 0; i < maxCount; i++) {
                                        const binIndex = binIndicesWithValue[i % binIndicesWithValue.length];
                                        tempBinIndices.push(binIndex);
                                        remaining -= value;
                                    }
                                    
                                    if (tempBinIndices.length >= self.ballCount) break;
                                }
                            }
                        }
                        
                        // Заполняем оставшиеся позиции нулями
                        while (tempBinIndices.length < self.ballCount) {
                            const zeroIndex = realAvailableValues.indexOf(0);
                            if (zeroIndex !== -1) {
                                tempBinIndices.push(zeroIndex);
                            } else {
                                break;
                            }
                        }
                        
                        // Обрезаем до нужного количества шариков
                        tempBinIndices = tempBinIndices.slice(0, self.ballCount);
                        
                        bestBinIndices = tempBinIndices;
                        bestSum = bestBinIndices.reduce((sum, binIndex) => sum + realAvailableValues[binIndex], 0);
                        bestDifference = Math.abs(bestSum - targetWinsInput);
                        
                        console.log(`🎯 Найдена комбинация лунок:`);
                        console.log(`📊 Номера лунок:`, bestBinIndices.map(i => i + 1));
                        console.log(`📊 Значения лунок:`, bestBinIndices.map(i => realAvailableValues[i]));
                        console.log(`💰 Получено: ${bestSum} из ${targetWinsInput} (разница: ${bestDifference})`);
                        
                        // Теперь bestBinIndices содержит реальные номера лунок
                        
                        // Дополнительная проверка: посчитаем ожидаемую сумму через BinsManager
                        if (bestBinIndices && bestBinIndices.length > 0) {
                            // Проверяем валидность индексов лунок
                            const validBinIndices = bestBinIndices.filter(binIndex => 
                                binIndex >= 0 && binIndex < binCount
                            );
                            
                            if (validBinIndices.length !== bestBinIndices.length) {
                                console.warn(`⚠️ Некоторые индексы лунок недействительны, используем только валидные`);
                            }
                            
                            const expectedSum = validBinIndices.reduce((sum, binIndex) => {
                                const multiplier = self.game.binsManager.getMultiplier(binIndex);
                                console.log(`Лунка ${binIndex + 1}: множитель ${multiplier}`);
                                return sum + multiplier;
                            }, 0);
                            
                            console.log(`🎯 Проверка через BinsManager: ${expectedSum} (целевая: ${targetWinsInput})`);
                            
                            targetBins = validBinIndices;
                            console.log(`✅ Использую целевую сумму ${targetWinsInput}: лунки ${targetBins.map(i => i + 1).join(', ')}`);
                        } else {
                            console.warn(`❌ Не удалось рассчитать распределение для суммы ${targetWinsInput}`);
                        }
                    }
                }
            }

            // 🎯 Формируем массив целей из плана, сдвигая индекс
            if (!targetBins && config.planTargetsBins && config.planTargetsBins.length > 0) {
                targetBins = [];
                for (let i = 0; i < self.ballCount; i++) {
                    const next = config.planTargetsBins[self.planTargetBinsIndex++];
                    if (typeof next === 'number') {
                        targetBins.push(next);
                    }
                }

                console.log('Используем планируемые лунки из planTargetsBins:', targetBins.map(i => i + 1).join(', '));
                console.log('Текущий индекс planTargetBinsIndex:', self.planTargetBinsIndex);
            }

            if (targetBins) {
                const originalTargetBins = config.targetBins;
                config.targetBins = targetBins;
                self.game.placeBet(self.ballCount);
                config.targetBins = originalTargetBins;
            } else {
                self.game.placeBet(self.ballCount);
            }

            // Показываем результат под полем ввода
            if (self.lastTargetValue !== undefined) {
                self.showTargetResult();
            }

            if (self.throwsLeft <= 0) {
                this.disabled = true;
                this.style.opacity = '0.5';
                this.style.cursor = 'not-allowed';
            }

            self.updateRemainingBalls();
        });
    }


    getBallCount() {
        return this.ballCount;
    }

    updateDimensions() {
        // Просто обновляем отображение, не создавая новые элементы
        this.updateThrowsAndWins();
        // Обновляем прогноз оставшихся шаров
        this.updateRemainingBalls();
    }

    // Проверка, есть ли активные шарики в игре
    hasActiveBalls() {
        const active = this.game &&
            this.game.physicsManager &&
            this.game.physicsManager.getActiveBallsCount();
        console.log('✅ Active balls count:', active);
        return active > 0;
    }

    // Метод для показа результата под полем ввода
    showTargetResult() {
        if (!this.resultDisplay || this.lastTargetValue === undefined) return;
        
        const currentResult = this.lastResultValue || 'Ожидаем результат...';
        let statusText = '';
        
        if (this.lastResultValue !== undefined) {
            if (this.lastTargetValue === this.lastResultValue) {
                statusText = ' ✓ Target достигнут!';
            } else {
                statusText = ' ✗ Target недостижим';
            }
        }
        
        this.resultDisplay.innerHTML = `Target: ${this.lastTargetValue}, Result: ${currentResult}${statusText}`;
        
        // Обновляем результат когда он станет доступен
        if (this.lastResultValue === undefined) {
            const checkResult = () => {
                if (this.lastResultValue !== undefined) {
                    this.showTargetResult(); // Рекурсивно обновляем отображение
                } else {
                    setTimeout(checkResult, 100); // Проверяем каждые 100мс
                }
            };
            setTimeout(checkResult, 100);
        }
    }

    // Метод для добавления выигрыша
    addWin(amount) {
        this.winsAmount += amount;
        
        // Обновляем result как общий winsAmount для сравнения с target
        if (this.lastTargetValue !== undefined) {
            this.lastResultValue = this.winsAmount;
            // Обновляем отображение результата
            this.showTargetResult();
        }
        
        // Обновляем отображение баланса под капотом
        this.balance += amount;
        this.updateThrowsAndWins();
        console.log(`Добавлен выигрыш: ${amount}, общий выигрыш: ${this.winsAmount}, баланс под капотом: ${this.balance}`);

        // После обновления выигрыша обновляем отображение оставшихся шаров
        this.updateRemainingBalls();
    }

    // Метод для блокировки всех слайдеров
    disableAllSliders() {
        this.sliders.forEach(slider => {
            if (slider) {
                // Не блокируем слайдер rows, если он уже заблокирован
                if (slider === this.rowsSlider && this.isFirstBetPlaced) {
                    return;
                }

                slider.disabled = true;
                slider.style.opacity = '0.5';
                slider.style.cursor = 'not-allowed';
            }
        });
        console.log('Все слайдеры заблокированы на время игры');
    }

    // Метод для разблокировки слайдеров после игры
    enableSlidersAfterGame() {
        // Разблокируем все слайдеры кроме rows (если он был заблокирован)
        this.sliders.forEach(slider => {
            if (!slider) return;

            // Не разблокируем слайдер rows, если уже был первый бросок
            if (slider === this.rowsSlider && this.isFirstBetPlaced) {
                return;
            }

            // Для слайдера выбора шаров обновляем максимальное значение
            if (slider === this.ballsSlider) {
                // Максимальное значение слайдера всегда равно maxBallCount (инвертированный слайдер)
                slider.max = this.maxBallCount.toString();

                // Если текущее значение больше максимального, корректируем его
                if (this.ballCount > this.throwsLeft) {
                    this.ballCount = this.throwsLeft;
                    // Обновляем значение слайдера с учетом инверсии
                    slider.value = (this.maxBallCount - this.ballCount + 1).toString();
                    // Обновляем отображение значения
                    const ballsValue = slider.parentElement.querySelector('.slider-value');
                    if (ballsValue) {
                        ballsValue.textContent = this.ballCount;
                    }
                }

                // Если шаров не осталось, блокируем слайдер
                if (this.throwsLeft <= 0) {
                    slider.disabled = true;
                    slider.style.opacity = '0.5';
                    slider.style.cursor = 'not-allowed';
                    return;
                }
            }

            // Разблокируем слайдер
            slider.disabled = false;
            slider.style.opacity = '1';
            slider.style.cursor = 'pointer';
        });

        // Обновляем текст на кнопке ставки
        const betButton = document.getElementById('bet-button');
        if (betButton) {
            betButton.textContent = `Bet`;
        }

        console.log('Слайдеры обновлены после завершения игры');
    }

    resetPlanTargetBinsIndex() {
        this.planTargetBinsIndex = 0;
        console.log('Индекс planTargetsBins сброшен');
    }


    setupResponsiveWins() {
        // Функция для перемещения wins в зависимости от размера экрана
        const moveWins = () => {
            const winsContainer = document.getElementById('wins-container');
            const gameHeader = document.querySelector('.game-header');
            const mainContainer = document.querySelector('.main-container');
            
            if (!winsContainer || !gameHeader || !mainContainer) {
                return;
            }

            if (window.innerWidth <= 1024) {
                // Для мобильных и планшетов - wins в game-header под логотипом
                if (winsContainer.parentNode !== gameHeader) {
                    gameHeader.appendChild(winsContainer);
                }
            } else {
                // Для десктопов - wins в абсолютном позиционировании
                if (winsContainer.parentNode !== mainContainer) {
                    mainContainer.appendChild(winsContainer);
                }
            }
        };

        // Выполняем сразу
        moveWins();
        
        // Добавляем обработчик изменения размера окна
        window.addEventListener('resize', moveWins);
        
        // Сохраняем ссылку для очистки
        this.responsiveWinsHandler = moveWins;
    }

    setupResponsiveSliders() {
        // Функция для перемещения слайдеров и кнопки bet в зависимости от размера экрана
        const moveControls = () => {
            const slidersContainer = document.getElementById('sliders-container');
            const betButton = document.getElementById('bet-button');
            const gameHeader = document.querySelector('.game-header');
            const gameControls = document.querySelector('.game-controls');
            const plinkoField = document.querySelector('.plinko-field');
            const plinkoGame = document.getElementById('plinko-game');
            
            if (!slidersContainer || !betButton || !gameHeader || !gameControls || !plinkoField || !plinkoGame) {
                return;
            }

            if (window.innerWidth > 1024) {
                // Для больших экранов - перемещаем слайдеры и кнопку в game-header
                if (slidersContainer.parentNode !== gameHeader) {
                    gameHeader.appendChild(slidersContainer);
                }
                if (betButton.parentNode !== gameHeader) {
                    gameHeader.appendChild(betButton);
                }
            } else {
                // Для экранов ≤1024px - перемещаем game-controls под plinko-game
                if (gameControls.parentNode !== plinkoField) {
                    // Вставляем game-controls после plinko-game
                    plinkoGame.insertAdjacentElement('afterend', gameControls);
                }
                
                // Убеждаемся, что слайдеры в game-controls
                if (slidersContainer.parentNode !== gameControls) {
                    gameControls.appendChild(slidersContainer);
                }
                
                // Перемещаем bet внутрь sliders-container между слайдерами
                if (betButton.parentNode !== slidersContainer) {
                    const sliderContainers = slidersContainer.querySelectorAll('.slider-container');
                    if (sliderContainers.length >= 2) {
                        // Вставляем bet между первым и вторым слайдером
                        sliderContainers[1].insertAdjacentElement('beforebegin', betButton);
                    } else {
                        // Если слайдеров меньше 2, просто добавляем в конец
                        slidersContainer.appendChild(betButton);
                    }
                }
            }
        };

        // Выполняем сразу
        moveControls();
        
        // Добавляем обработчик изменения размера окна
        window.addEventListener('resize', moveControls);
        
        // Сохраняем ссылку для очистки
        this.responsiveSlidersHandler = moveControls;
    }

    cleanup() {
        // Очищаем обработчики responsive
        if (this.responsiveWinsHandler) {
            window.removeEventListener('resize', this.responsiveWinsHandler);
            this.responsiveWinsHandler = null;
        }
        if (this.responsiveSlidersHandler) {
            window.removeEventListener('resize', this.responsiveSlidersHandler);
            this.responsiveSlidersHandler = null;
        }
        
        // Удаляем все созданные контейнеры
        const containers = [
            '.controls-container',
            '.sliders-container',
            '.money-bet-container',
            '.debug-input-container'
        ];

        containers.forEach(selector => {
            const elements = this.game.container.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        });

        // Очищаем контейнер для отображения выигрыша
        const winsContainer = document.getElementById('wins-container');
        if (winsContainer) {
            winsContainer.innerHTML = '';
        }

        // Очищаем ресурсы менеджера модального окна
        if (this.winModalManager) {
            this.winModalManager.cleanup();
            this.winModalManager = null;
        }

        // Очищаем обработчик событий у кнопки ставки
        const betButton = document.getElementById('bet-button');
        if (betButton) {
            const newButton = betButton.cloneNode(false);
            newButton.textContent = 'Bet';
            if (betButton.parentNode) {
                betButton.parentNode.replaceChild(newButton, betButton);
            }
        }

        // Очищаем ссылки на слайдеры
        this.rowsSlider = null;
        this.ballsSlider = null;
        this.sliders = [];
        this.planTargetBinsIndex = 0;
    }
}

export default UIManager;
