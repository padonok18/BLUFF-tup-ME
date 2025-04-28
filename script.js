// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCVLwSdgsS8aDu81-88fGzbxnt-kb1IZM8",
    authDomain: "bluff-tup.firebaseapp.com",
    projectId: "bluff-tup",
    storageBucket: "bluff-tup.firebasestorage.app",
    messagingSenderId: "856751833391",
    appId: "1:856751833391:web:e524f6ba8872593a4ba1da",
    measurementId: "G-YGVRVYBFV3"
  };

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Игровые переменные
let tokens = 0;
let userId = null;
let lastDailyClaim = null;
let connector = null;
let walletAddress = null;
let autoclickerActive = false;
let offlineCoins = 0;
let lastActiveTime = null;
let referralFriends = 0;
let referralEarnings = 0;
let autoClickInterval = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await initFirebaseAuth();
    initGame();
    initTonConnect();
    setupUI();
    setupEventListeners();
    checkOfflineEarnings();
});

// Аутентификация
async function initFirebaseAuth() {
    try {
        const userCredential = await auth.signInAnonymously();
        userId = userCredential.user.uid;
        
        // Проверяем реферальную ссылку
        const urlParams = new URLSearchParams(window.location.search);
        const refId = urlParams.get('ref');
        
        if (refId && refId !== userId) {
            await handleReferral(refId);
        }
        
        generateReferralLink();
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
    }
}

// Обработка реферала
async function handleReferral(referrerId) {
    const referrerRef = db.collection('players').doc(referrerId);
    const referralBonus = 1000 + (referralFriends * 1000);
    
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(referrerRef);
        
        if (doc.exists) {
            const currentFriends = doc.data().referralFriends || 0;
            const currentEarnings = doc.data().referralEarnings || 0;
            const bonus = 1000 + (currentFriends * 1000);
            
            transaction.update(referrerRef, {
                tokens: firebase.firestore.FieldValue.increment(bonus),
                referralFriends: currentFriends + 1,
                referralEarnings: currentEarnings + bonus
            });
        }
    });
}

// Генерация реферальной ссылки
function generateReferralLink() {
    const link = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
    document.getElementById('referral-link').value = link;
}

