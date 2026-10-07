// Smart Medicine Box Pro - Complete Firebase Integrated JavaScript Implementation

// Global Variables and State Management
let currentAuthUser = null;
let currentUserProfile = null;
let currentUser = null;
let medicineData = [];
let inventoryData = [];
let caretakers = [];
let alerts = [];
let currentTheme = 'light';
let userDbRef = null;

// Sample fallback data for demonstration/offline mode
const sampleUsers = {
  'CARD001': {
    id: 'CARD001',
    name: 'John Doe',
    age: 45,
    gender: 'male',
    disease: 'Hypertension',
    symptoms: 'High blood pressure, occasional headaches',
    doctor: 'Dr. Smith',
    contact: '+1234567890',
    rfidTagId: 'CARD001'
  },
  'CARD002': {
    id: 'CARD002',
    name: 'Mary Johnson',
    age: 62,
    gender: 'female',
    disease: 'Diabetes Type 2',
    symptoms: 'Elevated blood sugar, fatigue',
    doctor: 'Dr. Williams',
    contact: '+1987654321',
    rfidTagId: 'CARD002'
  }
};

const sampleMedicines = {
  'CARD001': [
    {
      id: 'med_1',
      name: 'Lisinopril',
      dosage: '10mg',
      time: '08:00',
      frequency: 'daily',
      uses: 'Blood pressure control',
      stock: 30,
      remaining: 25,
      expiry: '2025-12-31'
    },
    {
      id: 'med_2',
      name: 'Aspirin',
      dosage: '81mg',
      time: '20:00',
      frequency: 'daily',
      uses: 'Heart health and blood thinning',
      stock: 60,
      remaining: 45,
      expiry: '2025-10-15'
    }
  ],
  'CARD002': [
    {
      id: 'med_3',
      name: 'Metformin',
      dosage: '500mg',
      time: '07:00',
      frequency: 'twice-daily',
      uses: 'Blood sugar control',
      stock: 60,
      remaining: 40,
      expiry: '2025-11-20'
    },
    {
      id: 'med_4',
      name: 'Glipizide',
      dosage: '5mg',
      time: '18:00',
      frequency: 'daily',
      uses: 'Diabetes management',
      stock: 30,
      remaining: 20,
      expiry: '2025-09-30'
    }
  ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  setupMobileMenu();
  loadTheme();
  initFirebaseAuth();
});

function initializeApp() {
  showSection('dashboard');
  updateDashboard();
  updateScheduleTable();
  updateInventoryTable();
  updateAlertsList();
  setupFormEventListeners();
  console.log('Smart Medicine Box Pro initialized');
}

// Initialize Firebase Auth Listener & Realtime Sync
function initFirebaseAuth() {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.warn('Firebase Auth SDK not detected');
    return;
  }

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      currentAuthUser = user;
      console.log('User signed in via Firebase:', user.email);
      setupFirebaseRealtimeListener(user.uid, user.email);
    } else {
      // Check for local session active user fallback
      const localActiveStr = localStorage.getItem('smb_active_user');
      if (localActiveStr) {
        try {
          const localUser = JSON.parse(localActiveStr);
          currentUser = {
            id: localUser.uid || 'local_1',
            rfidTagId: localUser.rfidTagId || 'SMB-LOCAL',
            name: localUser.name || `${localUser.firstName || 'User'} ${localUser.lastName || ''}`.trim(),
            email: localUser.email || 'local@smb.com',
            disease: 'General Health Monitoring'
          };
          const localUid = currentUser.id || 'local_1';
          const storedProfile = localStorage.getItem(`smb_profile_${localUid}`);
          if (storedProfile) {
            currentUserProfile = JSON.parse(storedProfile);
            Object.assign(currentUser, currentUserProfile);
          } else {
            currentUserProfile = { ...currentUser };
          }

          document.getElementById('userName').textContent = currentUser.name;
          document.getElementById('userId').textContent = `ID: ${currentUser.rfidTagId}`;
          document.getElementById('userStatus').textContent = 'Connected (Local Session)';
          document.getElementById('welcomeUserName').textContent = currentUser.name;

          const storedMeds = localStorage.getItem(`smb_medicines_${localUid}`);
          if (storedMeds) {
            medicineData = JSON.parse(storedMeds);
          } else {
            medicineData = sampleMedicines['CARD001'] || [];
            localStorage.setItem(`smb_medicines_${localUid}`, JSON.stringify(medicineData));
          }
          inventoryData = [...medicineData];

          const storedCaretakers = localStorage.getItem(`smb_caretakers_${localUid}`);
          if (storedCaretakers) {
            caretakers = JSON.parse(storedCaretakers);
          }

          updateDashboard();
          updateScheduleTable();
          updateInventoryTable();
          updateCaretakersList();
          updateAlertsList();
          loadUserProfile();
          console.log('User signed in via Local Session:', currentUser.email);
          return;
        } catch (e) { console.error('Error parsing local user session:', e); }
      }

      currentAuthUser = null;
      currentUserProfile = null;
      currentUser = null;
      console.log('No user signed in');
      
      document.getElementById('userName').textContent = 'Guest User';
      document.getElementById('userId').textContent = 'ID: Not Logged In';
      document.getElementById('userStatus').textContent = 'Click Login to connect';
      document.getElementById('welcomeUserName').textContent = 'Guest';

      medicineData = [];
      inventoryData = [];
      caretakers = [];
      alerts = [];
      updateDashboard();
      updateScheduleTable();
      updateInventoryTable();
      updateCaretakersList();
      updateAlertsList();
    }
  });
}

