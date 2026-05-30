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

// Кнопка "Войти / Регистрация" — теперь показывает выбор
document.getElementById('signInBtn').addEventListener('click', () => {
    const choice = prompt('Введите "email" для входа по почте или "google" для входа через Google:');
    if (choice === 'google') {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch(err => alert(err.message));
    } else if (choice === 'email') {
        const email = prompt('Введите email:');
        if (!email) return;
        const password = prompt('Введите пароль (или придумайте для регистрации):');
        if (!password) return;
        signInWithEmailAndPassword(auth, email, password)
            .catch(() => {
                if (confirm('Аккаунт не найден. Создать новый?')) {
                    createUserWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
                }
            });
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// Первая загрузка
loadMods();
