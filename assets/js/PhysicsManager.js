import Matter from 'matter-js';
import { config } from './config.js';

const { Bodies, World, Body, Events } = Matter;

class PhysicsManager {
    constructor(gameInstance, engineWorld, pyramidManager, pathManager) {
        this.game = gameInstance;
        this.world = engineWorld;
        this.pyramidManager = pyramidManager;
        this.pathManager = pathManager;
        this.balls = [];
        this.currentBallId = 0;

        this.ballPaths = new Map();
        this.ballStates = new Map();
        this.ballTrails = new Map();

        this.boundUpdateBalls = this.updateBalls.bind(this);

        this.ballSpeed = config.ballMovementSpeed || 3;

        // Используем диаметр шарика, умноженный на коэффициент отскока
        const bounceFactor = config.bounceFactor || 3;
        this.bounceHeight = config.ballRadius * 2 * bounceFactor;

        console.log(`Инициализирован PhysicsManager с высотой отскока: ${this.bounceHeight}px (диаметр шарика × ${bounceFactor})`);
    }

    initialize() {
        Events.on(this.game.engine, 'afterUpdate', this.boundUpdateBalls);
    }

    createBall(path) {
        if (!path || path.length === 0) {
            console.error('Невозможно создать шарик: путь пустой');
            return null;
        }

        const startPoint = path[0];
        const ballId = `ball_${this.currentBallId++}`;

        // console.log(`Создаем шарик в позиции: x=${startPoint.x}, y=${startPoint.y}`);

        const ball = Bodies.circle(startPoint.x, startPoint.y, config.ballRadius, {
            isStatic: true,
            angle: 0,
            render: {
                fillStyle: config.colors.ball,
                strokeStyle: config.colors.ballOutline,
                lineWidth: 1,
                shadowColor: 'rgba(0,0,0,0.4)',
                shadowBlur: 5,
                shadowOffsetX: 2,
                shadowOffsetY: 2,
                sprite: {
                    texture: null,
                    xScale: 1,
                    yScale: 1
                }
            },
            label: ballId,
            collisionFilter: {
                category: 0x0001,
                mask: 0x0000
            }
        });

        this.balls.push(ball);
        World.add(this.world, ball);

        this.ballPaths.set(ball.id, path);
        this.ballStates.set(ball.id, {
            currentPathIndex: 0,
            isMoving: true,
            targetPoint: path[1] || null,
            progress: 0,
            controlPoint: null,
            isExtraBouncing: false,
            extraBounceProgress: 0,
            extraBounceHeight: 0,
            extraBounceStartY: 0,
            waitingAfterExtraBounce: false
        });

        // if (config.showBallTrail) {
        //     this.createTrail(ball.id);
        // }

        return ball;
    }

    createTrail(ballId) {
    }

    createBallsWithDelay(paths) {
        if (!paths || paths.length === 0) return;

        const baseDelay = config.ballDropDelay || 150;
        const variancePercent = 0.4; // Увеличиваем до 40% для более заметного эффекта

        let cumulativeDelay = 0; // Кумулятивная задержка для каждого шарика

        // Создаем первый шарик сразу
        const firstPath = paths[0];
        this.createBall(firstPath);
        // console.log(`Создан шарик 1 из ${paths.length}`);

        // Создаем остальные шарики с различными задержками
        for (let i = 1; i < paths.length; i++) {
            ((index) => {
                // Рассчитываем случайную задержку для этого шарика
                const randomFactor = 1 - variancePercent + Math.random() * (variancePercent * 2);
                const thisDelay = Math.floor(baseDelay * randomFactor);

                // Добавляем к общей задержке
                cumulativeDelay += thisDelay;

                setTimeout(() => {
                    const path = paths[index];
                    this.createBall(path);
                    // console.log(`Создан шарик ${index+1} из ${paths.length} с задержкой ${thisDelay}мс`);
                }, cumulativeDelay);
            })(i);
        }
    }