// Firebase Realtime Listener - Read Data Live from Firebase
function setupFirebaseRealtimeListener(uid, email) {
  if (!firebase.database) return;

  if (userDbRef) {
    userDbRef.off(); // Detach previous listener if any
  }

  // 1. Listen to WEBSITE DATA Tree (Website_Data/users/{uid})
  userDbRef = firebase.database().ref('Website_Data/users/' + uid);
  
  const connectionStatus = document.getElementById('connectionStatus');
  if (connectionStatus) connectionStatus.textContent = 'Status: Connecting to Website Data...';

  userDbRef.on('value', (snapshot) => {
    let data = snapshot.val();
    
    // Fallback to legacy root users node if Website_Data is empty
    if (!data) {
      firebase.database().ref('users/' + uid).once('value', (legacySnap) => {
        data = legacySnap.val() || {};
      });
    }
    data = data || {};
    
    // Website Profile Data
    const profile = data.profile || {};
    const displayName = profile.name || profile.firstName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : email.split('@')[0];
    const rfidTagId = profile.rfidTagId || 'SMB-' + uid.substr(0, 6).toUpperCase();

    currentUserProfile = profile;
    currentUser = {
      id: uid,
      rfidTagId: rfidTagId,
      name: displayName,
      email: email,
      age: profile.age || '',
      gender: profile.gender || '',
      disease: profile.disease || '',
      symptoms: profile.symptoms || '',
      doctor: profile.doctor || '',
      contact: profile.contact || ''
    };

    // Update Sidebar & Header UI
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userId').textContent = `ID: ${rfidTagId}`;
    document.getElementById('userStatus').textContent = 'Connected (Website Data)';
    document.getElementById('welcomeUserName').textContent = displayName;

    if (connectionStatus) {
      connectionStatus.textContent = 'Website Data: Connected 🟢';
    }

    // 2. Listen to DEVICE DATA Tree (Device_Data/SmartMedicineBox/device)
    firebase.database().ref('Device_Data/SmartMedicineBox/device').on('value', (deviceSnapshot) => {
      let device = deviceSnapshot.val();
      if (!device) {
        firebase.database().ref('SmartMedicineBox/device').once('value', (legacyDevSnap) => {
          device = legacyDevSnap.val();
        });
      }
      
      if (device) {
        if (connectionStatus) {
          connectionStatus.innerHTML = `Hardware v${device.firmwareVersion || '1.0.0'} | WiFi: ${device.wifiStatus ? '🟢 Online' : '🔴 Offline'} | GSM: ${device.gsmStatus ? '🟢 Online' : '🔴 Offline'}`;
        }
        const lastSyncDiv = document.getElementById('lastSync');
        if (lastSyncDiv && device.lastSync) {
          lastSyncDiv.textContent = `Last hardware sync: ${device.lastSync}`;
        }
      }
    });

    // 2. Medicines Data
    const medsObj = data.medicines || {};
    medicineData = Object.keys(medsObj).map(key => {
      return {
        id: key,
        ...medsObj[key]
      };
    });
    inventoryData = [...medicineData];

    // 3. Caretakers Data
    const caretakersObj = data.caretakers || {};
    caretakers = Object.keys(caretakersObj).map(key => {
      return {
        id: key,
        ...caretakersObj[key]
      };
    });

    // 4. Update UI Components
    updateDashboard();
    updateScheduleTable();
    updateInventoryTable();
    updateCaretakersList();
    loadUserProfile();
    generateAlerts();

    const lastSyncDiv = document.getElementById('lastSync');
    if (lastSyncDiv) {
      lastSyncDiv.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
    }
  }, (error) => {
    console.error('Firebase Realtime Database read error:', error);
    showNotification('Failed to read live data from Firebase', 'error');
  });
}

