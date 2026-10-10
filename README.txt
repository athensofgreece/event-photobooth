PHOTOBOOTH SETUP (Windows)
1. Install Node.js 20 or newer from nodejs.org.
2. Open this folder in a terminal and run:  npm install
3. Copy .env.example to .env and fill in your email (Gmail App Password works).
4. Run:  npm start
5. Open Chrome in kiosk mode:  chrome --kiosk http://localhost:3000
6. Tap the faint gear (top right) to pick your camera and upload a frame.

Saved photos and email log: the "sessions" folder (one folder per guest + emails.csv).
Frame: a PNG (any size or shape; the photo strip matches your frame) with transparent windows. The booth finds the windows automatically and takes one photo per window.

UPDATING: copy new files over the old folder. Keep your 'data' (frame) and 'sessions' (photos) folders.
TESTING A FRAME: Settings > 'Test frame with a sample photo', then tap Skip to go back.