    createBalls(count) {
        console.log(`Создаем ${count} шариков`);

        const targetBins = Array.isArray(config.targetBins) ? config.targetBins : [];

        if (targetBins.length > 0) {
            console.log(`Используем массив целевых лунок: ${targetBins.join(', ')}`);

            const targetBallsCount = Math.min(count, targetBins.length);
            const remainingBalls = count - targetBallsCount;

            // Создаем массив путей для всех шариков
            const paths = [];

            // Сначала добавляем пути с целевыми лунками
            for (let i = 0; i < targetBallsCount; i++) {
                const path = this.pathManager.generatePath(targetBins[i]);
                paths.push(path);
                console.log(`Подготовлен путь для шарика ${i+1} с целью в лунку ${targetBins[i]}`);
            }

            // Затем добавляем пути со случайными траекториями
            for (let i = 0; i < remainingBalls; i++) {
                const path = this.pathManager.generatePath(null);
                paths.push(path);
                console.log(`Подготовлен путь для шарика ${targetBallsCount+i+1} со случайной траекторией`);
            }

            // Создаем шарики с задержкой
            this.createBallsWithDelay(paths);
        } else {
            console.log(`Массив целевых лунок пуст, используем случайные цели`);

            const paths = [];
            for (let i = 0; i < count; i++) {
                const path = this.pathManager.generatePath(null);
                paths.push(path);
            }

            // Создаем шарики с задержкой
            this.createBallsWithDelay(paths);
        }
    }

    calculateBezierPoint(start, end, control, t) {
        if (!start || !end || !control) {
            console.error('Ошибка: одна из точек не определена в calculateBezierPoint', { start, end, control });
            return start || end || { x: 0, y: 0 };
        }

        const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
        const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
        return { x, y };
    }

    calculateControlPoint(current, target) {
        if (!current || !target) {
            console.error('Ошибка: точки не определены в calculateControlPoint', { current, target });
            return { x: 0, y: 0 };
        }

        if (current.number && (current.number === 'S1' || current.number === 'S2')) {
            return {
                x: (current.x + target.x) / 2,
                y: current.y + (target.y - current.y) * 0.3
            };
        }

        if (target.isReturnPoint) {
            // Используем диаметр шарика, умноженный на коэффициент отскока
            const bounceFactor = config.bounceFactor || 3;
            const ballDiameter = config.ballRadius * 2;
            const baseHeight = ballDiameter * bounceFactor;

            // Применяем фиксированный множитель для дополнительного отскока
            const extraMultiplier = config.extraBounceHeightMultiplier || 0.5;

            // Вместо случайного множителя используем фиксированное значение
            const fixedFactor = config.extraBounceFactor || 0.7;

            // Вычисляем высоту дополнительного отскока с фиксированным множителем
            const bounceHeight = baseHeight * extraMultiplier * fixedFactor;

            // console.log(`Дополнительный подскок: высота=${bounceHeight.toFixed(2)}, множители: bounceFactor=${bounceFactor}, extra=${extraMultiplier}, fixed=${fixedFactor}`);

            return {
                x: current.x,
                y: current.y - bounceHeight
            };
        }

        const midX = (current.x + target.x) / 2;

        // Используем диаметр шарика, умноженный на коэффициент отскока
        const bounceFactor = config.bounceFactor || 3;
        const ballDiameter = config.ballRadius * 2;
        const bounceHeightRatio = config.bounceHeightRatio || 1;
        const bounceHeight = ballDiameter * bounceFactor * bounceHeightRatio;

        const yDistance = Math.abs(target.y - current.y);
        const maxBounceHeight = yDistance * 0.7;
        const actualBounceHeight = Math.min(bounceHeight, maxBounceHeight);
        const minY = Math.min(current.y, target.y);

        return {
            x: midX,
            y: minY - actualBounceHeight
        };
    }