// DateTime Functions
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  
  const datetimeElem = document.getElementById('datetime');
  if (datetimeElem) {
    datetimeElem.textContent = now.toLocaleDateString('en-US', options);
  }
}

// Mobile Menu Functions
function setupMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const sidebar = document.getElementById('sidebar');
  
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
      sidebar.classList.toggle('active');
      mobileOverlay.classList.toggle('active');
    });
  }
  
  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function() {
      sidebar.classList.remove('active');
      mobileOverlay.classList.remove('active');
    });
  }
}

// RFID Simulation & Lookup
function simulateRFIDScan() {
  const rfidStatus = document.getElementById('rfidStatus');
  rfidStatus.textContent = 'Scanning...';
  
  setTimeout(() => {
    if (currentAuthUser && currentUser) {
      rfidStatus.textContent = `RFID ${currentUser.rfidTagId} Active`;
      showNotification(`Scanned active user RFID: ${currentUser.rfidTagId}`, 'success');
    } else {
      const demoKeys = Object.keys(sampleUsers);
      const randomKey = demoKeys[Math.floor(Math.random() * demoKeys.length)];
      currentUser = sampleUsers[randomKey];
      medicineData = sampleMedicines[randomKey] || [];
      inventoryData = [...medicineData];

      document.getElementById('userName').textContent = currentUser.name;
      document.getElementById('userId').textContent = `ID: ${currentUser.id}`;
      document.getElementById('userStatus').textContent = 'Demo User (Offline)';
      document.getElementById('welcomeUserName').textContent = currentUser.name;

      updateDashboard();
      updateScheduleTable();
      updateInventoryTable();
      loadUserProfile();
      generateAlerts();

      rfidStatus.textContent = `Card ${randomKey} loaded`;
    }

    setTimeout(() => {
      rfidStatus.textContent = 'Ready to scan';
    }, 3000);
  }, 1500);
}

// Navigation Functions
function showSection(sectionName) {
  const sections = document.querySelectorAll('section');
  sections.forEach(section => section.classList.remove('active'));
  
  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  
  const activeNavItem = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }
  
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');
  if (sidebar) sidebar.classList.remove('active');
  if (mobileOverlay) mobileOverlay.classList.remove('active');
}

// Dashboard Functions
function updateDashboard() {
  if (!currentUser || medicineData.length === 0) {
    document.getElementById('nextDose').textContent = 'No medicines scheduled';
    document.getElementById('totalPills').textContent = '0 remaining';
    document.getElementById('lastTaken').textContent = 'No record';
    document.getElementById('activeAlerts').textContent = '0 notifications';
    return;
  }
  
  const now = new Date();
  const todayTimes = medicineData.map(med => {
    const [hours, minutes] = (med.time || '08:00').split(':');
    const medTime = new Date();
    medTime.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
    return { medicine: med, time: medTime };
  }).filter(item => item.time > now).sort((a, b) => a.time - b.time);
  
  if (todayTimes.length > 0) {
    const nextMed = todayTimes[0];
    document.getElementById('nextDose').textContent = 
      `${nextMed.medicine.name} at ${formatTime(nextMed.medicine.time)}`;
  } else {
    document.getElementById('nextDose').textContent = medicineData.length > 0 ? `${medicineData[0].name} (${formatTime(medicineData[0].time)})` : 'No more doses today';
  }
  
  const totalPills = medicineData.reduce((sum, med) => sum + (parseInt(med.remaining) || 0), 0);
  document.getElementById('totalPills').textContent = `${totalPills} remaining`;
  document.getElementById('lastTaken').textContent = 'Today 08:00 AM';
  document.getElementById('activeAlerts').textContent = `${alerts.length} notifications`;
}

