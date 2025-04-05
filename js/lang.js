const LANGUAGES = {
    de: {
        title: "2D Panzer mit Levels",
        heading: "2D Panzer",
        controls: "Steuerung: Pfeiltasten - Richtung einstellen und 1 Feld bewegen, Leertaste - Feuer",
        level: "Level",
        lives: "Leben",
        ammo: "Magazin",
        skins: "Skins",
        chooseSkin: "Skin wählen:",
        close: "Schließen",
        gameOver: "Spiel Vorbei",
        gameWon: "Spiel Gewonnen",
        restart: "Neu starten",
        reload: "Nachladen"
    },
    ru: {
        title: "2D Танки с Уровнями",
        heading: "2D Танки",
        controls: "Управление: Стрелки - задать направление и двигаться на 1 клетку, Пробел - огонь",
        level: "Уровень",
        lives: "Жизни",
        ammo: "Обойма",
        skins: "Скины",
        chooseSkin: "Выберите скин:",
        close: "Закрыть",
        gameOver: "Игра Окончена",
        gameWon: "Победа",
        restart: "Начать заново",
        reload: "Перезарядка"
    }
};

// Default language
let currentLanguage = 'de';

// Function to switch language
function switchLanguage(lang) {
    if (LANGUAGES[lang]) {
        currentLanguage = lang;
        updateUILanguage();
    }
}

// Function to update all UI elements with the selected language
function updateUILanguage() {
    const lang = LANGUAGES[currentLanguage];
    
    // Update document title
    document.title = lang.title;
    
    // Update heading
    document.querySelector('h1').textContent = lang.heading;
    
    // Update game info elements
    document.getElementById('controls-info').textContent = lang.controls;
    
    // Preserve span elements by updating the text nodes around them
    const levelInfoEl = document.getElementById('level-info');
    const livesInfoEl = document.getElementById('lives-info');
    const ammoInfoEl = document.getElementById('ammo-info');
    
    // Clear and re-add the text and spans
    // Level info
    levelInfoEl.innerHTML = '';
    const levelText = document.createTextNode(`${lang.level}: `);
    levelInfoEl.appendChild(levelText);
    const levelSpan = document.getElementById('current-level') || document.createElement('span');
    levelSpan.id = 'current-level';
    levelInfoEl.appendChild(levelSpan);
    
    // Lives info
    livesInfoEl.innerHTML = '';
    const livesText = document.createTextNode(`${lang.lives}: `);
    livesInfoEl.appendChild(livesText);
    const livesSpan = document.getElementById('current-lives') || document.createElement('span');
    livesSpan.id = 'current-lives';
    livesInfoEl.appendChild(livesSpan);
    
    // Ammo info
    ammoInfoEl.innerHTML = '';
    const ammoText = document.createTextNode(`${lang.ammo}: `);
    ammoInfoEl.appendChild(ammoText);
    const ammoSpan = document.getElementById('ammo-status') || document.createElement('span');
    ammoSpan.id = 'ammo-status';
    ammoInfoEl.appendChild(ammoSpan);
    
    // Update skin menu
    document.getElementById('skin-button').textContent = lang.skins;
    document.querySelector('#skin-menu h3').textContent = lang.chooseSkin;
    document.getElementById('close-skin-menu').textContent = lang.close;
}

// Initialize language when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateUILanguage();
}); 