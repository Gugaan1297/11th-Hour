# 🌌 11th Hour — Proactive Critical Coach & Survival Kit

[![Built with AI Studio Build](https://img.shields.io/badge/Built%20with-AI%20Studio%20Build-blueviolet?style=flat-square)](https://ai.studio/build)
[![React](https://img.shields.io/badge/Frontend-React%20%26%20Vite-cyan?style=flat-square&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-blue?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Auth-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Google Gemini](https://img.shields.io/badge/AI%20Core-Gemini%20API-de4035?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)

An immersive, full-stack, AI-driven tactical control center designed for anyone drowning in a high-friction crisis. **11th Hour** actively synchronizes with your **Google Workspace (Gmail & Calendar)**, audits incoming deadlines, and deploys a "survival kit" of hyper-focused time blocks, cram-sheets, and polite yet effective deadline extension drafts to keep you from going under.

---

## 🎨 Visual Identity & Brand Design

11th Hour features an eye-safe, premium **Cosmic Slate Theme** styled with high-contrast glowing neon cyan borders, smooth transitions powered by Framer Motion, and micro-interactions designed to reduce visual stress.

<p align="center">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80" alt="11th Hour Cosmic Abstract Identity" width="90%" style="border-radius: 16px; border: 1px solid rgba(6, 182, 212, 0.2); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);" referrerPolicy="no-referrer" />
  <br />
  <em>Conceptual Representation of the App's Adaptive AI Core Interface</em>
</p>

---

## 🚀 Key Architectural Modules

### 1. The Crisis Venting Center
When the panic hits and you feel like you are drowning in a million tasks, enter raw venting descriptions of your workload into the **Crisis Venting Card**. The **Critical Coach**—driven by Google Gemini in the server backend—immediately parses your stress into:
- ⚡ **Tactical Master Timelines**: A clear, hour-by-hour breakdown of exactly what to execute first.
- 🔥 **No-Nonsense Tough-Love Coaching**: Empathetic, highly focused guidance to shut down visual noise, overcome decision paralysis, and execute.
- 🎯 **Tactical Focus Targets**: Key high-value priorities that will actually move the needle.

---

### 2. Workspace Synchronization
Seamlessly connect with your real **Google Workspace** accounts using Firebase OAuth. 11th Hour securely synchronizes with your active Google Calendar events and Gmail inbox to pull down live items, dates, and schedule conflicts.

<p align="center">
  <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" alt="Work space Analytical Sync" width="90%" style="border-radius: 16px; border: 1px solid rgba(6, 182, 212, 0.2); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);" referrerPolicy="no-referrer" />
  <br />
  <em>Real-time Dashboard indexing live Inbox deadlines, workspace synchronization records, and AI coaching recommendations.</em>
</p>

---

### 3. Interactive Tab Matrix System

Navigate across three purpose-built tactical panels designed to handle separate phases of an ongoing crisis:

#### 📅 Panel A: Calendar Focus Scheduler
- Input urgent custom priorities, tasks, and deadlines.
- The system divides them into focused focus slots using interactive timelines.
- Click **Schedule Focus Block** to instantly register standard, formatted time blocks straight inside your real Google Calendar via Workspace integration.

#### 📩 Panel B: Gmail Deadline Audit
- Passively processes your inbox emails to identify ticking timebombs—such as unexpected exams, high-priority deliverable updates, or critical customer inquiries.
- Highlights details and offers immediate, context-appropriate actions (like drafting extensions or custom preparatives) based on the email content.

<p align="center">
  <img src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80" alt="Calendar Planning Grid" width="90%" style="border-radius: 16px; border: 1px solid rgba(6, 182, 212, 0.2); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);" referrerPolicy="no-referrer" />
  <br />
  <em>Chronological scheduling workspace mapping focuses, time allotments, and Google Calendar blockings.</em>
</p>

#### 🧪 Panel C: The Drafting Studio
Generate highly structured, urgent pre-drafts in seconds, customized with context parameters:
- 📖 **Prework Study Sheets**: Detailed, summarized cram sheets of important context or reference links for an upcoming meeting so you never look unprepared.
- 📝 **Extension Email Drafts**: Well-formulated letters asking for deadline extensions dynamically, backed by professional messaging.
- Includes a live editing panel with single-click **Send Gmail Draft** to write and transmit the document using your connected Gmail profile.

---

## 🛠️ Technological Architecture

- **Frontend Core**: React 18, Vite, Type-Safe TypeScript, Tailwind CSS, Lucide Icons.
- **Animations**: Fluid, smooth gestures and element transitions with `framer-motion`.
- **Database / Auth Integration**: Firebase Authentication with Federated Google Credentials, persisting session configurations securely.
- **Server Framework**: Node.js Express server to host the developer proxy wrapper API routing, resolving secure Gmail send hooks, Calendar write methods, and private Gemini sessions safely away from client-side visibility.
- **Artificial Intelligence Engine**: Powerful system prompts on the Google Gemini SDK that dynamically perform clean text generation and structure-checked JSON extraction.

---

## ⚙️ App Setup & Development

To build and run this application locally, ensure you have Node.js and npm installed:

### 1. Configure Secrets & Environment Variables

Create a `.env` file in the root directory (based on `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key
# Additional required Google Workspace Developer Project settings
```

### 2. Install Package Dependencies

```bash
npm install
```

### 3. Boot Local Dev Server

```bash
npm run dev
```
The application will boot a combined development client + server server at `http://localhost:3000`.

### 4. Build for Production

```bash
npm run build
```
The client code compiles into static production assets inside `dist/` and compiles the backend into a fast standalone server binary in `dist/server.cjs`.

---

## 🔒 Security & Privacy

All interactions with the Gmail API, Google Calendar API, and private communications are encrypted end-to-end and handled programmatically. Your information in Gmail and Calendars is indexed on the fly inside memory only and is never serialized to standard telemetry or external logging environments.
