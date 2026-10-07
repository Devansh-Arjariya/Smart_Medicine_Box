// Smart Medicine Box Pro - Decoupled Schema Builder (Website Data vs Device Data)

const firebaseConfig = {
  apiKey: "AIzaSyBCeU1ylkBFp1aBZ8NQEWceEWRdjBfJIgA",
  authDomain: "smart-medicine-box-6559a.firebaseapp.com",
  databaseURL: "https://smart-medicine-box-6559a-default-rtdb.firebaseio.com",
  projectId: "smart-medicine-box-6559a",
  storageBucket: "smart-medicine-box-6559a.firebasestorage.app",
  messagingSenderId: "78721649064",
  appId: "1:78721649064:web:2d0ff77c122379e37f61bd",
  measurementId: "G-4FV0MKD3ET"
};

// Initialize Firebase App
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

/**
 * Initializes distinct database trees for Website Data and Device Data
 */
window.initUserDatabaseSchema = function (user, additionalProfile = {}) {
  if (!firebase.database) return Promise.reject('Firebase Database SDK not loaded');

  const uid = user.uid;
  const userWebRef = firebase.database().ref(`Website_Data/users/${uid}`);

  return userWebRef.once('value').then(snapshot => {
    const existingData = snapshot.val();

    // 1. WEBSITE DATA TREE (Account Profiles, Web Schedules, Caretakers, Inventory)
    if (!existingData || !existingData.profile) {
      const defaultRfid = additionalProfile.rfidTagId || 'SMB-' + uid.substr(0, 6).toUpperCase();
      const userEmail = user.email || (additionalProfile.email ? additionalProfile.email : `guest_${uid.substr(0, 5)}@smb.com`);

      const websiteProfile = {
        firstName: additionalProfile.firstName || (user.displayName ? user.displayName.split(' ')[0] : 'User'),
        lastName: additionalProfile.lastName || (user.displayName ? user.displayName.split(' ').slice(1).join(' ') : ''),
        name: additionalProfile.name || (user.displayName ? user.displayName : (additionalProfile.firstName ? `${additionalProfile.firstName} ${additionalProfile.lastName || ''}`.trim() : 'Smart Box User')),
        username: additionalProfile.username || (user.email ? user.email.split('@')[0] : 'user_' + uid.substr(0, 6)),
        email: userEmail,
        rfidTagId: defaultRfid,
        gender: additionalProfile.gender || 'Not specified',
        age: additionalProfile.age || 30,
        disease: additionalProfile.disease || 'General Health Monitoring',
        symptoms: additionalProfile.symptoms || 'Routine medication schedule',
        doctor: additionalProfile.doctor || 'Dr. Healthcare',
        contact: additionalProfile.contact || '+1-800-SMB-CARE',
        createdAt: new Date().toISOString()
      };

      const websiteMedicines = {
        "med_web_1": {
          id: "med_web_1",
          name: "Lisinopril",
          dosage: "10mg",
          time: "08:00",
          frequency: "daily",
          uses: "Blood pressure control",
          stock: 30,
          remaining: 25,
          expiry: "2026-12-31",
          lastTaken: "Today 08:00 AM",
          createdAt: new Date().toISOString()
        },
        "med_web_2": {
          id: "med_web_2",
          name: "Multivitamin",
          dosage: "1 Tablet",
          time: "20:00",
          frequency: "daily",
          uses: "Immune support & health",
          stock: 60,
          remaining: 55,
          expiry: "2027-06-30",
          lastTaken: "Yesterday 08:00 PM",
          createdAt: new Date().toISOString()
        }
      };

      const websiteCaretakers = {
        "ct_web_1": {
          id: "ct_web_1",
          name: "Primary Caregiver",
          relation: "family",
          phone: "+1-555-0199",
          email: "caregiver@example.com",
          addedDate: new Date().toISOString()
        }
      };

      const websiteSettings = {
        theme: "light",
        notificationsEnabled: true,
        lastWebSync: new Date().toISOString()
      };

      const updates = {};
      updates[`Website_Data/users/${uid}/profile`] = websiteProfile;
      updates[`Website_Data/users/${uid}/medicines`] = websiteMedicines;
      updates[`Website_Data/users/${uid}/caretakers`] = websiteCaretakers;
      updates[`Website_Data/users/${uid}/settings`] = websiteSettings;

      // Also support legacy/compat nodes for fallback
      updates[`users/${uid}/profile`] = websiteProfile;
      updates[`users/${uid}/medicines`] = websiteMedicines;

      // 2. DEVICE DATA TREE (Hardware Telemetry, Sensors, Firmware, Box RFID Readers)
      updates[`Device_Data/SmartMedicineBox/device`] = {
        firmwareVersion: "1.0.0",
        gsmStatus: true,
        wifiStatus: true,
        batteryLevel: 95,
        lastSync: new Date().toISOString()
      };

      updates[`Device_Data/SmartMedicineBox/rfidScans`] = {
        lastScannedTag: defaultRfid,
        scannedAt: new Date().toISOString()
      };

      updates[`SmartMedicineBox/device`] = {
        firmwareVersion: "1.0.0",
        gsmStatus: true,
        wifiStatus: true,
        lastSync: new Date().toISOString()
      };

      return firebase.database().ref().update(updates);
    }
  });
};

console.log('Decoupled Schema Builder (Website vs Device) loaded!');

/**
 * Test function to verify direct read/write to Firebase Realtime Database
 */
window.testFirebaseWrite = function () {
  if (typeof firebase === 'undefined' || !firebase.database) {
    alert('Firebase SDK is not loaded on this page.');
    return;
  }

  const testRef = firebase.database().ref('Website_Data/test_connection');
  testRef.set({
    message: "Live Test from Smart Medicine Box Web App",
    timestamp: new Date().toISOString()
  }).then(() => {
    alert('✅ SUCCESS! Firebase Cloud Write Succeeded!\n\nOpen your Firebase Console -> Realtime Database -> Data tab to view the new Website_Data node!');
  }).catch((error) => {
    console.error('Firebase test write error:', error);
    if (error.message && error.message.includes('PERMISSION_DENIED')) {
      alert('❌ PERMISSION DENIED by Firebase Security Rules!\n\nTo fix:\n1. Open Firebase Console -> Realtime Database -> Rules tab.\n2. Change rules to:\n{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}\n3. Click Publish.');
    } else {
      alert('❌ Firebase Write Error: ' + error.message + '\n\nPlease check your Firebase Console Web API Key in firebase-init.js.');
    }
  });
};
