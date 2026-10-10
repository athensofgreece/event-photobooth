# 📸 Node.js Event Photobooth & Kiosk System

A full-stack Node.js and Express web application designed for live events, weddings, and church gatherings. It features automated webcam multi-shot capture, dynamic overlay frame rendering, local session logging, and a fault-tolerant background email queue to deliver high-resolution photo strips directly to guests in real time.

---

## 🚀 Key Features

* **Automated Multi-Shot Capture:** Seamlessly sequences photo sessions and merges captures into custom strip layouts using transparent frame templates.
* **Fault-Tolerant Background Email Queue:** Built specifically for event venues with unreliable Wi-Fi. Photos are written to local disk first, and an async background process retries failed email dispatches every 30 seconds via `nodemailer`.
* **Local File-System Management:** Automatically organizes guest sessions into distinct directories, writes `session.json` state files, compiles metadata into a `emails.csv` log, and dynamically serves PNG frames.
* **Kiosk Interface:** Configured for standalone desktop operation (e.g., Google Chrome in full-screen kiosk mode) with camera settings and custom frame testing built into the UI.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Email Transport:** Nodemailer (SMTP / Brevo integration)
* **Storage / Persistence:** Node.js File System (`fs`), JSON metadata, CSV logs
* **Frontend:** HTML5, CSS3, JavaScript (DOM / Canvas API)

---

## ⚙️ Local Setup & Configuration

### Prerequisites
* **Node.js:** v20.0.0 or higher

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/photobooth.git
   cd photobooth
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment template and configure your SMTP credentials (e.g., Gmail App Passwords or SMTP Relay):
   ```bash
   cp .env.example .env
   ```

   *Example `.env` configuration:*
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourbooth@gmail.com
   SMTP_PASS=your-app-password
   MAIL_FROM="Our Photobooth <yourbooth@gmail.com>"
   MAIL_SUBJECT="Your photobooth pictures!"
   ```

4. **Start the Server:**
   ```bash
   npm start
   ```

5. **Launch Kiosk Mode:**
   Open Chrome in full-screen kiosk mode targeting the local server:
   ```bash
   chrome --kiosk http://localhost:3000
   ```

---

## 📁 Project Directory Structure

```text
├── data/              # Storage directory for active overlay frame (frame.png)
├── public/            # Static assets, UI styling, dynamic frame assets
├── sessions/          # Auto-generated guest session folders & emails.csv
├── .env.example       # Environment configuration template
├── README.md          # Project documentation
├── package.json       # Project dependencies and scripts
└── server.js          # Main Express server, API routing & background queue
```

---

## 💡 Technical Highlights

* **Network Resilience:** Uses an isolated `flush()` background worker tied to a recurring `setInterval` loop to prevent network drops from impacting the guest experience.
* **Base64 Processing:** Encodes camera raw frames on the client side and decodes them via Node.js `Buffer` utilities for filesystem operations.