// Schedule Functions
function updateScheduleTable() {
  const tbody = document.getElementById('schedule-table');
  if (!tbody) return;

  if (medicineData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">No medicines scheduled. Add a new medicine or log in to sync.</td></tr>';
    return;
  }
  
  tbody.innerHTML = medicineData.map(med => `
    <tr>
      <td><strong>${med.name}</strong></td>
      <td>${med.dosage}</td>
      <td>${formatTime(med.time)}</td>
      <td><span class="badge">${formatFrequency(med.frequency)}</span></td>
      <td>${med.uses || 'General'}</td>
      <td>
        <button onclick="editMedicine('${med.id}')" class="btn-sm" style="margin-right: 0.3rem;">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button onclick="deleteMedicine('${med.id}')" class="btn-sm btn-danger">
          <i class="fas fa-trash"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

// Inventory Functions
function updateInventoryTable() {
  const tbody = document.getElementById('inventory-table');
  if (!tbody) return;

  if (inventoryData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">No inventory data. Please add medicines to track stock.</td></tr>';
    return;
  }
  
  tbody.innerHTML = inventoryData.map(med => {
    const status = getStockStatus(med);
    return `
      <tr>
        <td><strong>${med.name}</strong></td>
        <td>${med.stock}</td>
        <td>${med.remaining}</td>
        <td>${formatDate(med.expiry)}</td>
        <td><span class="status-badge ${status.class}">${status.text}</span></td>
        <td>
          <button onclick="restockMedicine('${med.id}')" class="btn-sm">
            <i class="fas fa-plus"></i> Restock
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function getStockStatus(medicine) {
  const remaining = parseInt(medicine.remaining) || 0;
  const stock = parseInt(medicine.stock) || 1;
  const percentage = (remaining / stock) * 100;
  const expiryDate = new Date(medicine.expiry);
  const today = new Date();
  const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysToExpiry < 30) {
    return { class: 'expiring', text: 'Expiring Soon' };
  } else if (percentage < 20) {
    return { class: 'low', text: 'Low Stock' };
  } else if (percentage < 50) {
    return { class: 'medium', text: 'Medium Stock' };
  } else {
    return { class: 'good', text: 'Good Stock' };
  }
}

// Medicine Management Functions (Firebase Write Operations)
function showAddMedicineForm() {
  document.getElementById('addMedicineModal').classList.add('active');
  const form = document.getElementById('addMedicineForm');
  form.reset();
  form.onsubmit = function(e) {
    e.preventDefault();
    addNewMedicine();
  };
}

function closeAddMedicineForm() {
  document.getElementById('addMedicineModal').classList.remove('active');
  document.getElementById('addMedicineForm').reset();
}

function setupFormEventListeners() {
  const addForm = document.getElementById('addMedicineForm');
  if (addForm) {
    addForm.addEventListener('submit', function(e) {
      e.preventDefault();
      addNewMedicine();
    });
  }
}

// Write New Medicine to Firebase
function addNewMedicine() {
  const name = document.getElementById('medicineName').value;
  const dosage = document.getElementById('medicineDosage').value;
  const time = document.getElementById('medicineTime').value;
  const frequency = document.getElementById('medicineFrequency').value;
  const uses = document.getElementById('medicineUses').value;
  const stock = parseInt(document.getElementById('medicineStock').value);
  const expiry = document.getElementById('medicineExpiry').value;
  
  const medId = currentAuthUser ? firebase.database().ref().child(`users/${currentAuthUser.uid}/medicines`).push().key : 'med_' + Date.now();

  const newMedicine = {
    id: medId,
    name,
    dosage,
    time,
    frequency,
    uses,
    stock,
    remaining: stock,
    expiry,
    createdAt: new Date().toISOString()
  };
  
  if (currentAuthUser && firebase.database) {
    // Write to Website_Data tree
    const updates = {};
    updates[`Website_Data/users/${currentAuthUser.uid}/medicines/${medId}`] = newMedicine;
    updates[`users/${currentAuthUser.uid}/medicines/${medId}`] = newMedicine;
    
    firebase.database().ref().update(updates)
      .then(() => {
        closeAddMedicineForm();
        showNotification('Medicine added to Website Data!', 'success');
      })
      .catch(error => {
        showNotification(error.message || 'Error adding medicine', 'error');
      });
  } else {
    // Offline mode fallback
    const localUid = currentUser ? currentUser.id : 'local_1';
    medicineData.push(newMedicine);
    inventoryData = [...medicineData];
    localStorage.setItem(`smb_medicines_${localUid}`, JSON.stringify(medicineData));

    updateScheduleTable();
    updateInventoryTable();
    updateDashboard();
    generateAlerts();
    closeAddMedicineForm();
    showNotification('Medicine added successfully!', 'success');
  }
}

function editMedicine(id) {
  const medicine = medicineData.find(med => String(med.id) === String(id));
  if (medicine) {
    document.getElementById('medicineName').value = medicine.name || '';
    document.getElementById('medicineDosage').value = medicine.dosage || '';
    document.getElementById('medicineTime').value = medicine.time || '';
    document.getElementById('medicineFrequency').value = medicine.frequency || '';
    document.getElementById('medicineUses').value = medicine.uses || '';
    document.getElementById('medicineStock').value = medicine.stock || '';
    document.getElementById('medicineExpiry').value = medicine.expiry || '';
    
    document.getElementById('addMedicineModal').classList.add('active');
    
    const form = document.getElementById('addMedicineForm');
    form.onsubmit = function(e) {
      e.preventDefault();
      updateMedicine(id);
    };
  }
}

function updateMedicine(id) {
  const updatedData = {
    name: document.getElementById('medicineName').value,
    dosage: document.getElementById('medicineDosage').value,
    time: document.getElementById('medicineTime').value,
    frequency: document.getElementById('medicineFrequency').value,
    uses: document.getElementById('medicineUses').value,
    stock: parseInt(document.getElementById('medicineStock').value),
    expiry: document.getElementById('medicineExpiry').value,
    updatedAt: new Date().toISOString()
  };

  if (currentAuthUser && firebase.database) {
    firebase.database().ref(`users/${currentAuthUser.uid}/medicines/${id}`).update(updatedData)
      .then(() => {
        closeAddMedicineForm();
        showNotification('Medicine updated in Firebase!', 'success');
      })
      .catch(error => {
        showNotification(error.message || 'Failed to update medicine', 'error');
      });
  } else {
    const localUid = currentUser ? currentUser.id : 'local_1';
    const index = medicineData.findIndex(med => String(med.id) === String(id));
    if (index !== -1) {
      medicineData[index] = { ...medicineData[index], ...updatedData };
      const invIndex = inventoryData.findIndex(med => String(med.id) === String(id));
      if (invIndex !== -1) inventoryData[invIndex] = { ...medicineData[index] };
      localStorage.setItem(`smb_medicines_${localUid}`, JSON.stringify(medicineData));

      updateScheduleTable();
      updateInventoryTable();
      updateDashboard();
      closeAddMedicineForm();
      showNotification('Medicine updated!', 'success');
    }
  }
}

function deleteMedicine(id) {
  if (confirm('Are you sure you want to delete this medicine?')) {
    if (currentAuthUser && firebase.database) {
      firebase.database().ref(`users/${currentAuthUser.uid}/medicines/${id}`).remove()
        .then(() => {
          showNotification('Medicine removed from Firebase!', 'success');
        })
        .catch(error => {
          showNotification(error.message || 'Failed to delete medicine', 'error');
        });
    } else {
      const localUid = currentUser ? currentUser.id : 'local_1';
      medicineData = medicineData.filter(med => String(med.id) !== String(id));
      inventoryData = inventoryData.filter(med => String(med.id) !== String(id));
      localStorage.setItem(`smb_medicines_${localUid}`, JSON.stringify(medicineData));

      updateScheduleTable();
      updateInventoryTable();
      updateDashboard();
      generateAlerts();
      showNotification('Medicine deleted', 'success');
    }
  }
}

function restockMedicine(id) {
  const quantityStr = prompt('Enter restock quantity:');
  const quantity = parseInt(quantityStr);
  if (quantityStr && !isNaN(quantity) && quantity > 0) {
    const med = inventoryData.find(m => String(m.id) === String(id));
    if (med) {
      const newRemaining = (parseInt(med.remaining) || 0) + quantity;
      const newStock = (parseInt(med.stock) || 0) + quantity;

      if (currentAuthUser && firebase.database) {
        firebase.database().ref(`users/${currentAuthUser.uid}/medicines/${id}`).update({
          remaining: newRemaining,
          stock: newStock
        }).then(() => {
          showNotification(`Restocked ${quantity} units in Firebase!`, 'success');
        });
      } else {
        med.remaining = newRemaining;
        med.stock = newStock;
        updateInventoryTable();
        updateDashboard();
        generateAlerts();
        showNotification(`Restocked ${quantity} units`, 'success');
      }
    }
  }
}

// Control Panel Functions
function testConnection() {
  const statusDiv = document.getElementById('connectionStatus');
  if (statusDiv) statusDiv.textContent = 'Testing Firebase Cloud Write...';
  if (window.testFirebaseWrite) {
    window.testFirebaseWrite();
  } else {
    showNotification('Firebase test module loading...', 'info');
  }
}

function syncData() {
  const lastSyncDiv = document.getElementById('lastSync');
  lastSyncDiv.textContent = 'Syncing with Firebase...';
  
  if (currentAuthUser && firebase.database) {
    firebase.database().ref(`users/${currentAuthUser.uid}`).once('value')
      .then(() => {
        const now = new Date();
        lastSyncDiv.textContent = `Last sync: ${now.toLocaleTimeString()}`;
        showNotification('Data synced with Firebase successfully!', 'success');
      })
      .catch(err => {
        showNotification('Sync failed: ' + err.message, 'error');
      });
  } else {
    setTimeout(() => {
      const now = new Date();
      lastSyncDiv.textContent = `Last sync: ${now.toLocaleTimeString()}`;
      showNotification('Local data updated!', 'success');
    }, 1000);
  }
}

// Alerts Functions
function generateAlerts() {
  alerts = [];
  
  if (medicineData.length === 0) {
    updateAlertsList();
    return;
  }
  
  inventoryData.forEach(med => {
    const remaining = parseInt(med.remaining) || 0;
    const stock = parseInt(med.stock) || 1;
    const percentage = (remaining / stock) * 100;
    if (percentage < 20) {
      alerts.push({
        type: 'medicine',
        priority: 'urgent',
        title: 'Low Stock Alert',
        message: `${med.name} is running low (${remaining} remaining)`,
        timestamp: new Date()
      });
    }
  });
  
  inventoryData.forEach(med => {
    if (!med.expiry) return;
    const expiryDate = new Date(med.expiry);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysToExpiry < 30 && daysToExpiry > 0) {
      alerts.push({
        type: 'medicine',
        priority: 'medium',
        title: 'Medicine Expiring Soon',
        message: `${med.name} expires in ${daysToExpiry} days`,
        timestamp: new Date()
      });
    }
  });
  
  updateAlertsList();
}

