# 💊 Smart Medicine Box (SMB)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase RTDB](https://img.shields.io/badge/Backend-Firebase%20RTDB-orange.svg)](https://firebase.google.com/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-blue.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Web%20%26%20IoT-green.svg)]()

An offline-first Smart Medicine Box (SMB) designed for automated medication management, featuring scheduled dispensing, user authentication, real-time intake and inventory monitoring, local data logging, and cloud synchronization when internet connectivity is available.

---
Visit Site - "https://devansh-arjariya.github.io/Smart_Medicine_Box/"
## ✨ Key Features

- **🔐 Dual Authentication**: Firebase Email/Password login plus instant **RFID Smart Card Simulation** (`CARD001`, `CARD002`).
- **📊 Live Health Dashboard**: Real-time KPI cards for **Next Dose**, **Total Pills Remaining**, **Last Taken Timestamp**, and **Active Alerts**.
- **⏰ Smart Medicine Scheduling**: Dynamic dose timing, frequency (daily, twice-daily), and clinical purpose tracking.
- **📦 Real-Time Inventory & Expiry**: Automatic pill decrement upon intake with visual status badges (`In Stock`, `Low Stock`, `Out of Stock`, `Expired`) and one-click restocking.
- **📡 IoT Hardware Telemetry**: Live status monitoring for Smart Box battery level, Wi-Fi connection, and GSM cellular status.
- **🚨 Smart Alerts & Caregivers**: Overdue dose notifications, low-stock warnings, and emergency caregiver contact registry.
- **🎨 3 UI Themes**: Instant switching between **Light**, **Dark**, and **Nature Green** themes with mobile-responsive design.

---

## ⚙️ Backend & Database Architecture

Powered by **Google Firebase Authentication** and **Firebase Realtime Database (RTDB)** using a decoupled schema:

```text
Firebase Realtime Database
├── Website_Data/users/{uid}/
│   ├── profile/      # Patient details, doctor info, assigned RFID tag
│   ├── medicines/    # Schedule timings, pill dosage, stock & expiry
│   ├── caretakers/   # Emergency contacts and family relations
│   └── settings/     # UI theme & notification preferences
│
└── Device_Data/SmartMedicineBox/
    ├── device/       # Hardware telemetry (battery %, Wi-Fi, GSM status)
    └── rfidScans/    # Last scanned physical RFID card tag & timestamp
```

* **WebSockets Sync**: Bi-directional real-time updates between the web client and physical box.
* **GSM Fallback**: Onboard SIM800L sends emergency SMS alerts to caregivers if Wi-Fi drops or a dose is missed.

---

## 📁 Project Structure

```text
SMB_Website/
├── .gitattributes             # Git line ending normalization
├── .gitignore                  # Git ignore rules
├── firebase.json               # Firebase hosting configuration
├── index.html                  # Root entry point (auto-redirect)
├── LICENSE                     # MIT License
├── README.md                   # Project documentation
└── Home Page/
    ├── home.html & home.css    # Landing showcase page
    ├── login.html & login.css  # Authentication & RFID sign-in
    ├── main.html & style.css   # Main dashboard, schedule & inventory
    ├── script.js               # Application logic & Firebase RTDB sync
    ├── firebase-init.js        # Firebase initialization & schema setup
    └── firebase-config.example.js # Configuration template
```

---

## 🚀 Quick Start (Run Locally)

1. **Using VS Code Live Server (Recommended)**:
   - Open the project folder in VS Code.
   - Right-click [`index.html`](index.html) -> select **"Open with Live Server"**.

2. **Using Python**:
   ```bash
   python -m http.server 8000
   ```
   Open `http://localhost:8000` in your browser.

---

## 🔥 Firebase Configuration

1. In the [Firebase Console](https://console.firebase.google.com/), enable **Email/Password Authentication** and create a **Realtime Database**.
2. Set your Realtime Database rules:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
3. Add your credentials into [`Home Page/firebase-init.js`](Home%20Page/firebase-init.js).

---

## 🐙 Push to GitHub

Run these commands in PowerShell or Command Prompt:

```bash
# 1. Stage all files
git add .

# 2. Commit
git commit -m "feat: complete Smart Medicine Box Pro web & IoT application"

# 3. Set branch to main
git branch -M main

# 4. Connect to your GitHub repository
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY_NAME>.git

# 5. Push to GitHub
git push -u origin main
```

---

## 🌐 Free Hosting (GitHub Pages)

1. Push your repository to GitHub.
2. In your repo, go to **Settings** -> **Pages**.
3. Under **Branch**, select `main` and folder `/ (root)` -> click **Save**.
4. Your website will be live in 1–2 minutes!

---

## 👥 Authors & License

- **Team**: The Developing Dynamos
- **Lead Developer**: Devansh Arjariya
- **License**: [MIT License](LICENSE)
