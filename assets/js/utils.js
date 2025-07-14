/**
 * Рассчитывает множитель выигрыша для корзины
 * @param {number} binIndex - Индекс корзины
 * @param {number} totalBins - Общее количество корзин
 * @returns {number} - Множитель выигрыша
 */
function calculateMultiplier(binIndex, totalBins) {
    // В центре самые низкие множители, по краям высокие
    const middle = (totalBins - 1) / 2;
    const distance = Math.abs(binIndex - middle);

    // Нормализуем расстояние относительно общего количества корзин
    const normalizedDistance = distance / middle;

    // Экспоненциальное увеличение множителя от центра к краям
    // Используем формулу: 1 + 15 * (нормализованное расстояние)^2
    const multiplier = 1 + Math.floor(15 * normalizedDistance * normalizedDistance);

    return Math.max(1, multiplier);
}

export { calculateMultiplier };