function updateAlertsList() {
  const alertsList = document.getElementById('alerts-list');
  if (!alertsList) return;

  if (alerts.length === 0) {
    alertsList.innerHTML = `
      <li class="alert-item">
        <i class="fas fa-info-circle"></i>
        <div>
          <strong>No active alerts</strong>
          <p>All medication levels and schedules are optimal</p>
        </div>
      </li>
    `;
    return;
  }
  
  alertsList.innerHTML = alerts.map(alert => `
    <li class="alert-item ${alert.priority}">
      <i class="fas fa-${getAlertIcon(alert.type)}"></i>
      <div>
        <strong>${alert.title}</strong>
        <p>${alert.message}</p>
        <small>${alert.timestamp.toLocaleString()}</small>
      </div>
    </li>
  `).join('');
}

function filterAlerts(filter) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => btn.classList.remove('active'));
  
  const activeBtn = document.querySelector(`[onclick="filterAlerts('${filter}')"]`);
  if (activeBtn) activeBtn.classList.add('active');
  
  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(alert => 
    alert.type === filter || alert.priority === filter
  );
  
  const alertsList = document.getElementById('alerts-list');
  if (filteredAlerts.length === 0) {
    alertsList.innerHTML = `
      <li class="alert-item">
        <i class="fas fa-info-circle"></i>
        <div>
          <strong>No ${filter} alerts</strong>
          <p>No alerts found for this filter category</p>
        </div>
      </li>
    `;
    return;
  }
  
  alertsList.innerHTML = filteredAlerts.map(alert => `
    <li class="alert-item ${alert.priority}">
      <i class="fas fa-${getAlertIcon(alert.type)}"></i>
      <div>
        <strong>${alert.title}</strong>
        <p>${alert.message}</p>
        <small>${alert.timestamp.toLocaleString()}</small>
      </div>
    </li>
  `).join('');
}