// Загрузка данных игры
async function initGame() {
    try {
        const doc = await db.collection('players').doc(userId).get();
        
        if (doc.exists) {
            const data = doc.data();
            tokens = data.tokens || 0;
            lastDailyClaim = data.lastDailyClaim?.toDate() || null;
            walletAddress = data.walletAddress || null;
            autoclickerActive = data.autoclickerActive || false;
            referralFriends = data.referralFriends || 0;
            referralEarnings = data.referralEarnings || 0;
            lastActiveTime = data.lastActiveTime?.toDate() || new Date();
            
            updateUI();
            
            if (autoclickerActive) {
                startAutoClicker();
            }
        } else {
            await saveGameData();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Инициализация TON Connect
function initTonConnect() {
    try {
        if (typeof TonConnect === 'undefined') {
            console.error('TON Connect SDK не загружен');
            return;
        }
        
        connector = new TonConnect.TonConnect({
            manifestUrl: window.location.origin + '/tonconnect-manifest.json'
        });
        
        if (connector.connected) {
            walletAddress = connector.account.address;
            updateWalletUI();
            updateTonBalance();
        }
    } catch (error) {
        console.error('Ошибка инициализации TON Connect:', error);
    }
}

// Настройка UI
function setupUI() {
    // Переключение вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
    
    // Обновление данных в UI
    updateUI();
}

// Настройка обработчиков событий
function setupEventListeners() {
    document.getElementById('coin').addEventListener('click', clickCoin);
    document.getElementById('daily-btn').addEventListener('click', startDailyChallenge);
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    document.getElementById('buy-autoclicker').addEventListener('click', buyAutoClicker);
    document.getElementById('collect-btn').addEventListener('click', collectOfflineCoins);
    document.getElementById('copy-btn').addEventListener('click', copyReferralLink);
    document.getElementById('withdraw-btn').addEventListener('click', withdrawTokens);
}

// Клик по монете
function clickCoin() {
    tokens++;
    updateUI();
    saveGameData();
    
    // Анимация клика
    const coin = document.getElementById('coin');
    coin.style.transform = 'scale(0.95)';
    setTimeout(() => {
        coin.style.transform = 'scale(1)';
    }, 100);
}

// Запуск ежедневного челленджа
function startDailyChallenge() {
    if (lastDailyClaim && isSameDay(lastDailyClaim, new Date())) {
        alert('Вы уже проходили челлендж сегодня!');
        return;
    }
    
    initMiniGame();
}

// Подключение TON кошелька
async function connectWallet() {
    if (!connector) {
        alert('TON Connect не инициализирован');
        return;
    }
    
    try {
        const wallets = await connector.getWallets();
        const wallet = wallets[0];
        
        if (connector.connected) {
            walletAddress = connector.account.address;
            updateWalletUI();
            updateTonBalance();
            alert(`Кошелек уже подключен: ${walletAddress}`);
            return;
        }
        
        await connector.connect({ wallet });
        walletAddress = connector.account.address;
        
        await saveGameData();
        updateWalletUI();
        updateTonBalance();
        
        alert(`Кошелек подключен: ${walletAddress}`);
    } catch (error) {
        console.error('Ошибка подключения кошелька:', error);
        alert('Не удалось подключить кошелек');
    }
}

// Покупка автокликера
async function buyAutoClicker() {
    if (autoclickerActive) {
        alert('У вас уже есть автокликер!');
        return;
    }
    
    if (tokens < 2500) {
        alert('Недостаточно токенов!');
        return;
    }
    
    tokens -= 2500;
    autoclickerActive = true;
    startAutoClicker();
    
    await saveGameData();
    updateUI();
    
    alert('Автокликер активирован! Теперь вы будете получать токены даже когда не в игре.');
}

// Запуск автокликера
function startAutoClicker() {
    if (autoClickInterval) {
        clearInterval(autoClickInterval);
    }
    
    autoClickInterval = setInterval(() => {
        tokens++;
        offlineCoins++;
        updateUI();
        saveGameData();
    }, 2000);
    
    document.getElementById('autoclicker-status').textContent = 'Активен';
    document.getElementById('collect-btn').style.display = 'block';
}

// Сбор оффлайн-дохода
async function collectOfflineCoins() {
    tokens += offlineCoins;
    offlineCoins = 0;
    await saveGameData();
    updateUI();
}

// Проверка оффлайн-дохода
function checkOfflineEarnings() {
    if (!lastActiveTime || !autoclickerActive) return;
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - lastActiveTime) / 1000);
    
    if (diffInSeconds > 10) { // 10 секунд - минимальное время для оффлайн-дохода
        const clicks = Math.floor(diffInSeconds / 2); // Клики каждые 2 секунды
        offlineCoins += clicks;
        updateUI();
    }
}

// Копирование реферальной ссылки
function copyReferralLink() {
    const linkInput = document.getElementById('referral-link');
    linkInput.select();
    document.execCommand('copy');
    alert('Ссылка скопирована!');
}

// Вывод токенов
async function withdrawTokens() {
    if (!walletAddress) {
        alert('Сначала подключите кошелёк');
        return;
    }
    
    if (tokens < 1000) {
        alert('Минимальная сумма вывода: 1000 токенов');
        return;
    }
    
    // Здесь должна быть реализация вывода через TON API
    alert(`Вывод ${tokens} токенов на адрес ${walletAddress} (в разработке)`);
}

// Обновление баланса TON
async function updateTonBalance() {
    if (!walletAddress) return;
    
    // Здесь должна быть реализация проверки баланса через TON API
    document.getElementById('ton-balance').textContent = '0.00';
}

// Сохранение данных игры
async function saveGameData() {
    try {
        lastActiveTime = new Date();
        
        await db.collection('players').doc(userId).set({
            tokens: tokens,
            lastDailyClaim: lastDailyClaim ? firebase.firestore.Timestamp.fromDate(lastDailyClaim) : null,
            walletAddress: walletAddress,
            autoclickerActive: autoclickerActive,
            referralFriends: referralFriends,
            referralEarnings: referralEarnings,
            lastActiveTime: firebase.firestore.Timestamp.fromDate(lastActiveTime),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('balance').textContent = tokens;
    document.getElementById('offline-coins').textContent = offlineCoins;
    document.getElementById('friends-count').textContent = referralFriends;
    document.getElementById('referral-earnings').textContent = referralEarnings;
    
    const dailyBtn = document.getElementById('daily-btn');
    const now = new Date();
    
    if (lastDailyClaim && isSameDay(lastDailyClaim, now)) {
        dailyBtn.disabled = true;
        
        const nextDay = new Date(lastDailyClaim);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        
        const hoursLeft = Math.round((nextDay - now) / (1000 * 60 * 60));
        dailyBtn.textContent = `Доступно через ${hoursLeft} ч.`;
    } else {
        dailyBtn.disabled = false;
        dailyBtn.textContent = 'Ежедневный челлендж (50x)';
    }
    
    if (walletAddress) {
        document.getElementById('wallet-status').textContent = 'Подключен';
        document.getElementById('wallet-address').textContent = 
            `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        document.getElementById('connect-wallet').textContent = 'Кошелёк подключен';
        document.getElementById('withdraw-btn').disabled = false;
    } else {
        document.getElementById('wallet-status').textContent = 'Не подключен';
        document.getElementById('wallet-address').textContent = '-';
        document.getElementById('connect-wallet').textContent = 'Подключить кошелёк';
        document.getElementById('withdraw-btn').disabled = true;
    }
    
    if (autoclickerActive) {
        document.getElementById('autoclicker-status').textContent = 'Активен';
        document.getElementById('buy-autoclicker').disabled = true;
        document.getElementById('buy-autoclicker').textContent = 'Уже куплено';
        document.getElementById('collect-btn').style.display = 'block';
        document.getElementById('auto-coins').textContent = offlineCoins;
    } else {
        document.getElementById('autoclicker-status').textContent = 'Неактивен';
        document.getElementById('buy-autoclicker').disabled = tokens < 2500;
        document.getElementById('collect-btn').style.display = 'none';
    }
}

// Проверка, что две даты - один и тот же день
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}