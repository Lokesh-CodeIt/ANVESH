# ANVESH: Complete Cloud Hosting & Deployment Guide

This guide explains how to host the **ANVESH** platform (both FastAPI backend and React frontend together) on **Render** or **Railway** using the provided production Docker configuration.

---

## 🚀 Option 1: Deploy on Render (Recommended — Free Tier Available)

[Render.com](https://render.com) offers free web service hosting and natively supports Docker containers and Render Blueprints.

### Step 1: Push the deployment configs to your GitHub repository
Run these commands in `ANVESH_repo`:
```bash
git add Dockerfile render.yaml railway.json requirements.txt main.py .dockerignore
git commit -m "Add production Dockerfile, requirements, and Render/Railway deployment configs"
git push origin main
```

### Step 2: Create a Free Account on Render
1. Go to [https://render.com](https://render.com) and sign in using your **GitHub** account.

### Step 3: Launch Web Service
1. Click the **"New +"** button in your dashboard and select **"Web Service"**.
2. Select **"Build and deploy from a Git repository"** and connect your repo: `https://github.com/Lokesh-CodeIt/ANVESH`.
3. Configure settings:
   - **Name:** `anvesh-platform` (or any name you choose)
   - **Language / Environment:** `Docker`
   - **Region:** Choose closest to your users (e.g., Singapore, Frankfurt, Oregon, Ohio)
   - **Branch:** `main`
   - **Instance Type:** `Free`
4. Click **"Deploy Web Service"**.

Render will automatically build the container (compile frontend + install Python requirements + initialize SQLite DB) and assign you a free public HTTPS URL:
```text
https://anvesh-platform.onrender.com
```

---

## 🚆 Option 2: Deploy on Railway

[Railway.app](https://railway.app) provides instant cloud deployments with generous free trial credits and zero setup.

### Step 1: Sign in to Railway
1. Go to [https://railway.app](https://railway.app) and sign in with **GitHub**.

### Step 2: Deploy from GitHub Repo
1. Click **"New Project"** -> **"Deploy from GitHub repo"**.
2. Select `Lokesh-CodeIt/ANVESH`.
3. Railway will detect the `Dockerfile` and `railway.json` automatically and begin the build.

### Step 3: Generate a Public Domain
1. Once deployed, click on your service in the Railway canvas.
2. Go to **Settings** -> **Networking** -> **Generate Domain**.
3. You will get a public live URL like:
```text
https://anvesh-production.up.railway.app
```

---

## 🔑 Logging In on the Hosted Instance

Once deployed, all initial database records (950 cases, policies, radiographs) and demo accounts will be active automatically:

| Role | Email | Password |
|---|---|---|
| **Insurance Reviewer** | `reviewer@insurance.com` | `ReviewerPass123!` |
| **System Administrator** | `admin@medauth.org` | `AdminPass123!` |
| **Hospital / Provider** | `provider@hospital.org` | `ProviderPass123!` |
| **Patient / Member** | `patient@example.com` | `PatientPass123!` |

*(You can also click **"Enter Design Preview"** directly on the sign-in page to explore without credentials).*

