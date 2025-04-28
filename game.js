// Переменные мини-игры
let gameActive = false;
let gameScore = 0;
let gameTimeLeft = 30;
let gameInterval = null;
let coins = [];

// Инициализация мини-игры
function initMiniGame() {
    // Скрываем основную монету
    document.getElementById('coin').style.display = 'none';
    
    // Показываем контейнер для мини-игры
    const container = document.getElementById('minigame-container');
    container.style.display = 'block';
    container.innerHTML = `
        <div class="minigame-header">
            <div id="timer">30</div>
            <div>Счет: <span id="score">0</span></div>
        </div>
    `;
    
    // Сбрасываем переменные
    gameActive = true;
    gameScore = 0;
    gameTimeLeft = 30;
    
    // Обновляем таймер
    document.getElementById('timer').textContent = gameTimeLeft;
    document.getElementById('score').textContent = gameScore;
    
    // Запускаем таймер
    gameInterval = setInterval(updateGame, 1000);
    
    // Запускаем генерацию монет
    generateCoin();
}

// Обновление игры
function updateGame() {
    gameTimeLeft--;
    document.getElementById('timer').textContent = gameTimeLeft;
    
    if (gameTimeLeft <= 0) {
        endMiniGame();
    }
}

// Генерация монет
function generateCoin() {
    if (!gameActive) return;
    
    const container = document.getElementById('minigame-container');
    const coinSize = 40;
    const xPos = Math.random() * (200 - coinSize);
    
    const coin = document.createElement('div');
    coin.className = 'falling-coin';
    coin.style.left = `${xPos}px`;
    coin.style.top = '0px';
    
    coin.addEventListener('click', () => {
        gameScore += 50;
        document.getElementById('score').textContent = gameScore;
        container.removeChild(coin);
    });
    
    container.appendChild(coin);
    
    // Анимация падения
    let fallInterval = setInterval(() => {
        const currentTop = parseInt(coin.style.top) || 0;
        coin.style.top = `${currentTop + 5}px`;
        
        // Если монета достигла низа
        if (currentTop > 200) {
            clearInterval(fallInterval);
            if (container.contains(coin)) {
                container.removeChild(coin);
            }
        }
    }, 50);
    
    // Генерируем следующую монету через случайный интервал
    setTimeout(generateCoin, Math.random() * 1000 + 500);
}

// Завершение мини-игры
function endMiniGame() {
    gameActive = false;
    clearInterval(gameInterval);
    
    // Начисляем награду
    tokens += gameScore;
    lastDailyClaim = new Date();
    
    // Возвращаем основной экран
    document.getElementById('coin').style.display = 'block';
    document.getElementById('minigame-container').style.display = 'none';
    document.getElementById('minigame-container').innerHTML = '';
    
    // Сохраняем и обновляем UI
    saveGameData();
    updateUI();
    
    alert(`Челлендж завершен! Вы заработали ${gameScore} токенов.`);
}