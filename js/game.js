const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerTank;
let enemies = []; // Массив для врагов
let currentLevelIndex = 0;
let keys = {};

// Состояния игры
const GAME_STATE = {
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    GAME_WON: 'game_won'
};
let gameState = GAME_STATE.PLAYING;

// Ссылки на DOM элементы
let livesSpan;
let ammoSpan;
const skinButton = document.getElementById('skin-button');
const skinMenu = document.getElementById('skin-menu');
const skinPreviewsContainer = skinMenu.querySelector('.skin-previews');
const closeSkinMenuButton = document.getElementById('close-skin-menu');

// Функция для предзагрузки изображений
function preloadImages() {
    const promises = [];
    let loadedCount = 0;
    const totalImages = TANK_SKINS.length * 2; // body + turret для каждого скина

    console.log("Начинаю предзагрузку изображений...");
    const loadingIndicator = document.getElementById('loading') || document.createElement('div'); // Используем существующий или создаем новый
    if (!document.getElementById('loading')) {
        loadingIndicator.id = 'loading';
        loadingIndicator.style.position = 'fixed'; /* Используем fixed для перекрытия всего */
        loadingIndicator.style.top = '0';
        loadingIndicator.style.left = '0';
        loadingIndicator.style.width = '100%';
        loadingIndicator.style.height = '100%';
        loadingIndicator.style.backgroundColor = '#000';
        loadingIndicator.style.color = 'white';
        loadingIndicator.style.display = 'flex';
        loadingIndicator.style.justifyContent = 'center';
        loadingIndicator.style.alignItems = 'center';
        loadingIndicator.style.zIndex = '2000';
        document.body.appendChild(loadingIndicator);
    }
    loadingIndicator.textContent = `Загрузка изображений... (0/${totalImages})`;
    loadingIndicator.style.display = 'flex';


    TANK_SKINS.forEach(skin => {
        const paths = [skin.bodyImagePath, skin.turretImagePath];
        paths.forEach(path => {
            if (!loadedImages[path]) { // Загружаем только если еще не загружено
                const promise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        loadedImages[path] = img;
                        loadedCount++;
                        loadingIndicator.textContent = `Загрузка изображений... (${loadedCount}/${totalImages})`;
                        console.log(`Загружено: ${path}`);
                        resolve();
                    };
                    img.onerror = () => {
                        console.error(`Ошибка загрузки: ${path}`);
                        // Можно добавить заглушку или обработку ошибки
                        loadedCount++; // Считаем как загруженную, чтобы не блокировать
                        loadingIndicator.textContent = `Загрузка изображений... (${loadedCount}/${totalImages})`;
                        reject(`Ошибка загрузки: ${path}`);
                    };
                    img.src = path;
                });
                promises.push(promise);
            }
        });
    });

    // Возвращаем промис, который выполнится, когда все изображения загрузятся (или будет ошибка)
    return Promise.allSettled(promises).then(() => {
         console.log("Предзагрузка изображений завершена.");
         loadingIndicator.style.display = 'none'; // Скрываем индикатор
    });
}

function setupInputListeners() {
    window.addEventListener('keydown', (e) => {
        // Предотвращаем прокрутку страницы пробелом, если игра активна
        if (e.key === ' ' && gameState === GAME_STATE.PLAYING) {
            e.preventDefault();
        }
        keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Слушатели для меню скинов
    skinButton.addEventListener('click', () => {
        skinMenu.classList.toggle('hidden');
        populateSkinMenu(); // Обновляем превью при открытии
    });

    closeSkinMenuButton.addEventListener('click', () => {
        skinMenu.classList.add('hidden');
    });

    // Делегирование событий для кликов по превью скинов
    skinPreviewsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.skin-preview')) {
            const previewDiv = e.target.closest('.skin-preview');
            const skinId = parseInt(previewDiv.dataset.skinId);
            if (playerTank && !isNaN(skinId)) {
                playerTank.setSkin(skinId);
                skinMenu.classList.add('hidden');
            }
        }
    });

    // Language selector listeners
    const langRuButton = document.getElementById('lang-ru');
    const langDeButton = document.getElementById('lang-de');

    langRuButton.addEventListener('click', () => {
        langRuButton.classList.add('active');
        langDeButton.classList.remove('active');
        switchLanguage('ru');
        // Refresh DOM references after language switch
        refreshDOMReferences();
        // Preserve game state values after language switch
        updateGameStateDisplay();
    });

    langDeButton.addEventListener('click', () => {
        langDeButton.classList.add('active');
        langRuButton.classList.remove('active');
        switchLanguage('de');
        // Refresh DOM references after language switch
        refreshDOMReferences();
        // Preserve game state values after language switch
        updateGameStateDisplay();
    });

    window.inputListenersSetup = true; // Устанавливаем флаг
}

