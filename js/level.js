const TILE_SIZE = 40;
const MAP_COLS = 20;
const MAP_ROWS = 15;

// Типы тайлов
const TILE = {
    GROUND: 0,
    WALL: 1,
    WATER: 2,
    SPAWN: 3,
    GOAL: 4,
};

// Цвета тайлов
const TILE_COLORS = {
    [TILE.GROUND]: '#a0a070', // Земля
    [TILE.WALL]: '#606060',   // Стена
    [TILE.WATER]: '#4040ff',   // Вода
    [TILE.SPAWN]: '#ffdd00',  // Место появления (временный цвет)
    [TILE.GOAL]: '#00ff00',    // Цель (ярко-зеленый)
};

let currentLevelData = null;

// Функция проверки проходимости с помощью BFS
function isPathPossible(map, startTile, endTile) {
    const queue = [startTile];
    const visited = new Set([`${startTile.x},${startTile.y}`]);
    const directions = [
        { x: 0, y: -1 }, // Up
        { x: 0, y: 1 },  // Down
        { x: -1, y: 0 }, // Left
        { x: 1, y: 0 }   // Right
    ];

    while (queue.length > 0) {
        const current = queue.shift();

        // Цель достигнута?
        if (current.x === endTile.x && current.y === endTile.y) {
            return true;
        }

        // Исследуем соседей
        for (const dir of directions) {
            const nextX = current.x + dir.x;
            const nextY = current.y + dir.y;
            const nextKey = `${nextX},${nextY}`;

            // Проверка границ и посещенных клеток
            if (nextX >= 0 && nextX < MAP_COLS &&
                nextY >= 0 && nextY < MAP_ROWS &&
                !visited.has(nextKey)) {

                // Проверка на стену
                if (map[nextY][nextX] !== TILE.WALL) {
                    visited.add(nextKey);
                    queue.push({ x: nextX, y: nextY });
                }
            }
        }
    }

    // Очередь пуста, цель не найдена
    return false;
}

// Функция генерации карты для уровня
function generateMap(levelIndex) {
    let map, playerStart, goalPos;
    let attempts = 0;
    const maxAttempts = 20; // Ограничение попыток генерации

    do {
        map = [];
        for (let r = 0; r < MAP_ROWS; r++) {
            map[r] = [];
            for (let c = 0; c < MAP_COLS; c++) {
                if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
                    map[r][c] = TILE.WALL;
                } else {
                    map[r][c] = TILE.GROUND;
                }
            }
        }

        const wallDensity = 0.15 + Math.min(levelIndex * 0.002, 0.15);
        for (let r = 1; r < MAP_ROWS - 1; r++) {
            for (let c = 1; c < MAP_COLS - 1; c++) {
                if (Math.random() < wallDensity) {
                    map[r][c] = TILE.WALL;
                }
            }
        }

        const waterPatches = 3 + Math.floor(Math.random() * 3);
        const waterPatchSize = 3;
        for (let i = 0; i < waterPatches; i++) {
            const startR = Math.floor(Math.random() * (MAP_ROWS - waterPatchSize - 2)) + 1;
            const startC = Math.floor(Math.random() * (MAP_COLS - waterPatchSize - 2)) + 1;
            for (let r = startR; r < startR + waterPatchSize; r++) {
                for (let c = startC; c < startC + waterPatchSize; c++) {
                    if (map[r] && map[r][c] !== undefined && Math.random() < 0.6) {
                         map[r][c] = TILE.WATER;
                    }
                }
            }
        }

        playerStart = { x: 1, y: MAP_ROWS - 2 };
        goalPos = { x: MAP_COLS - 2, y: 1 };

        map[playerStart.y][playerStart.x] = TILE.GROUND;
        map[goalPos.y][goalPos.x] = TILE.GROUND;
        for(let dy = -1; dy <= 1; dy++) {
            for(let dx = -1; dx <= 1; dx++) {
                if (map[playerStart.y + dy] && map[playerStart.y + dy][playerStart.x + dx] !== undefined) {
                    if(map[playerStart.y + dy][playerStart.x + dx] !== TILE.WALL) map[playerStart.y + dy][playerStart.x + dx] = TILE.GROUND;
                }
                if (map[goalPos.y + dy] && map[goalPos.y + dy][goalPos.x + dx] !== undefined) {
                     if(map[goalPos.y + dy][goalPos.x + dx] !== TILE.WALL) map[goalPos.y + dy][goalPos.x + dx] = TILE.GROUND;
                }
            }
        }

        attempts++;
        if (attempts >= maxAttempts) {
            console.warn(`Не удалось сгенерировать проходимую карту за ${maxAttempts} попыток для уровня ${levelIndex}. Используется последняя попытка.`);
            break; // Выходим, даже если карта непроходима, чтобы избежать зависания
        }

    } while (!isPathPossible(map, playerStart, goalPos)); // Повторяем, пока путь не будет найден

    console.log(`Карта для уровня ${levelIndex} сгенерирована за ${attempts} попыток.`);
    return { map, playerStart, goalPos };
}

