# Saudi Academic AI Assistant

This repository provides a starter implementation for "دليلك الجامعي"—a Najdi Arabic academic assistant that runs fully on-premise for Saudi universities. It includes a Node.js/Express backend, a React frontend, Python-based document processing utilities, and scaffolding for fine-tuning a compact LLM through Ollama.

## Project Structure

```
/ai-assistant/
├── backend/              # Node.js API, chat orchestration, file uploads
├── frontend/             # React single page app (Vite)
├── models/               # Base and fine-tuned weights
├── data/university_docs/ # Source documents for LoRA / QLoRA
├── database/schema.sql   # MySQL schema dump
├── .env.example          # Environment variable template
└── README.md             # This guide
```

## Backend Overview

* **Authentication** via JWT (student ID + password).
* **Chat orchestration** integrates student memory, university schedule, and Ollama responses.
* **File uploads** (PDF, DOCX, PPT/PPTX, images) up to 2.5 MB, routed to a Python extractor that uses LangChain loaders and Tesseract OCR.
* **Personalization** stores per-user summaries and facts, refreshing the system prompt each turn.
* **Admin dashboard** exposes aggregate counts, latest uploads, and potential fine-tuning sources.
* **Automated cleanup** removes uploads older than one week through a cron task.

Key entry points:

* `backend/server.js` – Express server bootstrap
* `backend/routes/*.js` – Auth, chat, uploads, admin endpoints
* `backend/controllers/*.js` – Business logic for each route group
* `backend/utils/` – Ollama client, prompt builder, summarizer, file extractor, JWT middleware
* `backend/utils/text_extractor.py` – LangChain/Tesseract-powered document parsing utility

Install dependencies with:

```bash
cd backend
npm install
```

Run the API (after configuring `.env`):

```bash
npm run dev
```

The server listens on `PORT` (default `4000`).

## Frontend Overview

The Vite React app implements login, student dashboard, chat interface, and admin view.

* `frontend/src/App.jsx` – Router setup for Login, Dashboard, Chat, Admin pages
* `frontend/src/pages/*.jsx` – Page components styled for RTL Arabic
* `frontend/src/styles/` – Global and per-page CSS

To run the SPA:

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to the backend by default.

## Database Schema

Import `database/schema.sql` into MySQL (or compatible server) to create required tables:

```sql
SOURCE database/schema.sql;
```

Tables:

* `users` – student profiles, hashed credentials, schedules, persisted memories
* `chats` – JSON chat transcripts plus summarised memory strings
* `uploads` – metadata for temporary storage files

## Fine-Tuning Workflow

1. Place curated university policy documents under `data/university_docs/`.
2. Ensure a compatible base model exists in `models/base_model/` (e.g., `llama3.2-3b-instruct-q4` from Ollama or LM Studio).
3. Configure Python dependencies (PyTorch, bitsandbytes, PEFT, transformers, accelerate).
4. Run LoRA/QLoRA training via WSL using `scripts/finetune.py` (provided below) or adapt to your pipeline:

```bash
accelerate launch scripts/finetune.py \
  --base_model ./models/base_model \
  --data_path ./data/university_docs \
  --output_dir ./models/fine_tuned
```

5. After training, update Ollama/LM Studio to reference the fine-tuned weights and adjust `OLLAMA_MODEL` in `.env`.

### scripts/finetune.py

A reference script is available under `scripts/finetune.py` (see repo). It demonstrates preparing LoRA adapters for a causal language model using data in JSONL or text format.

## Updating the System Prompt

Modify `backend/utils/promptBuilder.js` to tweak tone or inject additional context. Environment variables (`MEMORY_TOKEN_LIMIT`) control how much student memory is appended per request.

## Reloading or Replacing the Model

1. Stop the backend server.
2. Update Ollama (or LM Studio) with the new model tag or weights.
3. Edit `.env` → `OLLAMA_MODEL` and restart `npm run dev` (backend) to pick up the change.

## Deployment Notes

* Designed for Windows 11 with WSL for backend Python tooling; Node/React can run on Windows or WSL.
* GPU inference via Ollama or LM Studio using GTX 1080 Ti and 24 GB RAM; expect ~1–3 s per response with quantized 3B–7B models.
* For LAN/public access, configure reverse proxy (e.g., Caddy/NGINX) and HTTPS certificates.
* Optional Bing/Serper web search can be toggled by `ENABLE_WEB_SEARCH=true` and providing an API key; integrate the logic in `backend/utils/ollamaClient.js` or dedicated module.

## Cron-Based File Retention

`backend/cronDelete.js` schedules hourly cleanup of uploads older than seven days. Ensure the process stays active (use PM2, systemd, or Windows Task Scheduler if running as a service).

## Environment Configuration

Duplicate `.env.example` → `.env` and adjust credentials. Default upload path (`backend/uploads`) is relative to repo root.

## Testing Checklist

* `npm run dev` (backend) – verifies Express boots and database migrations execute.
* `npm run dev` (frontend) – ensures Vite builds the SPA.
* Sample file upload (≤2.5 MB) – validates Python extractor and DB write.
* Chat interaction – confirms Ollama connectivity and memory persistence.

## Scripts Directory

The repository includes helper scripts in `scripts/` for fine-tuning and maintenance. Review comments within each script for configuration flags and prerequisites.

## License

Released under the MIT license. Adapt and extend for your university's needs.
