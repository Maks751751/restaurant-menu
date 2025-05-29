// admin.js — повна оновлена версія з підтримкою пошуку страв

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  addDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyAn38s4mZz7KEli4594dSUZxk-xFc_NW0k",
  authDomain: "menublabla-14673.firebaseapp.com",
  projectId: "menublabla-14673",
  storageBucket: "menublabla-14673.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const categorySelect = document.getElementById('category');
const categoryList = document.getElementById('categoryList');
const menuList = document.getElementById('menuList');
const notification = document.getElementById('notification');
const imageFileInput = document.getElementById('imageFile');

function showNotification(text) {
  notification.textContent = text;
  notification.classList.remove('hidden');
  setTimeout(() => notification.classList.add('hidden'), 3000);
}

async function uploadImageAndGetUrl(file) {
  if (!file) return '';
  const storageRef = ref(storage, 'images/' + Date.now() + '-' + file.name);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

async function loadCategories() {
  categorySelect.innerHTML = '';
  categoryList.innerHTML = '';

  const snapshot = await getDocs(collection(db, 'categories'));
  let categoriesWithOrder = [];

  for (const [index, docSnap] of snapshot.docs.entries()) {
    const catData = docSnap.data();
    const id = docSnap.id;

    if (typeof catData.order === 'undefined') {
      await updateDoc(doc(db, 'categories', id), { order: index });
      catData.order = index;
    }

    categoriesWithOrder.push({ id, ...catData });
  }

  categoriesWithOrder.sort((a, b) => a.order - b.order);

  categoriesWithOrder.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.name;
    option.textContent = cat.name;
    categorySelect.appendChild(option);

    const li = document.createElement('li');
    li.className = 'bg-white p-2 rounded shadow flex justify-between items-center cursor-move';
    li.setAttribute('data-id', cat.id);
    li.innerHTML = `<span>${cat.name}</span>
      <div class="space-x-2">
        <button class="editCatBtn text-blue-500 hover:underline" data-id="${cat.id}" data-name="${cat.name}">Редагувати</button>
        <button class="deleteCatBtn text-red-500 hover:underline" data-id="${cat.id}">Видалити</button>
      </div>`;
    categoryList.appendChild(li);
  });

  setTimeout(() => {
    new Sortable(categoryList, {
      animation: 150,
      onEnd: async function () {
        const items = categoryList.querySelectorAll('li');
        for (let i = 0; i < items.length; i++) {
          const id = items[i].getAttribute('data-id');
          if (id) {
            await updateDoc(doc(db, 'categories', id), { order: i });
          }
        }
        showNotification('✅ Порядок оновлено');
      }
    });
  }, 100);

  categoryList.querySelectorAll('.editCatBtn').forEach(btn =>
    btn.addEventListener('click', () => editCategory(btn.dataset.id, btn.dataset.name))
  );
  categoryList.querySelectorAll('.deleteCatBtn').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Ви дійсно хочете видалити цю категорію?')) {
        await deleteCategory(btn.dataset.id);
      }
    })
  );
}

document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newCatInput = document.getElementById('newCategory');
  const newCat = newCatInput.value.trim();
  if (!newCat) return;

  try {
    await addDoc(collection(db, 'categories'), {
      name: newCat,
      order: Date.now()
    });
    showNotification('✅ Категорію додано');
    newCatInput.value = '';
    await loadCategories();
  } catch (err) {
    console.error('❌ Помилка додавання категорії:', err);
    showNotification('Помилка при додаванні категорії');
  }
});

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const editingId = form.dataset.editingId;
  const imageFile = imageFileInput.files[0];
  let imageUrl = document.getElementById('imageUrl').value;

  if (imageFile) {
    imageUrl = await uploadImageAndGetUrl(imageFile);
  }

  const data = {
    name: document.getElementById('name').value,
    category: document.getElementById('category').value,
    ingredients: document.getElementById('ingredients').value,
    grams: document.getElementById('grams').value,
    imageUrl: imageUrl,
  };

  const sizesVisible = !document.getElementById('pizzaSizes').classList.contains('hidden');
  if (sizesVisible) {
    const sizes = [];
    if (document.getElementById('priceS').value) sizes.push({ size: 'S', price: +document.getElementById('priceS').value });
    if (document.getElementById('priceM').value) sizes.push({ size: 'M', price: +document.getElementById('priceM').value });
    if (document.getElementById('priceL').value) sizes.push({ size: 'L', price: +document.getElementById('priceL').value });
    data.sizes = sizes;
  } else {
    data.price = +document.getElementById('price').value;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, 'menu', editingId), data);
      showNotification('✅ Страву оновлено');
    } else {
      await addDoc(collection(db, 'menu'), data);
      showNotification('✅ Страву додано');
    }

    form.reset();
    delete form.dataset.editingId;
    imageFileInput.value = '';
    document.getElementById('pizzaSizes').classList.add('hidden');
    document.getElementById('singlePriceBlock').classList.remove('hidden');
    await loadMenu();
  } catch (err) {
    console.error('❌ Помилка збереження:', err);
    showNotification('Помилка при збереженні');
  }
});

