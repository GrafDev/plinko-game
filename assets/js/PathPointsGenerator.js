import { config } from './config.js';

export default class PathPointsGenerator {
    static generateStartPoints(pyramidManager) {
        const startPoints = [];

        const pyramidInfo = pyramidManager.getPyramidInfo();

        if (!pyramidInfo || !pyramidInfo.topRow || pyramidInfo.topRow.length < 3) {
            console.error('Недостаточно гвоздиков в верхнем ряду для создания точек старта');
            return startPoints;
        }

        const startY = pyramidInfo.topRowY - config.ballRadius * 4;

        startPoints.push({
            x: (pyramidInfo.topRow[0] + pyramidInfo.topRow[1]) / 2,
            y: startY,
            number: 'S1'
        });

        startPoints.push({
            x: (pyramidInfo.topRow[1] + pyramidInfo.topRow[2]) / 2,
            y: startY,
            number: 'S2'
        });

        console.log('Созданы точки старта:', startPoints);
        return startPoints;
    }

    static generatePathPointsFromPegs(pyramidManager, basePathPointOffsetY) {
        const pathPoints = [];

        const pegs = pyramidManager.pegs;

        if (!pegs || pegs.length === 0) {
            console.error('Нет гвоздиков для создания точек пути');
            return pathPoints;
        }

        const dynamicOffset = (config.pegRadius/2 + config.ballRadius) ;

        console.log(`Динамическое смещение точек: ${dynamicOffset} (pegRadius=${config.pegRadius}, ballRadius=${config.ballRadius})`);

        const pegsByRow = {};

        for (const peg of pegs) {
            const rowMatch = peg.label.match(/peg_(\d+)_/);

            if (rowMatch && rowMatch[1] !== undefined) {
                const rowNumber = parseInt(rowMatch[1]);

                if (!pegsByRow[rowNumber]) {
                    pegsByRow[rowNumber] = [];
                }

                pegsByRow[rowNumber].push(peg);
            }
        }

        const sortedRows = Object.keys(pegsByRow).sort((a, b) => parseInt(a) - parseInt(b));

        for (let rowIdx = 0; rowIdx < sortedRows.length; rowIdx++) {
            const rowNumber = sortedRows[rowIdx];
            const rowPegs = pegsByRow[rowNumber];

            rowPegs.sort((a, b) => {
                const colA = parseInt(a.label.split('_')[2]);
                const colB = parseInt(b.label.split('_')[2]);
                return colA - colB;
            });

            const rowPoints = [];

            for (let colIdx = 0; colIdx < rowPegs.length; colIdx++) {
                const peg = rowPegs[colIdx];
                const pointNumber = `${rowIdx+1}-${colIdx+1}`;

                rowPoints.push({
                    x: peg.position.x,
                    y: peg.position.y - dynamicOffset,
                    pegLabel: peg.label,
                    number: pointNumber
                });
            }

            pathPoints.push(rowPoints);
        }

        console.log(`Создано ${pathPoints.length} рядов точек пути`);
        return pathPoints;
    }

    static generateEndPoints(pyramidManager) {
        const endPoints = [];

        const lastRowInfo = pyramidManager.getLastRowInfo();

        if (!lastRowInfo || !lastRowInfo.positions || lastRowInfo.positions.length === 0) {
            console.error('Нет информации о последнем ряде гвоздиков');
            return endPoints;
        }

        const binCount = lastRowInfo.pegCount - 1;

        const binInnerY = lastRowInfo.depth + config.binDistanceFromLastRow + config.binHeight / 2;

        for (let i = 0; i < binCount; i++) {
            const leftX = lastRowInfo.positions[i];
            const rightX = lastRowInfo.positions[i + 1];
            const centerX = (leftX + rightX) / 2;

            endPoints.push({
                x: centerX,
                y: binInnerY,
                binIndex: i,
                number: `E${i+1}`
            });
        }

        console.log(`Создано ${endPoints.length} конечных точек`);
        return endPoints;
    }
}