// Helper function to preserve game state values when language is switched
function updateGameStateDisplay() {
    // Make sure we have the latest references
    refreshDOMReferences();
    
    const currentLevel = document.getElementById('current-level');
    
    if (currentLevel) {
        currentLevel.textContent = (currentLevelIndex + 1).toString();
    }
    
    if (playerTank && livesSpan) {
        livesSpan.textContent = playerTank.lives.toString();
    }
    
    // Fix reload status display
    if (playerTank && ammoSpan) {
        if (playerTank.burstShotsFired >= playerTank.maxBurstShots && playerTank.fireCooldown > 0) {
            // During reload
            const reloadProgress = Math.floor((1 - playerTank.fireCooldown / playerTank.burstCooldown) * 100);
            ammoSpan.textContent = `${LANGUAGES[currentLanguage].reload} ${reloadProgress}%`;
            ammoSpan.style.color = '#ff8c00'; // Orange color for reload
        } else {
            // Show remaining shots
            const shotsLeft = playerTank.maxBurstShots - playerTank.burstShotsFired;
            ammoSpan.textContent = `${shotsLeft} / ${playerTank.maxBurstShots}`;
            ammoSpan.style.color = '#ddd'; // Standard color
        }
    }
}

function respawnPlayer() {
    const startPos = getPlayerStartPosition();
    playerTank.x = startPos.x;
    playerTank.y = startPos.y;
    playerTank.angle = -Math.PI / 2; // Сброс угла
    // Можно добавить временную неуязвимость, если нужно
}

function loadNextLevel() {
    currentLevelIndex++;
    // Проверяем, достиг ли игрок 100-го уровня (индекс 99)
    if (currentLevelIndex >= 100) {
        gameState = GAME_STATE.GAME_WON;
        console.log("Игра пройдена! Достигнут 100-й уровень.");
        return; // Выходим, чтобы не загружать следующий
    }

    // Загружаем следующий уровень (функция loadLevel теперь всегда возвращает true)
    loadLevel(currentLevelIndex);

    // Восстанавливаем жизни игрока
    if (playerTank) { // Убедимся, что танк существует
        playerTank.lives = 3;
        livesSpan.textContent = playerTank.lives; // Обновляем отображение
    }

    respawnPlayer(); // Перемещаем игрока на старт нового уровня
    // Создаем врагов для нового уровня
    enemies = [];
    if (currentLevelData.enemySpawns) {
        currentLevelData.enemySpawns.forEach(spawn => {
            const enemyX = (spawn.x + 0.5) * TILE_SIZE;
            const enemyY = (spawn.y + 0.5) * TILE_SIZE;
            enemies.push(new Enemy(enemyX, enemyY, currentLevelData.levelIndex));
        });
    }
    playerTank.bullets = []; // Очищаем пули
}

function startGame() {
    gameState = GAME_STATE.PLAYING;
    currentLevelIndex = 0;

    if (loadLevel(currentLevelIndex)) {
        const startPos = getPlayerStartPosition();
        if (!playerTank) {
            playerTank = new Tank(startPos.x, startPos.y);
            playerTank.loadCurrentSkinImages(); // <-- Загружаем изображения для скина по умолчанию СРАЗУ
        } else {
            // При рестарте обновляем позицию, жизни и т.д., но КЛЮЧЕВОЕ - вызываем loadCurrentSkinImages
            playerTank.x = startPos.x;
            playerTank.y = startPos.y;
            playerTank.lives = 3;
            playerTank.angle = -Math.PI / 2;
            playerTank.bullets = [];
            playerTank.loadCurrentSkinImages(); // Убедимся, что изображения подгружены для текущего skinId
        }
        livesSpan.textContent = playerTank.lives;
        enemies = [];
        if (currentLevelData.enemySpawns) {
            currentLevelData.enemySpawns.forEach(spawn => {
                const enemyX = (spawn.x + 0.5) * TILE_SIZE;
                const enemyY = (spawn.y + 0.5) * TILE_SIZE;
                enemies.push(new Enemy(enemyX, enemyY, currentLevelData.levelIndex));
            });
        }
        if (typeof setupInputListeners === 'function' && !window.inputListenersSetup) {
             setupInputListeners();
        }
        // НЕ ЗАПУСКАЕМ gameLoop здесь!
        // gameLoop();
    } else {
        console.error("Не удалось загрузить начальный уровень.");
    }
}