    updateBalls() {
        for (const ball of this.balls) {
            const state = this.ballStates.get(ball.id);
            const path = this.ballPaths.get(ball.id);

            if (!state || !path || !state.isMoving) continue;

            const currentPoint = path[state.currentPathIndex];

            if (!state.targetPoint && state.currentPathIndex < path.length - 1) {
                state.targetPoint = path[state.currentPathIndex + 1];
                state.progress = 0;

                // Добавляем случайное отклонение скорости для каждого шарика
                if (!state.speedMultiplier) {
                    // Уникальный множитель скорости для этого шарика (от 0.8 до 1.2)
                    state.speedMultiplier = 0.8 + Math.random() * 0.4;
                    // console.log(`Шарик ${ball.id} имеет множитель скорости: ${state.speedMultiplier.toFixed(2)}`);
                }

                if (state.targetPoint.isReturnPoint) {
                    // console.log(`Обнаружена точка подскока: ${state.targetPoint.number}`);
                    state.isBouncing = true;

                    // Используем диаметр шарика, умноженный на коэффициент отскока
                    const bounceFactor = config.bounceFactor || 3;
                    const ballDiameter = config.ballRadius * 2;
                    const bounceHeightRatio = config.bounceHeightRatio || 1;
                    state.bounceHeight = ballDiameter * bounceFactor * bounceHeightRatio;

                    state.bounceStartPosition = { ...currentPoint };

                    // Сохраняем информацию о множителях дополнительного подскока из точки
                    if (state.targetPoint.extraBounceInfo) {
                        state.extraBounceInfo = state.targetPoint.extraBounceInfo;
                    }
                } else {
                    state.controlPoint = this.calculateControlPoint(currentPoint, state.targetPoint);
                    state.isBouncing = false;
                }
            }

            if (state.targetPoint) {
                if (state.isBouncing) {
                    const verticalSpacing = config.verticalSpacing || 60;
                    const standardDistance = verticalSpacing;
                    // Применяем множитель скорости
                    state.progress += (this.ballSpeed * (state.speedMultiplier || 1)) / standardDistance;
                } else {
                    const dx = state.targetPoint.x - currentPoint.x;
                    const dy = state.targetPoint.y - currentPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const isStartPoint = currentPoint.number && (currentPoint.number === 'S1' || currentPoint.number === 'S2');
                    const speedMultiplier = isStartPoint ? 1.8 : 1.0;

                    // Применяем множитель скорости
                    state.progress += (this.ballSpeed * speedMultiplier * (state.speedMultiplier || 1)) / Math.max(distance, 10);
                }

                if (state.progress >= 1) {
                    Body.setPosition(ball, {
                        x: state.targetPoint.x,
                        y: state.targetPoint.y
                    });

                    if (ball.marker) {
                        Body.setPosition(ball.marker, {
                            x: state.targetPoint.x,
                            y: state.targetPoint.y
                        });
                    }

                    state.currentPathIndex++;

                    if (state.currentPathIndex < path.length - 1) {
                        const currentPoint = path[state.currentPathIndex];
                        if (currentPoint && currentPoint.pegLabel) {
                            this.pyramidManager.animatePegFlash(currentPoint.pegLabel);
                        }

                        state.targetPoint = null;
                        state.progress = 0;
                        state.isBouncing = false;
                        // Сбрасываем множитель дополнительного подскока при переходе к новой точке
                        state.extraBounceMultiplier = null;
                    }
                    else if (state.currentPathIndex === path.length - 1) {
                        state.targetPoint = null;
                        state.isMoving = false;

                        const lastPoint = path[state.currentPathIndex];
                        const binIndex = lastPoint.binIndex;

                        if (binIndex !== undefined) {
                            // console.log(`Шарик ${ball.id} попал в лунку ${binIndex}`);

                            if (this.binsManager) {
                                this.binsManager.animateBlockFlash(binIndex);
                            }

                            if (typeof this.onBallInBin === 'function') {
                                this.onBallInBin(ball.id, binIndex);
                            }
                        }

                        setTimeout(() => {
                            this.removeBall(ball.id);
                        }, 0);
                    }
                }
                else {
                    let newPosition;

                    if (state.isBouncing) {
                        const t = state.progress;

                        // Если точка является точкой дополнительного подскока, используем специальные параметры
                        if (state.targetPoint && state.targetPoint.isReturnPoint) {
                            // Используем те же параметры, что и в calculateControlPoint
                            const extraMultiplier = config.extraBounceHeightMultiplier || 0.5;

                            // Используем фиксированный множитель вместо случайного
                            const fixedFactor = config.extraBounceFactor || 0.7;

                            // Если множитель еще не вычислен для этого подскока, устанавливаем фиксированное значение
                            if (!state.extraBounceMultiplier) {
                                state.extraBounceMultiplier = extraMultiplier * fixedFactor;
                                // console.log(`Шарик ${ball.id} подскок с фиксированным множителем: ${state.extraBounceMultiplier.toFixed(3)}`);
                            }

                            // Применяем множитель для высоты подскока
                            newPosition = {
                                x: currentPoint.x,
                                y: currentPoint.y - state.bounceHeight * state.extraBounceMultiplier * 4 * t * (1 - t)
                            };
                        } else {
                            // Стандартный подскок без специальных параметров
                            newPosition = {
                                x: currentPoint.x,
                                y: currentPoint.y - state.bounceHeight * 4 * t * (1 - t)
                            };
                        }

                        if (Math.random() < 0.05) {
                            const heightMultiplier = state.extraBounceMultiplier || 1;
                            const actualHeight = state.bounceHeight * heightMultiplier * 4 * t * (1 - t);
                            // console.log(`Подскок: t=${t.toFixed(2)}, высота=${actualHeight.toFixed(2)}, фикс. множитель=${heightMultiplier.toFixed(3)}`);
                        }
                    }
                    else {
                        if (!state.controlPoint) {
                            state.controlPoint = this.calculateControlPoint(currentPoint, state.targetPoint);
                        }

                        newPosition = this.calculateBezierPoint(
                            currentPoint,
                            state.targetPoint,
                            state.controlPoint,
                            state.progress
                        );
                    }

                    const dx = newPosition.x - ball.position.x;
                    const dy = newPosition.y - ball.position.y;
                    const speed = Math.sqrt(dx * dx + dy * dy);

                    const ballLabel = ball.label || '';
                    const lastChar = ballLabel.charAt(ballLabel.length - 1) || '0';
                    const charCode = lastChar.charCodeAt(0) || 0;
                    const rotationDirection = charCode % 2 === 0 ? 1 : -1;
                    const rotationAmount = 0.05 * speed * rotationDirection;

                    Body.setAngle(ball, ball.angle + rotationAmount);
                    Body.setPosition(ball, newPosition);

                    if (ball.marker) {
                        const markerOffsetDistance = config.ballRadius * 0.5;
                        const markerOffsetX = Math.cos(ball.angle) * markerOffsetDistance;
                        const markerOffsetY = Math.sin(ball.angle) * markerOffsetDistance;

                        Body.setPosition(ball.marker, {
                            x: newPosition.x + markerOffsetX,
                            y: newPosition.y + markerOffsetY
                        });
                    }

                    // if (config.showBallTrail) {
                    //     this.updateTrail(ball.id, newPosition);
                    // }
                }
            }
        }
    }

