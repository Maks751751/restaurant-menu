// kitchen-auth.js

import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const auth = getAuth();

onAuthStateChanged(auth, (user) => {
  const allowedKitchenUsers = ['kitchen@bla.com'];

  if (user && allowedKitchenUsers.includes(user.email)) {
    console.log("Вхід у кухню дозволено:", user.email);
  } else {
    alert("Доступ заборонено. Ви не кухар або не увійшли в систему.");
    signOut(auth).then(() => {
      window.location.href = 'index.html';
    });
  }
});