function checkCollisions() {
    if (!playerTank || gameState !== GAME_STATE.PLAYING) return;

    // Проверка столкновений пуль с врагами
    for (let i = playerTank.bullets.length - 1; i >= 0; i--) {
        const bullet = playerTank.bullets[i];
        bullet.update();
        let bulletRemoved = false;

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (enemy.isHit(bullet.x, bullet.y)) {
                enemy.takeDamage();
                playerTank.bullets.splice(i, 1);
                bulletRemoved = true;
                if (!enemy.isAlive()) {
                    enemies.splice(j, 1);
                }
                break;
            }
        }
        if (bulletRemoved) continue;

        if (isCollision(bullet.x, bullet.y)) {
            playerTank.bullets.splice(i, 1);
            continue;
        }

        if (bullet.isOutOfBounds(canvas.width, canvas.height)) {
            playerTank.bullets.splice(i, 1);
        }
    }

    // Проверка столкновения игрока с врагами
    const tankRect = { // Приблизительный прямоугольник танка
        x: playerTank.x - playerTank.width / 2,
        y: playerTank.y - playerTank.height / 2,
        width: playerTank.width,
        height: playerTank.height
    };

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const enemyRect = {
            x: enemy.x - enemy.width / 2,
            y: enemy.y - enemy.height / 2,
            width: enemy.width,
            height: enemy.height
        };

        // Простое пересечение прямоугольников
        if (tankRect.x < enemyRect.x + enemyRect.width &&
            tankRect.x + tankRect.width > enemyRect.x &&
            tankRect.y < enemyRect.y + enemyRect.height &&
            tankRect.y + tankRect.height > enemyRect.y) {

            playerTank.lives--; // Уменьшаем жизни
            livesSpan.textContent = playerTank.lives; // Обновляем отображение

            if (playerTank.lives <= 0) {
                gameState = GAME_STATE.GAME_OVER;
                // Здесь можно добавить задержку перед показом Game Over
                return; // Выходим, чтобы не обрабатывать другие столкновения
            } else {
                // Возрождаем игрока и удаляем врага, с которым столкнулись
                respawnPlayer();
                enemies.splice(i, 1);
                // TODO: Добавить эффект взрыва врага
            }
            break; // Одно столкновение за кадр
        }
    }
}

function update() {
    if (gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.GAME_WON) {
        if (keys['Enter']) {
            startGame();
        }
        return;
    }

    // Обновление состояния танка
    if (playerTank) {
        playerTank.update(keys);

        // Проверка достижения цели
        // Получаем координаты клетки, в которой находится центр танка
        const playerCol = Math.floor(playerTank.x / TILE_SIZE);
        const playerRow = Math.floor(playerTank.y / TILE_SIZE);

        // Сравниваем с координатами цели текущего уровня
        if (currentLevelData && currentLevelData.goalPos &&
            playerCol === currentLevelData.goalPos.x &&
            playerRow === currentLevelData.goalPos.y) {
            loadNextLevel();
            if (gameState === GAME_STATE.GAME_WON) return;
        }
    }

    // Обновление врагов
    enemies.forEach(enemy => enemy.update());

    // Проверка столкновений
    checkCollisions();
}

function drawGameOverScreen(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lang = LANGUAGES[currentLanguage];
    
    ctx.font = '40px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(lang.gameOver, canvas.width / 2, canvas.height / 2 - 30);

    ctx.font = '20px Arial';
    ctx.fillText(lang.restart, canvas.width / 2, canvas.height / 2 + 20);
}

