// Standalone script to load criminal records from Firebase
// This script uses the existing Firebase instance

// Sayfa yüklendiğinde çalış
document.addEventListener('DOMContentLoaded', function() {
  console.log("Criminal records standalone script loaded");

  // Firebase'in yüklenmiş olduğunu kontrol et
  if (typeof firebase === 'undefined') {
    console.error("Firebase is not loaded");
    return;
  }

  // Firestore referansını al
  let db;
  try {
    // Firebase zaten başlatılmış mı kontrol et
    if (firebase.apps && firebase.apps.length > 0) {
      // Mevcut Firebase uygulamasını kullan
      db = firebase.firestore();
      console.log("Using existing Firebase instance");
    } else {
      // Firebase yapılandırma bilgilerini al
      const configElement = document.getElementById('firebase-config');
      if (!configElement) {
        console.error("Firebase config element not found");
        return;
      }

      // Firebase'i başlat
      const firebaseConfig = JSON.parse(configElement.textContent);
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      console.log("Firebase initialized successfully");
    }
  } catch (error) {
    console.error("Error accessing Firestore:", error);
    return;
  }

  // Criminals tablosunun body kısmını seç
  const tableBody = document.getElementById('criminals-table-body');

  if (!tableBody) {
    console.error("Table body with ID 'criminals-table-body' not found");
    return;
  }

  // Yükleniyor mesajı göster
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading criminal records...</td></tr>';

  // Criminals koleksiyonundan verileri çek
  console.log("Fetching criminals from Firestore...");
  db.collection('criminals').get().then((snapshot) => {
    console.log(`Found ${snapshot.size} criminal records`);

    // Yükleniyor mesajını temizle
    tableBody.innerHTML = '';

    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No criminal records found</td></tr>';
      return;
    }

    // Her belge için bir tablo satırı oluştur
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Processing criminal: ${doc.id}`, data);

      // Yeni bir tablo satırı oluştur
      const row = document.createElement('tr');

      // Tarih formatını düzenle
      let birthDate = 'Unknown';
      if (data.birthdate) {
        const date = data.birthdate;
        if (date.year) {
          birthDate = `${date.year}`;
          if (date.month) birthDate += `-${date.month}`;
          if (date.day) birthDate += `-${date.day}`;
        }
      }

      // Satır içeriğini oluştur
      row.innerHTML = `
        <td>${data.name || doc.id.replace('criminal_', '')}</td>
        <td>${birthDate}</td>
        <td>${data.birthplace || 'Unknown'}</td>
        <td>${data.nation || data.nationality || 'Unknown'}</td>
        <td>${data.prof || data.occupation || 'Unknown'}</td>
        <td>${data.placeOfArrest || data.placeofprof || 'Unknown'}</td>
      `;

      // Satırı tabloya ekle
      tableBody.appendChild(row);
    });

    console.log("Criminal records table populated successfully");
  }).catch((error) => {
    console.error("Error getting documents: ", error);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading criminal records: ${error.message}</td></tr>`;
  });
});
