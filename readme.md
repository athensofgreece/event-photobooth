# 📸 Event Photobooth

A browser-based event photobooth kiosk built with Node.js and Express. Guests can take a multi-photo strip, preview or retake their photos, and optionally receive the final strip by email. Photo sessions are saved locally first, so email delivery can continue in the background—even when venue Wi-Fi is unreliable.

![Photobooth screenshot](photobooth-screenshot.png)

## ✨ Features

- **Multi-shot photo strips** — Capture a sequence of photos with a countdown and combine them into a single photo strip.
- **Live camera preview** — Select a camera, mirror the preview/photos, and optionally enable countdown sounds.
- **Retakes** — Review the strip and retake the session before sending or saving.
- **Custom photo frames** — Upload a PNG overlay from the booth settings.
- **Adaptive Theme** — Upload an event poster, invitation, or reference image to generate a matching color palette locally in the browser. Preview and shuffle colors, then apply or reset the theme.
- **Event customization** — Set event title, subtitle/details, date/time, location, and an optional event logo.
- **Email delivery** — Send photo strips through SMTP (such as Gmail or Brevo SMTP).
- **Local-first saving** — Images and session details are saved to the local machine before email is attempted.
- **Background email queue** — Pending emails are retried every 30 seconds, up to 20 attempts. Failed items remain marked as failed after restart instead of being silently requeued.
- **Kiosk-friendly interface** — Designed to run full-screen in Chrome for events.

## 🧰 Tech stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js 20.6+ |
| Server | Express 4 |
| Email | Nodemailer + SMTP |
| Front end | HTML, CSS, JavaScript |
| Camera | Web Media API (`getUserMedia`) |
| Photo composition | Canvas API |
| Storage | Local files (JPEG, JSON, CSV) |

## 🚀 Getting started

### Requirements

- Node.js **20.6 or newer**
- Chrome or another modern browser with camera support
- Webcam/camera access
- SMTP credentials if email delivery is needed

### Installation

```bash
git clone https://github.com/athensofgreece/event-photobooth.git
cd event-photobooth
npm install
```

Create a local environment file from the example:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**
```bash
cp .env.example .env
```

Edit `.env` with your SMTP settings (see [Email configuration](#-email-configuration)). Then start the kiosk:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in Chrome. Allow camera access when prompted.

For full-screen kiosk use, open Chrome in kiosk mode:

**Windows:**
```powershell
chrome.exe --kiosk http://localhost:3000
```

## ⚙️ Booth settings

Open **Settings & frame** from the kiosk to access booth controls.

- Choose a camera
- Upload or preview a PNG photo frame
- Adjust the pre-capture countdown
- Set the countdown between photos
- Toggle countdown sounds
- Toggle mirrored preview/photos
- Test the frame with a sample photo

### Adaptive Theme

1. Open booth settings.
2. Upload a reference image such as a poster, invitation, or event graphic.
3. Review the extracted color swatches and theme preview.
4. Use **Shuffle colors** to explore variations.
5. Add event title, subtitle/details, date/time, location, and optional logo.
6. Select **Apply theme** to use the theme, or **Reset** to restore the default appearance.

Palette extraction runs locally in the browser and does not require an external API.

## ✉️ Email configuration

Email is optional. The photobooth can still capture and save sessions without SMTP credentials.

Configure the following values in your local `.env` file:

| Variable | Description |
| --- | --- |
| `SMTP_HOST` | SMTP server hostname (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (commonly `587`) |
| `SMTP_USER` | SMTP account username/email |
| `SMTP_PASS` | SMTP password or provider-specific app password |
| `MAIL_FROM` | Sender display name and address (e.g., `Event Photobooth <booth@example.com>`) |
| `MAIL_SUBJECT` | Email subject line |
| `HOST` | Server bind address; defaults to `127.0.0.1` |
| `PORT` | Server port; defaults to `3000` |

Example SMTP setup for Gmail:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourbooth@gmail.com
SMTP_PASS=your-gmail-app-password
MAIL_FROM="Event Photobooth <yourbooth@gmail.com>"
MAIL_SUBJECT=Your photobooth photos are ready!
HOST=127.0.0.1
PORT=3000
```

For Gmail, use a Google App Password (with 2-Step Verification enabled), not your normal account password. Other SMTP providers, including Brevo, can be used with their SMTP credentials and server settings.

**Never commit your real `.env` file or email credentials.**

## 💾 Where data is saved

Photobooth sessions are stored locally in the `sessions/` directory, created when the server runs. Each saved session contains the captured images and a `session.json` file with session/email status and event/theme information. When an email address is supplied, the address is also recorded in `sessions/emails.csv`.

- Photos are saved before email delivery is attempted.
- Email queue status is stored with the session.
- There is currently no automatic session/photo retention or cleanup. Remove saved session folders manually when appropriate.

## 🗂️ Project structure

```text
event-photobooth/
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── data/
│   └── frame.png
└── public/
    ├── index.html
    ├── theme.js
    └── img/
        └── default-frame.png
```

The `sessions/` directory is generated at runtime and is not intended to be committed.

## 🔐 Security notes

This project is intended for a **single, trusted event kiosk**.

- The server binds to `127.0.0.1` by default, making it accessible only from the local computer.
- The API does not have user authentication. Do not expose it to the public internet.
- To allow access from other devices on a trusted local network, set `HOST=0.0.0.0` in `.env`. Only do this on a network you trust and understand.
- Uploads and API requests have size and validation checks, and the photo/frame endpoints use rate limits.
- Keep SMTP credentials in your private `.env` file. Do not share or commit credentials.

## 🧭 Limitations

- Intended for one booth/server at a time; it is not a multi-user cloud service.
- Email sending requires working internet and valid SMTP settings, though capture and local saving can work without email.
- Guests' photos, session data, and email records are stored on the booth computer until manually cleaned up.
- No automated test suite is currently included.

## 🛣️ Roadmap

- [ ] Session retention and cleanup controls
- [ ] Automated tests for saving and email retry behavior
- [ ] Refactor server logic into smaller modules
- [ ] Guest-friendly QR/download or printing options

## 📄 License

MIT