// Находит случайные проходимые точки для спавна
function findValidSpawnPoints(map, count, playerStartX, playerStartY, goalX, goalY) {
    const validSpawns = [];
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            // Клетка должна быть проходимой (земля)
            if (map[r][c] === TILE.GROUND) {
                 // Не слишком близко к старту игрока и цели
                const distToPlayer = Math.abs(c - playerStartX) + Math.abs(r - playerStartY);
                const distToGoal = Math.abs(c - goalX) + Math.abs(r - goalY);
                if (distToPlayer > 5 && distToGoal > 3) { // > 5 от игрока, > 3 от цели
                    validSpawns.push({ x: c, y: r });
                }
            }
        }
    }

    // Перемешиваем массив и берем нужное количество
    validSpawns.sort(() => 0.5 - Math.random());
    return validSpawns.slice(0, count);
}

function loadLevel(levelIndex) {
    // Генерируем карту и позиции
    const layout = generateMap(levelIndex);

    // Рассчитываем количество врагов
    const numEnemies = Math.min(5 + levelIndex, 30); // 5 врагов на 1м уровне, +1 за уровень, максимум 30

    // Генерируем точки спавна врагов
    const enemySpawns = findValidSpawnPoints(
        layout.map,
        numEnemies,
        layout.playerStart.x,
        layout.playerStart.y,
        layout.goalPos.x,
        layout.goalPos.y
    );

    // Сохраняем данные текущего уровня
    currentLevelData = {
        map: layout.map,
        playerStart: layout.playerStart,
        goalPos: layout.goalPos,
        enemySpawns: enemySpawns,
        levelIndex: levelIndex // Сохраним индекс для передачи врагам
    };

    // Обновляем отображение номера уровня
    document.getElementById('current-level').textContent = levelIndex + 1;
    console.log(`Загружен уровень ${levelIndex + 1}, врагов: ${numEnemies}`);
    return true; // Всегда возвращаем true, т.к. уровни генерируются
}

function drawLevel(ctx) {
    if (!currentLevelData) return;

    for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
            let tileType = currentLevelData.map[row][col];

            // Отображаем цель на ее позиции
            if (currentLevelData.goalPos && col === currentLevelData.goalPos.x && row === currentLevelData.goalPos.y) {
                tileType = TILE.GOAL;
            }
            // Отображаем старт игрока (для отладки)
            // if (currentLevelData.playerStart && col === currentLevelData.playerStart.x && row === currentLevelData.playerStart.y) {
            //     tileType = TILE.SPAWN;
            // }

            const tileColor = TILE_COLORS[tileType] || TILE_COLORS[TILE.GROUND];
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;

            ctx.fillStyle = tileColor;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            if (tileType === TILE.WALL) {
                ctx.strokeStyle = '#404040';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

// Функция для получения типа тайла по мировым координатам
function getTileTypeAt(worldX, worldY) {
    if (!currentLevelData) return TILE.WALL; // Считаем стеной, если карта не загружена

    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    // Проверка выхода за пределы карты
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) {
        return TILE.WALL; // Считаем стеной
    }

    return currentLevelData.map[row][col];
}

// Функция для проверки столкновения с непроходимым тайлом
function isCollision(worldX, worldY) {
    const tileType = getTileTypeAt(worldX, worldY);
    // Препятствием являются ТОЛЬКО стены
    // GOAL и WATER не являются препятствиями
    return tileType === TILE.WALL;
}

function getPlayerStartPosition() {
    if (currentLevelData && currentLevelData.playerStart) {
        return {
            x: (currentLevelData.playerStart.x + 0.5) * TILE_SIZE,
            y: (currentLevelData.playerStart.y + 0.5) * TILE_SIZE
        };
    }
    // Возвращаем позицию по умолчанию, если не найдена
    return { x: TILE_SIZE * 1.5, y: TILE_SIZE * 9.5 };
} 