function drawGameWonScreen(ctx) {
    ctx.fillStyle = 'rgba(0, 100, 0, 0.7)'; // Зеленый фон
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const lang = LANGUAGES[currentLanguage];
    
    ctx.font = '40px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(lang.gameWon, canvas.width / 2, canvas.height / 2 - 30);

    ctx.font = '20px Arial';
    ctx.fillText(lang.restart, canvas.width / 2, canvas.height / 2 + 20);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === GAME_STATE.PLAYING) {
        drawLevel(ctx);
        enemies.forEach(enemy => enemy.draw(ctx));
        if (playerTank) {
            playerTank.draw(ctx);
        }
        // Обновление информации на экране
        if (playerTank) {
             livesSpan.textContent = playerTank.lives;

             // Обновление статуса обоймы/перезарядки
             if (playerTank.burstShotsFired >= playerTank.maxBurstShots && playerTank.fireCooldown > 0) {
                 // Идет длинная перезарядка
                 const reloadProgress = Math.floor((1 - playerTank.fireCooldown / playerTank.burstCooldown) * 100);
                 ammoSpan.textContent = `${LANGUAGES[currentLanguage].reload} ${reloadProgress}%`;
                 ammoSpan.style.color = '#ff8c00'; // Оранжевый цвет для перезарядки
             } else {
                 // Показываем оставшиеся выстрелы
                 const shotsLeft = playerTank.maxBurstShots - playerTank.burstShotsFired;
                 ammoSpan.textContent = `${shotsLeft} / ${playerTank.maxBurstShots}`;
                 ammoSpan.style.color = '#ddd'; // Стандартный цвет
             }
        }
    } else if (gameState === GAME_STATE.GAME_OVER) {
        drawGameOverScreen(ctx);
    } else if (gameState === GAME_STATE.GAME_WON) {
        drawGameWonScreen(ctx);
    }
}

let gameLoopRequestId; // Для возможной остановки цикла
let lastTimestamp = 0;
const targetFPS = 120; // Target 120 frames per second
const frameInterval = 1000 / targetFPS;

function gameLoop(timestamp) {
    // Always update and draw on each frame for maximum responsiveness
    update();
    draw();
    
    // Request next frame
    gameLoopRequestId = requestAnimationFrame(gameLoop);
}

// Функция для заполнения меню скинов
function populateSkinMenu() {
    skinPreviewsContainer.innerHTML = '';
    TANK_SKINS.forEach(skin => {
        const skinContainer = document.createElement('div');
        skinContainer.style.textAlign = 'center';

        const previewDiv = document.createElement('div');
        previewDiv.classList.add('skin-preview');
        previewDiv.dataset.skinId = skin.id;
        previewDiv.title = skin.name;
        // Устанавливаем фоновое изображение для превью корпуса
        if (loadedImages[skin.bodyImagePath]) {
            previewDiv.style.backgroundImage = `url(${skin.bodyImagePath})`;
            previewDiv.style.backgroundSize = 'contain';
            previewDiv.style.backgroundRepeat = 'no-repeat';
            previewDiv.style.backgroundPosition = 'center';
        } else {
             previewDiv.style.backgroundColor = '#ccc'; // Заглушка цвета
        }

        // Вместо кружка башни пока ничего не добавляем, т.к. сложно отобразить
        // const turretDiv = document.createElement('div');
        // ...

        const nameDiv = document.createElement('div');
        nameDiv.textContent = skin.name;
        nameDiv.style.fontSize = '12px';
        nameDiv.style.marginTop = '5px';
        nameDiv.style.color = '#ddd';

        skinContainer.appendChild(previewDiv);
        skinContainer.appendChild(nameDiv);
        skinPreviewsContainer.appendChild(skinContainer);
    });
}

// Измененный запуск игры
async function initializeGame() {
    await preloadImages(); // Ждем загрузки изображений
    
    // Ensure language is properly initialized
    updateUILanguage();
    
    // Refresh DOM references after language initialization
    refreshDOMReferences();
    
    startGame();          // Инициализируем состояние игры
    gameLoop();           // Запускаем игровой цикл
}

// Function to refresh DOM references
function refreshDOMReferences() {
    livesSpan = document.getElementById('current-lives');
    ammoSpan = document.getElementById('ammo-status');
}

// Refresh references on initial load
document.addEventListener('DOMContentLoaded', refreshDOMReferences);

initializeGame(); // Вызываем новую функцию инициализации