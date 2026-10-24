# 🚀 Vercel Deployment & Live Chrome Extension Guide

**Author:** Muhammad Asif  
**Project:** AI Process Scheduler (Vercel Cloud + Chrome Extension)

---

## 🌐 1. Deploying the Backend to Vercel (Free & Instant)

Your project is already configured with `vercel.json` and `api/index.py` for direct deployment on Vercel.

### Method A: Deploy via GitHub (Recommended)
1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: AI Process Scheduler with Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ai-process-scheduler.git
   git push -u origin main
   ```
2. Open **[vercel.com](https://vercel.com)** and log in.
3. Click **"Add New..."** -> **"Project"**.
4. Select your `ai-process-scheduler` repository from GitHub.
5. Keep default settings and click **"Deploy"**!
6. In ~45 seconds, Vercel will give you a live production URL:
   ```
   https://your-project-name.vercel.app
   ```

### Method B: Deploy via Vercel CLI (1 Command)
In PowerShell at the project root (`AI_Process_scheuler`):
```bash
npx vercel --prod
```
Follow the 3-step prompt, and your backend is live on Vercel!

---

## 🧩 2. Connecting the Chrome Extension to Vercel

1. In Chrome, go to:
   ```
   chrome://extensions
   ```
2. Turn **Developer mode** to **ON** (top right).
3. Click **Load unpacked** (top left).
4. Select the `extension/` folder:
   ```
   C:\Users\Muhammad Asif\Desktop\AI_Process_scheuler\extension
   ```
5. Click the extension icon in your Chrome toolbar.
6. Click the settings icon (**⚙️**) in the top right of the extension header.
7. Paste your live Vercel URL:
   ```
   https://your-project-name.vercel.app/api
   ```
8. Click **"Save & Connect"**.
9. The status dot will glow green: **"Vercel Online"**!

Now, your Chrome extension running on your PC sends real Chrome tabs to your cloud-deployed AI model on Vercel!

---

## 🕯️ 3. Features Available
- **⚡ Scheduler Tab**: FCFS, SJF, Round Robin, Priority, and AI Smart Mode.
- **🌐 Real-Time Chrome**: Live inspection of every running tab renderer, GPU process, and network service.
- **🕯️ Candy Processes**: Glowing Candlestick visualizer where candle body = RAM/Burst and candle wick = CPU intensity! Click "Live Pulse Wave" to see active process fluctuations.
- **📊 Gantt Chart**: Interactive timeline blocks with time axis markers.
- **🕹️ CPU Simulation**: Play, pause, step forward, and adjust speed.
- **⚖️ Compare Arena**: Side-by-side benchmark across 5 algorithms.