async function loadMenu() {
  menuList.innerHTML = '';

  const snapshot = await getDocs(collection(db, 'menu'));
  snapshot.forEach(docSnap => {
    const item = docSnap.data();
    const div = document.createElement('div');
    div.className = 'menu-item bg-white p-3 rounded shadow';
    div.setAttribute('data-name', item.name.toLowerCase());
    let content = `<strong>${item.name}</strong> — ${item.category}<br>`;
    if (item.ingredients) content += `<em>${item.ingredients}</em><br>`;
    if (item.description) content += `<small>${item.description}</small><br>`;

    if (item.sizes) {
      content += '<ul class="text-sm text-gray-700">';
      item.sizes.forEach(s => {
        content += `<li>${s.size} — ${s.price} грн</li>`;
      });
      content += '</ul>';
    } else if (item.price) {
      content += `<p class="text-gray-800">${item.price} грн</p>`;
    }

    if (item.imageUrl) {
      content += `<img src="${item.imageUrl}" alt="${item.name}" class="w-32 h-24 object-cover mt-2 rounded">`;
    }

    content += `<div class="mt-2 space-x-2">
      <button class="editBtn text-blue-500 hover:underline" data-id="${docSnap.id}">Редагувати</button>
      <button class="deleteBtn text-red-500 hover:underline" data-id="${docSnap.id}">Видалити</button>
    </div>`;

    div.innerHTML = content;
    menuList.appendChild(div);
  });

  menuList.querySelectorAll('.editBtn').forEach(btn =>
    btn.addEventListener('click', () => editItem(btn.dataset.id))
  );
  menuList.querySelectorAll('.deleteBtn').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (confirm('Ви дійсно хочете видалити цю страву?')) {
        await deleteItem(btn.dataset.id);
      }
    })
  );
}

async function editItem(id) {
  try {
    const ref = doc(db, 'menu', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return showNotification("❌ Страву не знайдено");
    const item = snap.data();
    document.getElementById('name').value = item.name || '';
    document.getElementById('category').value = item.category || '';
    document.getElementById('ingredients').value = item.ingredients || '';
    document.getElementById('grams').value = item.grams || '';
    document.getElementById('imageUrl').value = item.imageUrl || '';

    if (item.price !== undefined) {
      document.getElementById('singlePriceBlock').classList.remove('hidden');
      document.getElementById('pizzaSizes').classList.add('hidden');
      document.getElementById('price').value = item.price;
    }

    if (item.sizes) {
      document.getElementById('singlePriceBlock').classList.add('hidden');
      document.getElementById('pizzaSizes').classList.remove('hidden');
      document.getElementById('priceS').value = '';
      document.getElementById('priceM').value = '';
      document.getElementById('priceL').value = '';
      item.sizes.forEach(s => {
        const el = document.getElementById('price' + s.size);
        if (el) el.value = s.price;
      });
    }

    document.getElementById('addForm').dataset.editingId = id;
    document.getElementById('addForm').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error("❌ Помилка редагування:", err);
    showNotification("Помилка при редагуванні");
  }
}

async function deleteItem(id) {
  await deleteDoc(doc(db, 'menu', id));
  showNotification("Страву видалено");
  await loadMenu();
}

function editCategory(id, name) {
  const newName = prompt("Введіть нову назву категорії:", name);
  if (!newName || newName.trim() === "" || newName === name) return;

  updateDoc(doc(db, 'categories', id), { name: newName.trim() })
    .then(() => {
      showNotification("✅ Категорію оновлено");
      loadCategories();
    })
    .catch((error) => {
      console.error("❌ Помилка оновлення категорії:", error);
      showNotification("Помилка при оновленні");
    });
}

async function deleteCategory(id) {
  await deleteDoc(doc(db, 'categories', id));
  showNotification("Категорію видалено");
  await loadCategories();
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    await loadCategories();
    await loadMenu();

    const input = document.getElementById('searchInput');
    if (input) {
      input.addEventListener('input', () => {
        const value = input.value.toLowerCase();
        document.querySelectorAll('.menu-item').forEach(item => {
          const name = item.getAttribute('data-name')?.toLowerCase() || '';
          item.style.display = name.includes(value) ? '' : 'none';
        });
      });
    }
  } else {
    console.log("Користувач вийшов або неавторизований");
  }
});
