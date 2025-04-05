// Данные скинов
const TANK_SKINS = [
    { id: 0, name: 'T-34',    bodyImagePath: 'assets/t34_body.png',    turretImagePath: 'assets/t34_turret.png' },
    { id: 1, name: 'KV-2',    bodyImagePath: 'assets/kv2_body.png',    turretImagePath: 'assets/kv2_turret.png' },
    { id: 2, name: 'Panther', bodyImagePath: 'assets/jagdpanther_body.png', turretImagePath: 'assets/jagdpanther_turret.png' },
    { id: 3, name: 'Maus',    bodyImagePath: 'assets/maus_body.png',    turretImagePath: 'assets/maus_turret.png' }
];

// Объект для хранения предзагруженных изображений
const loadedImages = {};

class Tank {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.speed = TILE_SIZE;
        this.angle = -Math.PI / 2;

        this.skinId = parseInt(localStorage.getItem('tankSkinId') || '0');
        if (!TANK_SKINS.find(s => s.id === this.skinId)) {
            this.skinId = 0;
        }
        // Не вызываем здесь, вызовем после предзагрузки в startGame
        // this.loadCurrentSkinImages();

        this.turretLength = TILE_SIZE * 0.5;
        this.turretWidth = TILE_SIZE * 0.15;

        this.bullets = [];
        this.intraBurstCooldown = 15;
        this.fireCooldown = 0;
        this.burstShotsFired = 0;
        this.maxBurstShots = 5;
        this.burstCooldown = 180;
        this.moveCooldown = 0;
        this.maxMoveCooldown = 12;
        this.lives = 3;
    }

    getCurrentSkinData() {
        return TANK_SKINS.find(s => s.id === this.skinId) || TANK_SKINS[0];
    }

    // Загружает изображения для ТЕКУЩЕГО скина
    loadCurrentSkinImages() {
        const skinData = this.getCurrentSkinData();
        console.log(`Tank: Загрузка изображений для скина ${skinData.name} (ID: ${this.skinId})`);
        this.bodyImage = loadedImages[skinData.bodyImagePath];
        this.turretImage = loadedImages[skinData.turretImagePath];
        if (!this.bodyImage) {
            console.error(`Tank: Не найдено предзагруженное изображение корпуса: ${skinData.bodyImagePath}`);
            this.bodyImage = null;
        }
        if (!this.turretImage) {
             console.error(`Tank: Не найдено предзагруженное изображение башни: ${skinData.turretImagePath}`);
            this.turretImage = null;
        }
    }

    setSkin(id) {
        const newSkin = TANK_SKINS.find(s => s.id === id);
        if (newSkin) {
            this.skinId = id;
            localStorage.setItem('tankSkinId', id);
            this.loadCurrentSkinImages(); // Загружаем новые изображения
            console.log(`Установлен скин: ${newSkin.name}`);
        } else {
            console.warn(`Скин с ID ${id} не найден.`);
        }
    }

    draw(ctx) {
        this.bullets.forEach(bullet => bullet.draw(ctx));

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Рисуем корпус
        if (this.bodyImage) {
            ctx.drawImage(this.bodyImage, -this.width / 2, -this.height / 2, this.width, this.height);
        } /* else {
            // Заглушка корпуса - УБРАНО
            // ctx.fillStyle = 'grey';
            // ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        } */

        // Рисуем башню
        if (this.turretImage) {
            const turretDrawSize = this.width * 0.7;
            ctx.drawImage(this.turretImage, -turretDrawSize / 2, -turretDrawSize / 2, turretDrawSize, turretDrawSize);
        } /* else {
            // Заглушка башни - УЖЕ УБРАНО
        } */

        ctx.restore();
    }

    fire() {
        if (this.fireCooldown <= 0 && this.burstShotsFired < this.maxBurstShots) {
            const barrelEndX = this.x + Math.cos(this.angle) * this.turretLength;
            const barrelEndY = this.y + Math.sin(this.angle) * this.turretLength;
            const newBullet = new Bullet(barrelEndX, barrelEndY, this.angle);
            this.bullets.push(newBullet);
            this.burstShotsFired++;
            if (this.burstShotsFired >= this.maxBurstShots) {
                this.fireCooldown = this.burstCooldown;
            } else {
                this.fireCooldown = this.intraBurstCooldown;
            }
        }
    }

    update(keys) {
        if (this.fireCooldown > 0) {
            this.fireCooldown--;
            if (this.fireCooldown <= 0 && this.burstShotsFired >= this.maxBurstShots) {
                this.burstShotsFired = 0;
            }
        }
        if (this.moveCooldown > 0) {
            this.moveCooldown--;
        }

        if (keys[' ']) {
            this.fire();
        }

        const currentTile = getTileTypeAt(this.x, this.y);
        const effectiveMaxCooldown = (currentTile === TILE.WATER) ? Math.floor(this.maxMoveCooldown * 1.5) : this.maxMoveCooldown;

        if (this.moveCooldown <= 0) {
            let intendedAngle = this.angle;
            let keyPress = false;

            if (keys['ArrowUp']) {
                intendedAngle = -Math.PI / 2;
                keyPress = true;
            } else if (keys['ArrowDown']) {
                intendedAngle = Math.PI / 2;
                keyPress = true;
            } else if (keys['ArrowLeft']) {
                intendedAngle = Math.PI;
                keyPress = true;
            } else if (keys['ArrowRight']) {
                intendedAngle = 0;
                keyPress = true;
            }

            if (keyPress) {
                const currentAngle = this.angle;
                const angleDifference = Math.atan2(Math.sin(intendedAngle - currentAngle), Math.cos(intendedAngle - currentAngle));
                const isTurningAround = Math.abs(angleDifference) > Math.PI * 0.9;
                this.angle = intendedAngle;
                if (isTurningAround) {
                    this.moveCooldown = effectiveMaxCooldown;
                } else {
                    let moveX = 0;
                    let moveY = 0;
                    if (intendedAngle === 0) moveX = this.speed;
                    else if (intendedAngle === Math.PI) moveX = -this.speed;
                    else if (intendedAngle === -Math.PI / 2) moveY = -this.speed;
                    else if (intendedAngle === Math.PI / 2) moveY = this.speed;
                    const targetX = this.x + moveX;
                    const targetY = this.y + moveY;
                    if (!isCollision(targetX + Math.sign(moveX) * TILE_SIZE * 0.1, targetY + Math.sign(moveY) * TILE_SIZE * 0.1 )) {
                        this.x = targetX;
                        this.y = targetY;
                    }
                    this.moveCooldown = effectiveMaxCooldown;
                }
            }
        }
        this.bullets.forEach(bullet => bullet.update());
    }
} 