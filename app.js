// Конфигурация Firebase (твоя)
const firebaseConfig = {
    apiKey: "AIzaSyDSTBHa9YfcoR11CWIeS5o0yRW5ZZAwsFI",
    authDomain: "tld-mods.firebaseapp.com",
    projectId: "tld-mods",
    storageBucket: "tld-mods.firebasestorage.app",
    messagingSenderId: "370359641604",
    appId: "1:370359641604:web:605e86efc7d0d2ba8e7751"
};

// Импорты Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const modsCollection = collection(db, "mods");

let allMods = [];
let currentCategory = 'all';
let currentSearch = '';
let editingModId = null;

// ---------- Работа с модами ----------
async function loadMods() {
    const q = query(modsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    allMods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMods();
    updateStats();
}

function renderMods() {
    const filtered = allMods.filter(m => {
        const matchCat = currentCategory === 'all' || m.category === currentCategory;
        const matchSearch = m.name.toLowerCase().includes(currentSearch.toLowerCase());
        return matchCat && matchSearch;
    });

    const grid = document.getElementById('modsGrid');
    const noMods = document.getElementById('noMods');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        noMods.style.display = 'block';
    } else {
        noMods.style.display = 'none';
        filtered.forEach((mod, idx) => {
            const card = document.createElement('div');
            card.className = 'mod-card';
            card.style.animationDelay = `${idx * 0.05}s`;
            card.innerHTML = `
                <img src="${mod.image || 'https://placehold.co/600x400/1a1a1a/00ff66?text=TLD+MOD'}" alt="${mod.name}">
                <div class="mod-card-body">
                    <h3>${mod.name}</h3>
                    <p class="desc">${mod.description || ''}</p>
                    <div class="meta">
                        <span>👤 ${mod.author || 'Неизвестен'}</span>
                        <span>📦 v${mod.version || '1.0.0'}</span>
                        <span>🏷️ ${mod.category || 'Без категории'}</span>
                    </div>
                    <div class="mod-actions">
                        <a href="${mod.download}" target="_blank" class="download-btn">СКАЧАТЬ</a>
                        ${auth.currentUser && auth.currentUser.uid === mod.userId ? `<button onclick="deleteMod('${mod.id}')">🗑️</button>` : ''}
                    </div>
                </div>`;
            grid.appendChild(card);
        });
    }
}

function updateStats() {
    document.getElementById('modsCount').textContent = allMods.length;
    const cats = new Set(allMods.map(m => m.category).filter(Boolean));
    document.getElementById('catsCount').textContent = cats.size;
}

function filterMods() {
    currentSearch = document.getElementById('searchInput').value;
    renderMods();
}

// Категории
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        renderMods();
    });
});

// Удаление мода
async function deleteMod(modId) {
    if (!confirm('Удалить этот мод?')) return;
    await deleteDoc(doc(db, "mods", modId));
    await loadMods();
}

// Загрузка мода
document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('uploadModal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = '📤 Загрузить новый мод';
    document.getElementById('submitModBtn').textContent = 'ЗАГРУЗИТЬ МОД';
    document.getElementById('uploadForm').reset();
    editingModId = null;
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
        alert('Войдите, чтобы загружать моды');
        return;
    }
    const modData = {
        name: document.getElementById('modName').value,
        description: document.getElementById('modDesc').value,
        author: document.getElementById('modAuthor').value || auth.currentUser.email || 'Аноним',
        version: document.getElementById('modVersion').value || '1.0.0',
        download: document.getElementById('modDownload').value,
        image: document.getElementById('modImage').value,
        mirror: document.getElementById('modMirror').value,
        category: document.getElementById('modCategory').value,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
    };
    await addDoc(modsCollection, modData);
    closeModal();
    await loadMods();
});

function closeModal() {
    document.getElementById('uploadModal').style.display = 'none';
}

window.onclick = (e) => { if (e.target === document.getElementById('uploadModal')) closeModal(); };

// ---------- Аутентификация ----------
function updateUI(user) {
    if (user) {
        document.getElementById('signInBtn').style.display = 'none';
        document.getElementById('userArea').style.display = 'flex';
        document.getElementById('userName').textContent = user.email || user.displayName;
    } else {
        document.getElementById('signInBtn').style.display = 'block';
        document.getElementById('userArea').style.display = 'none';
    }
}

onAuthStateChanged(auth, user => {
    updateUI(user);
    if (user) loadMods();
});

// Модальное окно для входа
document.getElementById('signInBtn').addEventListener('click', () => {
    const modal = document.getElementById('uploadModal');
    document.getElementById('modalTitle').textContent = '🔑 Вход / Регистрация';
    document.getElementById('submitModBtn').style.display = 'none';
    
    // Создаём форму входа
    const form = document.getElementById('uploadForm');
    form.innerHTML = `
        <button type="button" id="googleLogin" class="btn btn-download" style="background:#4285F4; color: white;">Войти через Google</button>
        <hr style="margin: 15px 0; border-color: #2a2a2a;">
        <input type="email" id="loginEmail" placeholder="Email" required>
        <input type="password" id="loginPassword" placeholder="Пароль" required>
        <button type="submit" class="btn btn-download">Войти / Зарегистрироваться</button>
    `;

    document.getElementById('googleLogin').addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            closeModal();
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            closeModal();
        } catch (err) {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                if (confirm('Аккаунт не найден. Создать новый?')) {
                    try {
                        await createUserWithEmailAndPassword(auth, email, password);
                        closeModal();
                    } catch (createErr) {
                        alert('Ошибка: ' + createErr.message);
                    }
                }
            } else {
                alert('Ошибка: ' + err.message);
            }
        }
    };

    modal.style.display = 'flex';
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// При закрытии модального окна восстанавливаем форму загрузки
function resetUploadForm() {
    const form = document.getElementById('uploadForm');
    form.innerHTML = `
        <input type="text" id="modName" placeholder="Название мода" required>
        <textarea id="modDesc" placeholder="Описание мода" required></textarea>
        <div class="row">
            <input type="text" id="modAuthor" placeholder="Автор">
            <input type="text" id="modVersion" placeholder="Версия (1.0.0)">
        </div>
        <input type="url" id="modDownload" placeholder="Ссылка на скачивание" required>
        <input type="url" id="modImage" placeholder="Ссылка на изображение (необязательно)">
        <input type="url" id="modMirror" placeholder="Ссылка на зеркало (необязательно)">
        <select id="modCategory" required>
            <option value="">Выберите категорию</option>
            <option value="gameplay">Геймплей</option>
            <option value="graphics">Графика</option>
            <option value="vehicles">Транспорт</option>
            <option value="weapons">Оружие</option>
            <option value="cheats">Читы</option>
            <option value="other">Другое</option>
        </select>
        <input type="hidden" id="editModId">
        <button type="submit" id="submitModBtn" class="btn btn-download">ЗАГРУЗИТЬ МОД</button>
    `;
    document.getElementById('submitModBtn').style.display = 'block';
}

// Восстанавливаем форму при закрытии окна
document.querySelector('.close').addEventListener('click', () => {
    resetUploadForm();
    closeModal();
});

// Первая загрузка
loadMods();
