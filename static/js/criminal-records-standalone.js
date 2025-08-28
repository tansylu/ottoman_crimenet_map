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

    // Tüm verileri bir diziye topla
    const criminals = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Processing criminal: ${doc.id}`, data);

      // Tarih formatını düzenle
      let birthDate = 'Unknown';
      if (data.birthdate) {
        // Nesne formatında tarih kontrolü (Firebase Timestamp veya özel tarih nesnesi)
        if (typeof data.birthdate === 'object') {
          // Firebase Timestamp kontrolü
          if (data.birthdate.toDate && typeof data.birthdate.toDate === 'function') {
            const date = data.birthdate.toDate();
            birthDate = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
          }
          // Özel tarih nesnesi kontrolü (year, month, day alanları)
          else if (data.birthdate.year) {
            birthDate = `${data.birthdate.year}`;
            if (data.birthdate.month) birthDate += `-${data.birthdate.month}`;
            if (data.birthdate.day) birthDate += `-${data.birthdate.day}`;
          }
        }
        // String formatında tarih kontrolü
        else if (typeof data.birthdate === 'string') {
          birthDate = data.birthdate;
        }
        // Sayısal değer kontrolü (örneğin 1834)
        else if (typeof data.birthdate === 'number') {
          birthDate = data.birthdate.toString();
        }
      }

      // Diğer alanları hazırla
      const name = data.name || doc.id.replace('criminal_', '');
      const birthplace = data.birthplace || 'Unknown';
      const nationality = data.nation || data.nationality || 'Unknown';
      const occupation = data.prof || data.occupation || 'Unknown';
      const placeOfArrest = data.placeOfArrest || 'Unknown';

      // "Unknown" sayısını hesapla
      let unknownCount = 0;
      if (birthDate === 'Unknown') unknownCount++;
      if (birthplace === 'Unknown') unknownCount++;
      if (nationality === 'Unknown') unknownCount++;
      if (occupation === 'Unknown') unknownCount++;
      if (placeOfArrest === 'Unknown') unknownCount++;

      // Suçlu bilgilerini diziye ekle
      criminals.push({
        id: doc.id,
        name: name,
        birthDate: birthDate,
        birthplace: birthplace,
        nationality: nationality,
        occupation: occupation,
        placeOfArrest: placeOfArrest,
        unknownCount: unknownCount
      });
    });

    // "Unknown" sayısına göre sırala (az olandan çok olana)
    criminals.sort((a, b) => a.unknownCount - b.unknownCount);

    // Sıralanmış verileri tabloya ekle
    criminals.forEach(criminal => {
      const row = document.createElement('tr');

      // Satır içeriğini oluştur
      row.innerHTML = `
        <td>${criminal.name}</td>
        <td>${criminal.birthDate}</td>
        <td>${criminal.birthplace}</td>
        <td>${criminal.nationality}</td>
        <td>${criminal.occupation}</td>
        <td>${criminal.placeOfArrest}</td>
      `;

      // Satırı tabloya ekle
      tableBody.appendChild(row);
    });

    console.log("Criminal records table populated successfully and sorted by unknown count");
  }).catch((error) => {
    console.error("Error getting documents: ", error);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading criminal records: ${error.message}</td></tr>`;
  });
});