function getAlertIcon(type) {
  const icons = {
    medicine: 'pills',
    system: 'cog',
    urgent: 'exclamation-triangle'
  };
  return icons[type] || 'info-circle';
}

// Profile Functions (Firebase Sync)
function loadUserProfile() {
  if (!currentUserProfile && !currentUser) return;
  
  const p = currentUserProfile || currentUser || {};
  document.getElementById('profileName').value = p.name || p.firstName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';
  document.getElementById('profileGender').value = p.gender || '';
  document.getElementById('profileAge').value = p.age || '';
  document.getElementById('profileDisease').value = p.disease || '';
  document.getElementById('profileSymptoms').value = p.symptoms || '';
  document.getElementById('profileDoctor').value = p.doctor || '';
  document.getElementById('profileContact').value = p.contact || '';
}

function saveProfile() {
  const name = document.getElementById('profileName').value;
  const gender = document.getElementById('profileGender').value;
  const age = parseInt(document.getElementById('profileAge').value) || 0;
  const disease = document.getElementById('profileDisease').value;
  const symptoms = document.getElementById('profileSymptoms').value;
  const doctor = document.getElementById('profileDoctor').value;
  const contact = document.getElementById('profileContact').value;
  
  const profileUpdates = {
    name,
    gender,
    age,
    disease,
    symptoms,
    doctor,
    contact,
    updatedAt: new Date().toISOString()
  };

  if (currentAuthUser && firebase.database) {
    firebase.database().ref(`users/${currentAuthUser.uid}/profile`).update(profileUpdates)
      .then(() => {
        document.getElementById('userName').textContent = name || currentAuthUser.email;
        document.getElementById('welcomeUserName').textContent = name || currentAuthUser.email;
        showNotification('Profile updated in Firebase!', 'success');
      })
      .catch(err => {
        showNotification(err.message || 'Failed to save profile', 'error');
      });
  } else {
    if (currentUser) {
      Object.assign(currentUser, profileUpdates);
      document.getElementById('userName').textContent = name;
      document.getElementById('welcomeUserName').textContent = name;
      showNotification('Profile saved locally', 'success');
    } else {
      showNotification('Please log in to save profile', 'error');
    }
  }
}

