import Matter from 'matter-js';
import { config, updateSizesBasedOnRows } from './config.js';
import PyramidManager from './PyramidManager.js';
import BinsManager from './BinsManager.js';
import UIManager from './UIManager.js';
import PhysicsManager from './PhysicsManager.js';
import PathManager from './PathManager.js';
import PathRenderer from './PathRenderer.js';
import GameLogic from './GameLogic.js';

const { Engine, Render, World, Runner } = Matter;

class PlinkoGame {
    constructor(elementId) {
        this.containerId = elementId;
        this.container = document.getElementById(elementId);
        this.initialized = false;
        this.initAttempts = 0;
        this.maxInitAttempts = 5;
        this.ballPaths = {};

        if (document.readyState === 'complete') {
            this.safeInitialize();
        } else {
            window.addEventListener('load', () => this.safeInitialize());
        }

        this.setupEvents();
    }

    safeInitialize() {
        console.log(`🔄 Попытка инициализации #${this.initAttempts + 1}`);
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`❌ Контейнер ${this.containerId} не найден`);
            this.scheduleRetry();
            return;
        }

        const rect = this.container.getBoundingClientRect();
        if (rect.width <= 10 || rect.height <= 10) {
            console.warn(`⏳ Контейнер слишком мал (${rect.width}x${rect.height}), ждем...`);
            this.scheduleRetry();
            return;
        }

        this.setupMutationObserver();
        updateSizesBasedOnRows();
        this.updateContainerDimensions();
        this.initialize();
    }

    scheduleRetry() {
        this.initAttempts++;
        if (this.initAttempts >= this.maxInitAttempts) {
            console.error('💥 Превышено количество попыток инициализации');
            return;
        }

        const delay = 200 * this.initAttempts;
        console.log(`⏱️ Повторная попытка через ${delay} мс`);
        setTimeout(() => this.safeInitialize(), delay);
    }

    setupMutationObserver() {
        if (this.resizeObserver) return;
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.initialized) {
                    console.log('👁️ Обнаружено изменение размеров (ResizeObserver)');
                    this.handleResize();
                }
            });
            this.resizeObserver.observe(this.container);
        }
    }

    initialize() {
        console.log('🚀 Инициализация игры');
        this.updateContainerDimensions();

        if (this.width <= 0 || this.height <= 0) {
            console.error(`❌ Недопустимые размеры: ${this.width}x${this.height}`);
            this.scheduleRetry();
            return;
        }

        setTimeout(() => {
            try {
                this.setupEngine();
                this.setupRenderer();
                this.initializeManagers();
                this.initialized = true;
                console.log('✅ Игра инициализирована');
            } catch (error) {
                console.error('🛑 Ошибка инициализации:', error);
                this.scheduleRetry();
            }
        }, 50);
    }

    updateContainerDimensions() {
        const rect = this.container.getBoundingClientRect();
        const availableWidth = rect.width;
        const availableHeight = rect.height;
        
        // Отладка размеров родительских элементов
        const plinkoField = this.container.parentElement;
        const plinkoFieldRect = plinkoField.getBoundingClientRect();
        console.log(`🔍 Размеры .plinko-field: ${plinkoFieldRect.width}x${plinkoFieldRect.height}`);
        console.log(`🔍 Размеры #plinko-game: ${availableWidth}x${availableHeight}`);
        console.log(`🔍 Размеры экрана: ${window.innerWidth}x${window.innerHeight}`);

        if (availableWidth < 300 || availableHeight < 300) {
            console.warn("⚠️ Размеры слишком малы, пропуск обновления");
            return;
        }

        this.width = availableWidth;
        this.height = availableHeight;
        this.calculateOptimalDimensions();
        this.updateConfigBasedOnSize();

        console.log(`📐 Размеры контейнера: ${this.width}x${this.height}`);
    }

    calculateOptimalDimensions() {
        const basePegRadius = 5;
        const baseBallRadius = 7;

        const pegSize = basePegRadius * 2;
        const bottomOffset = config.binHeight + config.binDistanceFromLastRow + pegSize;
        const topOffset = baseBallRadius * 4;

        const availableHeight = this.height - topOffset - bottomOffset;
        const availableWidth = this.width - basePegRadius * 2.2;

        const gapCount = config.rows - 1;
        const lastRowPegCount = config.topPegs + config.rows - 1;

        const theoreticalWidth = lastRowPegCount * (pegSize * 1.2);
        const theoreticalHeight = gapCount * (pegSize * 1.5);

        const heightRatio = availableHeight / theoreticalHeight;
        const widthRatio = availableWidth / theoreticalWidth;

        const scaleFactor = Math.min(heightRatio, widthRatio);
        config.verticalSpacing = Math.max(15, Math.floor(scaleFactor * (pegSize * 1.5)));

        console.log(`📏 scaleFactor=${scaleFactor}, verticalSpacing=${config.verticalSpacing}`);
    }

    updateConfigBasedOnSize() {
        config.wallThickness = Math.max(10, Math.min(
            Math.floor(this.width * 0.02),
            Math.floor(this.height * 0.02)
        ));
    }

    setupEngine() {
        this.engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.001 } });
        this.engine.timing.timeScale = 1;
        this.engine.enableSleeping = false;

        this.runner = Runner.create();
        Runner.run(this.runner, this.engine);
    }

    setupRenderer() {
        this.render = Render.create({
            element: this.container,
            engine: this.engine,
            options: {
                width: this.width,
                height: this.height,
                wireframes: false,
                background: '#021927',
                pixelRatio: 1
            }
        });

        const canvas = this.render.canvas;
        console.log(`🎨 Размеры канваса: ${canvas.width}x${canvas.height}`);
        console.log(`🎨 Размеры this: ${this.width}x${this.height}`);
        console.log(`🎨 Размеры контейнера: ${this.container.offsetWidth}x${this.container.offsetHeight}`);
        
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.position = 'relative';
        canvas.style.zIndex = '1';

        Render.run(this.render);
    }

    initializeManagers() {
        this.pyramidManager = new PyramidManager(this, this.engine.world);
        this.binsManager = new BinsManager(this, this.engine.world);

        this.createWorld();

        this.pathManager = new PathManager(this, this.pyramidManager, this.binsManager);
        this.pathRenderer = new PathRenderer(this, this.engine.world, this.pathManager);
        this.pathRenderer.initialize();

        this.physicsManager = new PhysicsManager(this, this.engine.world, this.pyramidManager, this.pathManager);
        this.physicsManager.setBinsManager(this.binsManager);

        if (!this.uiManager) {
            this.uiManager = new UIManager(this);
            this.uiManager.initialize();
        } else {
            this.uiManager.updateBalanceDisplay();
        }

        this.gameLogic = new GameLogic(this, this.engine, this.pyramidManager, this.physicsManager, this.binsManager, this.pathManager, this.uiManager);

        this.pyramidManager.initialize();
        this.physicsManager.initialize();
        this.gameLogic.initialize();

        this.updateBinsContainer();
    }

    createWorld() {
        World.clear(this.engine.world);
        this.pyramidManager.createPyramid();
        this.binsManager.createBins();
    }

    updateBinsContainer() {
        const binsContainer = document.getElementById('bins-container');
        if (binsContainer) {
            binsContainer.style.height = `${config.binHeight}px`;
        }
    }

    setupEvents() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 500);
        });

        window.addEventListener('resize', () => {
            if (this.resizeTimer) clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.handleResize(), 250);
        });
    }

    handleOrientationChange() {
        console.log("🔁 Orientation changed");
        this.destroyGame();

        setTimeout(() => {
            console.log("📲 Пересоздание игры после смены ориентации");

            this.container = document.getElementById(this.containerId);
            updateSizesBasedOnRows(); // ⬅️ ВАЖНО: сначала
            this.updateContainerDimensions(); // ⬅️ потом

            this.initialized = false;
            this.initAttempts = 0;
            this.safeInitialize();
        }, 500);
    }

    handleResize() {
        if (!this.initialized) return;

        const oldWidth = this.width;
        const oldHeight = this.height;
        const oldSpacing = config.verticalSpacing;
        const newOrientation = this.width > this.height ? 'landscape' : 'portrait';
        const oldOrientation = oldWidth > oldHeight ? 'landscape' : 'portrait';

        updateSizesBasedOnRows(); // сначала
        this.updateContainerDimensions(); // потом

        // if (newOrientation === oldOrientation &&
        //     Math.abs(oldWidth - this.width) < 5 &&
        //     Math.abs(oldHeight - this.height) < 5) {
        //     console.log('↔️ Незначительное изменение и ориентация не изменилась — игнорируем');
        //     return;
        // }

        console.log(`📐 Resize: ${oldWidth}x${oldHeight} → ${this.width}x${this.height}`);
        console.log(`Spacing: ${oldSpacing} → ${config.verticalSpacing}`);
        this.updateGame();
    }

    updateGame() {
        Render.stop(this.render);
        Runner.stop(this.runner);

        this.updateContainerDimensions();

        this.render.options.width = this.width;
        this.render.options.height = this.height;
        this.render.canvas.width = this.width;
        this.render.canvas.height = this.height;

        this.render.canvas.style.width = '100%';
        this.render.canvas.style.height = '100%';

        World.clear(this.engine.world);
        this.createWorld();

        this.pathManager?.updateDimensions();
        this.pathRenderer?.updateDimensions();
        this.physicsManager?.updateDimensions();
        this.uiManager?.updateBalanceDisplay();
        this.updateBinsContainer();

        Render.run(this.render);
        Runner.run(this.runner, this.engine);
    }

    placeBet(ballCount) {
        if (!ballCount) ballCount = this.uiManager.getBallCount();
        console.log(`🎯 Ставка: ${ballCount} шаров`);
        if (this.gameLogic) this.gameLogic.resetGame(false);
        this.physicsManager.createBalls(ballCount);
    }

    destroyGame() {
        this.runner && Runner.stop(this.runner);
        this.render && Render.stop(this.render);

        this.uiManager?.cleanup();
        this.physicsManager?.cleanup();
        this.pathManager?.cleanup();
        this.pathRenderer?.cleanup();
        this.pyramidManager?.cleanup();

        if (this.render?.canvas?.parentNode) {
            this.render.canvas.parentNode.removeChild(this.render.canvas);
        }

        this.resizeObserver?.disconnect();
        this.resizeObserver = null;

        this.engine = null;
        this.render = null;
        this.runner = null;
        this.pyramidManager = null;
        this.binsManager = null;
        this.pathManager = null;
        this.physicsManager = null;
        this.uiManager = null;
        this.pathRenderer = null;
        this.ballPaths = {};
        this.initialized = false;
    }

    cleanup() {
        this.destroyGame();
    }
}

export default PlinkoGame;
