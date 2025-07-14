import { config } from './config.js';
import Matter from 'matter-js';

const { Events } = Matter;

class GameLogic {
    constructor(gameInstance, engine, pyramidManager, physicsManager, binsManager, pathManager, uiManager) {
        this.game = gameInstance;
        this.engine = engine;
        this.pyramidManager = pyramidManager;
        this.physicsManager = physicsManager;
        this.binsManager = binsManager;
        this.pathManager = pathManager;
        this.uiManager = uiManager;

        this.score = 0;
        this.betAmount = 10;
        this.ballCost = config.ballCost || 10;
        this.gameState = 'idle';
        this.lastBallId = 0;

        this.lastResult = {
            binIndex: -1,
            multiplier: 0,
            win: 0,
        };

        this.gameHistory = [];
        this.eventListeners = [];
        this.processedBalls = new Set();
    }

    initialize() {
        const afterUpdateHandler = () => {
            this.physicsManager.checkBallsOutOfBounds();
            this.checkBallsInBins();
        };

        Events.on(this.engine, 'afterUpdate', afterUpdateHandler);
        this.eventListeners.push({ event: 'afterUpdate', handler: afterUpdateHandler });

        this.physicsManager.onBallInBin = (ballId, binIndex) => {
            this.processBallInBin(ballId, binIndex);
        };
    }

    placeBet(amount = this.betAmount, ballCount = config.defaultBallCount, targetBinIndex = null) {
        // Удаляем проверку на состояние игры, чтобы можно было делать ставку в любой момент
        // if (this.gameState === 'playing') {
        //     return false;
        // }

        this.betAmount = amount;
        this.gameState = 'playing';

        // Удаляем логику уменьшения баланса отсюда, так как она теперь
        // реализована в UIManager.setupBetButton
        // if (this.uiManager) {
        //     const betCost = this.uiManager.ballCost * ballCount;
        //     this.uiManager.balance -= betCost;
        //     this.uiManager.updateBalanceDisplay();
        //     console.log(`Сделана ставка: ${betCost} (${ballCount} шариков по ${this.uiManager.ballCost})`);
        //     console.log(`Новый баланс: ${this.uiManager.balance}`);
        // }

        // Новые шарики будут отслеживаться, а старые продолжат падать
        this.lastBallId = this.physicsManager.currentBallId; // Сохраняем текущий ID шарика

        this.lastResult = {
            binIndex: -1,
            multiplier: 0,
            win: 0,
        };

        this.game.placeBet(ballCount, targetBinIndex);

        this.triggerEvent('betPlaced', {
            amount: this.betAmount,
            ballCount: ballCount,
            targetBinIndex: targetBinIndex
        });

        return true;
    }

    checkBallsInBins() {
        const activeBallsCount = this.physicsManager.getActiveBallsCount();

        // Меняем условие: теперь игра не переходит в состояние "finished",
        // даже если нет активных шариков, потому что мы позволяем делать новую ставку
        // пока старые шарики все еще в игре.
        // console.log("✅ Проверка на модалку (checkBallsInBins)", this.gameState, activeBallsCount);
        if (activeBallsCount === 0 && this.gameState !== 'finished') {
            this.gameState = 'finished';

            this.triggerEvent('gameFinished', {
                result: this.lastResult,
                history: this.gameHistory
            });

            console.log("Перед проверкой на модалку");
            if (this.uiManager) {
                const wins = this.uiManager.winsAmount;
                const target = config.targetWins || 0;

                // Обновленная логика: показываем модалку только если:
                // 1. Достигнут целевой выигрыш
                // 2. Нет активных шаров
                // 3. Больше нет шаров для броска
                const noMoreThrows = this.uiManager.throwsLeft <= 0;

                console.log("🎯 Финальная проверка показа модалки:", {
                    wins,
                    target,
                    throwsLeft: this.uiManager.throwsLeft,
                    activeBalls: activeBallsCount,
                    noMoreThrows
                });

                if (noMoreThrows) {
                    setTimeout(() => {
                        console.log("✅ Старт модального окна (проверка в checkBallsInBins)");
                        this.uiManager.showWinModal(wins);
                    }, 500);
                }
            }
        }
    }
    processBallInBin(ballId, binIndex) {
        if (this.processedBalls.has(ballId)) {
            return;
        }

        this.processedBalls.add(ballId);

        const multiplier = this.binsManager.getMultiplier(binIndex);

        if (this.uiManager) {
            // Новая логика: выигрыш = просто значение из лунки
            const win = multiplier;

            // Добавляем выигрыш к сумме выигрышей, а не к балансу напрямую
            this.uiManager.addWin(win);

            console.log(`Шарик ${ballId} попал в лунку ${binIndex} со значением ${multiplier}.`);
            console.log(`Выигрыш: $${win}`);
        }

        this.lastResult = {
            binIndex: binIndex,
            multiplier: multiplier,
            win: this.ballCost * multiplier
        };

        this.binsManager.animateBlockFlash(binIndex);

        if (this.uiManager) {
            this.gameHistory.push({
                time: new Date(),
                binIndex: binIndex,
                multiplier: multiplier,
                win: this.lastResult.win,
                betAmount: this.betAmount,
                ballId: ballId  // Добавляем ID шарика для отслеживания
            });
        }

        if (this.gameHistory.length > 50) {
            this.gameHistory.shift();
        }

        this.triggerEvent('ballInBin', {
            ballId: ballId,
            binIndex: binIndex,
            multiplier: multiplier,
            win: this.lastResult.win
        });
    }

    resetGame(clearBalls = true) {
        // Очищаем шарики только если параметр clearBalls равен true
        if (clearBalls) {
            this.physicsManager.clearBalls();
        }

        this.gameState = 'idle';
        this.score = 0;
        this.lastResult = {
            binIndex: -1,
            multiplier: 0,
            win: 0,
        };

        // Не очищаем обработанные шарики при resetGame(false)
        if (clearBalls) {
            this.processedBalls.clear();
        }

        this.triggerEvent('gameReset', {
            clearBalls: clearBalls
        });
    }

    setBetAmount(amount) {
        this.betAmount = amount;
    }

    on(eventName, callback) {
        if (!this.events) {
            this.events = {};
        }

        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        this.events[eventName].push(callback);
    }

    off(eventName, callback) {
        if (!this.events || !this.events[eventName]) {
            return;
        }

        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    triggerEvent(eventName, data) {
        if (!this.events || !this.events[eventName]) {
            return;
        }

        this.events[eventName].forEach(callback => {
            callback(data);
        });
    }

    cleanup() {
        this.eventListeners.forEach(({ event, handler }) => {
            Events.off(this.engine, event, handler);
        });

        this.eventListeners = [];
        this.events = {};
    }

    getGameState() {
        return {
            state: this.gameState,
            score: this.score,
            betAmount: this.betAmount,
            lastResult: this.lastResult,
            history: this.gameHistory
        };
    }
}

export default GameLogic;
