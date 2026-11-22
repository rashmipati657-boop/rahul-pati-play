# 🕹️ Retro Pixel Arcade - Pay-to-Play with FamPay UPI

A retro-styled online arcade featuring **10 classic retro / 1D games**, monetized via **direct FamPay & UPI transfers**. No middlemen or gateway cuts — entry payments transfer straight to your personal FamPay account in Indian Rupees (INR) or USD equivalents.

---

## 🎮 Included 10 Retro Games

| # | Game Title | Category | Entry Fee (INR) | USD Equivalent |
|---|---|---|---|---|
| 1 | **Sticky Ninja Runner** | 1D / Stick Game | ₹10 | $0.12 |
| 2 | **Retro Snakes & Ladders** | 100-Tile Classic Board | ₹25 | $0.30 |
| 3 | **Nokia 3310 Snake** | Retro Green LCD | ₹10 | $0.12 |
| 4 | **1D Retro Pong Duel** | 1972 Vintage Duel | ₹15 | $0.18 |
| 5 | **Neon Brick Breaker** | Arcade Breakout | ₹20 | $0.25 |
| 6 | **Pixel Space Defender** | 1980 Space Invaders | ₹25 | $0.30 |
| 7 | **Flappy Stick Copter** | 1D Flight Runner | ₹15 | $0.18 |
| 8 | **Retro Pixel Memory** | 16-Card Brain Match | ₹10 | $0.12 |
| 9 | **Classic Minesweeper** | Windows 95 Deduction | ₹20 | $0.25 |
| 10 | **Neon Tic-Tac-Toe** | Smart AI & 2-Player | ₹10 | $0.12 |

---

## ⚡ How FamPay UPI Integration Works

1. **Direct UPI Deep Link (`upi://pay?pa=...`)**:
   - When users visit from mobile phones, tapping **"PAY ON FAMPAY / UPI"** automatically launches their installed FamPay, Google Pay, PhonePe, or Paytm app with the exact rupee amount and your FamPay ID pre-filled.
2. **Dynamic Live QR Code**:
   - When users visit from a desktop, computer, or tablet, the app dynamically generates a UPI QR code on the screen. Users scan it using their FamPay app to instantly transfer the funds.
3. **Zero Payment Gateway Commissions**:
   - Payments do not go through 3rd-party aggregators that charge 2% fees or require business registration. The money lands directly into your personal UPI / FamPay handle.

---

## ⚙️ How to Connect Your FamPay Account

### Method 1: In the UI (Instant Live Testing)
1. Open the website.
2. Click the **"⚙️ FAMPAY SETUP"** button in the top navigation bar.
3. Type your FamPay UPI ID (e.g. `yourname@fam` or `9876543210@fam`) and your Receiver Display Name.
4. Click **"SAVE SETTINGS"**. All QR codes and UPI links will now point to your FamPay account!

### Method 2: Permanent Configuration for Online Hosting
Open `src/config/fampayConfig.js` and edit line 4:
```javascript
export const DEFAULT_CONFIG = {
  fampayId: 'YOUR_NAME@fam', // <-- PUT YOUR FAMPAY UPI ID HERE
  receiverName: 'YOUR_NAME Retro Arcade',
  currency: 'INR',
  testMode: false,
};
```
Then run `npm run build`.

---

## 🚀 How to Host This Website Online (100% Free)

### Option A: 1-Click Free Deploy with Vercel (Recommended)
1. Create a free account at [vercel.com](https://vercel.com).
2. Install Vercel CLI or link your GitHub repository:
   ```bash
   npm install -g vercel
   vercel
   ```
3. Follow the prompts. Your site will be live online on a global HTTPS link like `https://retro-arcade-fampay.vercel.app` in under 60 seconds!

### Option B: Drag-and-Drop Free Deploy with Netlify
1. Run `npm run build` inside this project directory.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag and drop the `dist` folder into the Netlify Drop page.
4. Your website is instantly live!

### Option C: GitHub Pages
1. Push this folder to a GitHub repository.
2. Go to **Settings > Pages** and select GitHub Actions or Deploy from Branch (`dist`).

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```
