// Criminal Records Table - Firebase'den suçluları çekip tabloya yerleştiren script
document.addEventListener('DOMContentLoaded', function() {
  console.log("Criminal records script loaded");

  // Firebase yapılandırma bilgilerini al
  const configElement = document.getElementById('firebase-config');
  if (!configElement) {
    console.error("Firebase config element not found");
    return;
  }

  // Firebase'i başlat
  try {
    // Firebase zaten başlatılmış mı kontrol et
    if (!firebase.apps.length) {
      const firebaseConfig = JSON.parse(configElement.textContent);
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();
    console.log("Firebase initialized successfully");

    // Criminals tablosunun body kısmını seç
    const tableBody = document.getElementById('criminals-table-body');

    // Eğer tablo body'si yoksa, oluştur
    if (!tableBody) {
      console.error("Table body with ID 'criminals-table-body' not found. Creating it...");

      // Tablo var mı kontrol et
      const table = document.querySelector('.criminals-table');
      if (table) {
        // tbody yoksa oluştur
        let newTableBody = document.createElement('tbody');
        newTableBody.id = 'criminals-table-body';
        table.appendChild(newTableBody);

        // Referansı güncelle
        tableBody = newTableBody;
      } else {
        console.error("Criminal records table not found");
        return;
      }
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
          <td>${data.nationality || 'Unknown'}</td>
          <td>${data.occupation || 'Unknown'}</td>
          <td>${data.placeOfArrest || 'Unknown'}</td>
        `;

        // Satırı tabloya ekle
        tableBody.appendChild(row);
      });

      console.log("Criminal records table populated successfully");
    }).catch((error) => {
      console.error("Error getting documents: ", error);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error loading criminal records: ${error.message}</td></tr>`;
    });
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    const tableBody = document.getElementById('criminals-table-body');
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">Error initializing Firebase: ${error.message}</td></tr>`;
    }
  }
});