    updateTrail(ballId, position) {
    }

    removeBall(ballId) {
        const ball = this.balls.find(b => b.id === ballId);

        if (ball) {
            if (ball.marker) {
                World.remove(this.world, ball.marker);
            }

            World.remove(this.world, ball);
            this.ballPaths.delete(ballId);
            this.ballStates.delete(ballId);
            this.ballTrails.delete(ballId);
            this.balls = this.balls.filter(b => b.id !== ballId);
        }
    }

    clearBalls() {
        for (const ball of this.balls) {
            if (ball.marker) {
                World.remove(this.world, ball.marker);
            }
            World.remove(this.world, ball);
        }
        this.balls = [];
        this.ballPaths.clear();
        this.ballStates.clear();
        this.ballTrails.clear();
    }

    checkBallsOutOfBounds() {
        const ballsToRemove = [];

        for (const ball of this.balls) {
            if (ball.position.y > this.game.height + 100) {
                ballsToRemove.push(ball);
            }
        }

        for (const ball of ballsToRemove) {
            this.removeBall(ball.id);
        }
    }

    getActiveBallsCount() {
        return this.balls.length;
    }

    setBinsManager(binsManager) {
        this.binsManager = binsManager;
    }

    updateDimensions() {
        // Обновляем высоту отскока при изменении размеров
        const bounceFactor = config.bounceFactor || 3;
        this.bounceHeight = config.ballRadius * 2 * bounceFactor;
        this.ballSpeed = config.ballMovementSpeed || 3;
        console.log(`Обновлен PhysicsManager с высотой отскока: ${this.bounceHeight}px (диаметр шарика × ${bounceFactor}) и скоростью: ${this.ballSpeed}`);
    }

    cleanup() {
        Events.off(this.game.engine, 'afterUpdate', this.boundUpdateBalls);
        this.clearBalls();
    }
}

export default PhysicsManager;
