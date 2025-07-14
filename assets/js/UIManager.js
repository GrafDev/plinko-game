import {baseConfig, config, updateSizesBasedOnRows} from './config.js';
import Matter from 'matter-js';
import WinModalManager from "./WinModalManager.js";
import TargetWinsCalculator from "./TargetWinsCalculator.js";

class UIManager {
    constructor(gameInstance) {
        this.game = gameInstance;

        this.ballCount = config.defaultBallCount || 1;
        this.maxBallCount = config.maxBallCount || 10;

        // Устанавливаем начальный баланс, гарантируя, что он не отрицательный
        this.balance = Math.max(0, config.initialBalance || 50);
        this.ballCost = config.ballCost || 10;

        // Добавляем поля для количества бросков (шаров) и выигрышей
        this.throwsLeft = config.maxBalls || 5; // Количество оставшихся шаров
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
        const balanceDisplay = document.getElementById('balance-display');
        if (balanceDisplay) {
            // Вычисляем, сколько шаров останется после ставки
            const remainingAfterBet = Math.max(0, this.throwsLeft - this.ballCount);
            balanceDisplay.textContent = `Balls remaining: ${remainingAfterBet}`;
        }
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
        // Проверяем, нет ли уже созданного элемента
        const existingContainer = document.querySelector('.money-bet-container');
        if (existingContainer) {
            console.log('Money bet container already exists, skipping creation');
            return;
        }

        const moneyBetContainer = document.createElement('div');
        moneyBetContainer.className = 'money-bet-container';

        const balanceDisplay = document.createElement('div');
        balanceDisplay.id = 'balance-display';
        balanceDisplay.className = 'balance-display';
        balanceDisplay.textContent = `Шаров: ${this.throwsLeft}`;

        moneyBetContainer.appendChild(balanceDisplay);
        this.game.container.appendChild(moneyBetContainer);
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

        // Создаем элемент для отображения выигрыша
        const winsDisplay = document.createElement('div');
        winsDisplay.id = 'wins-display';
        winsDisplay.className = 'balance-display'; // Используем тот же стиль, что и для баланса
        winsDisplay.textContent = `Wins: $${this.winsAmount}`;

        winsContainer.appendChild(winsDisplay);
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
        // Обновляем отображение оставшихся шаров
        const balanceDisplay = document.getElementById('balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = `Шаров: ${this.throwsLeft}`;
        }

        // Обновляем отображение суммы выигрыша
        const winsDisplay = document.getElementById('wins-display');
        if (winsDisplay) {
            winsDisplay.textContent = `Wins: $${this.winsAmount}`;
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

        const initialRows = config.rows;

        const rowsContainer = document.createElement('div');
        rowsContainer.className = 'slider-container';

        const rowsLabel = document.createElement('label');
        rowsLabel.className = 'slider-label';
        rowsLabel.textContent = 'Rows';
        rowsContainer.appendChild(rowsLabel);

        const rowsSlider = document.createElement('input');
        rowsSlider.type = 'range';
        rowsSlider.className = 'slider';
        rowsSlider.min = (baseConfig.rows-4).toString();
        rowsSlider.max = baseConfig.rows.toString();
        rowsSlider.value = initialRows.toString();
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
        ballsLabel.textContent = 'Balls At Once';
        ballsContainer.appendChild(ballsLabel);

        const ballsSlider = document.createElement('input');
        ballsSlider.type = 'range';
        ballsSlider.className = 'slider';
        ballsSlider.min = '1';
        ballsSlider.max = this.maxBallCount.toString();
        ballsSlider.value = this.ballCount.toString();
        ballsContainer.appendChild(ballsSlider);

        // Сохраняем ссылку на слайдер шаров
        this.ballsSlider = ballsSlider;

        // Добавляем оба слайдера в массив для облегчения управления
        this.sliders = [this.rowsSlider, this.ballsSlider];

        // Создаем переменную, на которую можно ссылаться в this
        const self = this;

        ballsSlider.addEventListener('input', function() {
            const previousCount = self.ballCount;
            self.ballCount = parseInt(this.value, 10);

            // Если выбранное количество шаров больше оставшихся, ограничиваем его
            if (self.ballCount > self.throwsLeft) {
                self.ballCount = self.throwsLeft;
                this.value = self.ballCount.toString();
            }

            const betButton = document.getElementById('bet-button');
            if (betButton) {
                betButton.textContent = `Bet (${self.ballCount})`;

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

        const debugInput = document.createElement('input');
        debugInput.type = 'text';
        debugInput.id = 'debug-target-bins';
        debugInput.className = 'debug-input';
        debugInput.placeholder = 'Номера лунок через запятую (1,2,3...)';

        debugContainer.appendChild(debugInput);

        const betButton = document.getElementById('bet-button');
        if (betButton && betButton.parentNode) {
            betButton.parentNode.insertBefore(debugContainer, betButton);
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
        newButton.textContent = `Bet (${this.ballCount})`;

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
            self.updateThrowsAndWins();

            console.log(`Сделана ставка: ${betCost} (${self.ballCount} шариков по ${self.ballCost})`);
            console.log(`Новый баланс (под капотом): ${self.balance}`);
            console.log(`Осталось шаров: ${self.throwsLeft}`);

            let targetBins = null;
            if (config.showDebugInput) {
                const debugInput = document.getElementById('debug-target-bins');
                if (debugInput && debugInput.value.trim()) {
                    const inputValues = debugInput.value.split(',').map(num => {
                        return parseInt(num.trim(), 10) - 1;
                    }).filter(num => {
                        return !isNaN(num) && num >= 0 && num < config.binCount;
                    });

                    if (inputValues.length > 0) {
                        targetBins = inputValues;
                        console.log('Использую целевые лунки из отладочного инпута:', targetBins.map(i => i + 1).join(', '));
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

    // Метод для добавления выигрыша
    addWin(amount) {
        this.winsAmount += amount;
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
                // Устанавливаем максимальное значение равным количеству оставшихся шаров
                // (но не меньше 1, чтобы слайдер не сломался)
                const maxBalls = Math.max(1, this.throwsLeft);
                slider.max = maxBalls.toString();

                // Если текущее значение больше максимального, корректируем его
                if (this.ballCount > this.throwsLeft) {
                    this.ballCount = this.throwsLeft;
                    slider.value = this.ballCount.toString();
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
            betButton.textContent = `Bet (${this.ballCount})`;
        }

        console.log('Слайдеры обновлены после завершения игры');
    }

    resetPlanTargetBinsIndex() {
        this.planTargetBinsIndex = 0;
        console.log('Индекс planTargetsBins сброшен');
    }

    cleanup() {
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