// Caretaker Functions (Firebase Write Operations)
function addCaretaker() {
  const name = document.getElementById('caretakerName').value;
  const relation = document.getElementById('caretakerRelation').value;
  const phone = document.getElementById('caretakerPhone').value;
  const email = document.getElementById('caretakerEmail').value;
  
  if (!name || !relation || !phone) {
    showNotification('Please fill in all required caretaker fields', 'error');
    return;
  }

  const caretakerId = currentAuthUser ? firebase.database().ref().child(`users/${currentAuthUser.uid}/caretakers`).push().key : 'ct_' + Date.now();
  
  const newCaretaker = {
    id: caretakerId,
    name,
    relation,
    phone,
    email,
    addedDate: new Date().toISOString()
  };
  
  if (currentAuthUser && firebase.database) {
    firebase.database().ref(`users/${currentAuthUser.uid}/caretakers/${caretakerId}`).set(newCaretaker)
      .then(() => {
        document.getElementById('caretakerForm').reset();
        showNotification('Caretaker added to Firebase!', 'success');
      })
      .catch(err => {
        showNotification(err.message || 'Failed to add caretaker', 'error');
      });
  } else {
    caretakers.push(newCaretaker);
    updateCaretakersList();
    document.getElementById('caretakerForm').reset();
    showNotification('Caretaker added locally', 'success');
  }
}

function updateCaretakersList() {
  const caretakersList = document.getElementById('caretakers-list');
  if (!caretakersList) return;

  if (caretakers.length === 0) {
    caretakersList.innerHTML = `
      <li class="caretaker-item">
        <div class="caretaker-info">
          <strong>No caretakers added</strong>
          <p>Add caretakers to receive instant medication notifications</p>
        </div>
      </li>
    `;
    return;
  }
  
  caretakersList.innerHTML = caretakers.map(caretaker => `
    <li class="caretaker-item">
      <div class="caretaker-info">
        <strong>${caretaker.name}</strong>
        <p>${formatRelation(caretaker.relation)} • ${caretaker.phone}</p>
        ${caretaker.email ? `<p>${caretaker.email}</p>` : ''}
      </div>
      <button onclick="removeCaretaker('${caretaker.id}')" class="btn-sm btn-danger">
        <i class="fas fa-trash"></i>
      </button>
    </li>
  `).join('');
}

function removeCaretaker(id) {
  if (confirm('Are you sure you want to remove this caretaker?')) {
    if (currentAuthUser && firebase.database) {
      firebase.database().ref(`users/${currentAuthUser.uid}/caretakers/${id}`).remove()
        .then(() => {
          showNotification('Caretaker removed from Firebase!', 'success');
        })
        .catch(err => {
          showNotification(err.message || 'Failed to remove caretaker', 'error');
        });
    } else {
      caretakers = caretakers.filter(ct => String(ct.id) !== String(id));
      updateCaretakersList();
      showNotification('Caretaker removed', 'success');
    }
  }
}

// Logout Handler
function handleLogout() {
  if (firebase && firebase.auth) {
    firebase.auth().signOut().then(() => {
      showNotification('Signed out successfully. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 800);
    }).catch(err => {
      showNotification('Sign out error: ' + err.message, 'error');
    });
  } else {
    window.location.href = 'login.html';
  }
}

// Theme Functions
function setTheme(theme) {
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  
  const themeBtns = document.querySelectorAll('.theme-btn');
  themeBtns.forEach(btn => btn.classList.remove('active'));
  
  const activeBtn = document.querySelector(`[onclick="setTheme('${theme}')"]`);
  if (activeBtn) activeBtn.classList.add('active');
  
  localStorage.setItem('smart-medicine-theme', theme);
  showNotification(`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme applied!`, 'success');
}

function loadTheme() {
  const savedTheme = localStorage.getItem('smart-medicine-theme') || 'light';
  setTheme(savedTheme);
}

// Utility Functions
function formatTime(timeString) {
  if (!timeString) return '12:00 PM';
  const parts = timeString.split(':');
  if (parts.length < 2) return timeString;
  const hour = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatFrequency(frequency) {
  const frequencies = {
    'daily': 'Daily',
    'twice-daily': '2x Daily',
    'thrice-daily': '3x Daily',
    'weekly': 'Weekly',
    'as-needed': 'As Needed'
  };
  return frequencies[frequency] || frequency || 'Daily';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatRelation(relation) {
  const relations = {
    'family': 'Family Member',
    'friend': 'Friend',
    'nurse': 'Nurse',
    'doctor': 'Doctor',
    'other': 'Other'
  };
  return relations[relation] || relation;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${getNotificationIcon(type)}"></i>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="notification-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

function getNotificationIcon(type) {
  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };
  return icons[type] || 'info-circle';
}

// Global Exports
window.handleLogout = handleLogout;
window.simulateRFIDScan = simulateRFIDScan;
window.showSection = showSection;
window.showAddMedicineForm = showAddMedicineForm;
window.closeAddMedicineForm = closeAddMedicineForm;
window.editMedicine = editMedicine;
window.deleteMedicine = deleteMedicine;
window.restockMedicine = restockMedicine;
window.testConnection = testConnection;
window.syncData = syncData;
window.filterAlerts = filterAlerts;
window.saveProfile = saveProfile;
window.addCaretaker = addCaretaker;
window.removeCaretaker = removeCaretaker;
window.setTheme = setTheme;

console.log('Smart Medicine Box Pro JavaScript loaded successfully!');