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

## Windows 11 Setup (No WSL Required)

You can run the full stack directly on Windows 11 without installing Ubuntu/WSL. The steps below assume PowerShell.

1. **Install prerequisites**
   - [Node.js 20 LTS or later](https://nodejs.org/) (ships with npm).
   - [Git for Windows](https://git-scm.com/download/win) to clone the repository.
   - [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) or MariaDB for the database. Enable TCP access on `127.0.0.1` and note the root credentials.
   - (Optional) [Python 3.11+ for Windows](https://www.python.org/downloads/windows/) if you plan to run the document-processing helpers.

2. **Clone the repository**
   ```powershell
   git clone <your-fork-url> PSAU
   cd PSAU
   ```

3. **Set up environment variables**
   ```powershell
   copy .env.example .env
   notepad .env
   ```
   Update the MySQL credentials, JWT secret, and Ollama/LM Studio host. Ollama for Windows listens on `http://localhost:11434` by default.

4. **Provision the database**
   - Create a schema in MySQL Workbench or via PowerShell: `mysql -u root -p -e "CREATE DATABASE saudi_assistant;"`
   - Import the schema:
     ```powershell
     mysql -u <user> -p saudi_assistant < database\schema.sql
     ```

5. **Install backend dependencies**
   ```powershell
   cd backend
   npm install
   cd ..
   ```

6. **Install frontend dependencies**
   ```powershell
   cd frontend
   npm install
   cd ..
   ```

7. **(Optional) configure Python helpers**
   ```powershell
   python -m venv backend\.venv
   backend\.venv\Scripts\activate
   pip install langchain pymupdf python-docx python-pptx pytesseract pillow
   ```
   Install Tesseract OCR for Windows if you need image extraction or adjust the packages based on `backend\utils\text_extractor.py`.

8. **Run the backend**
   ```powershell
   npm run dev
   ```
   The root script proxies to the backend's `nodemon` runner and works on Windows because it delegates through a Node helper instead of Unix shell features.

9. **Run the frontend** (in a new PowerShell window)
   ```powershell
   npm run dev:frontend
   ```

10. **Open the app**
    - Backend: http://localhost:4000
    - Frontend (Vite dev server): http://localhost:5173

11. **Confirm LLM connectivity**
    - For Ollama, ensure it exposes `http://localhost:11434` (default) or update `.env` (`LLM_BASE_URL`).
    - For LM Studio, enable the local server and copy its URL into `.env`.
    - For cloud APIs such as Allam, provide the HTTPS endpoint in `.env` and set `LLM_API_KEY`.

12. **Log in and test streaming chat**
    - Seed a user account in MySQL (create a user row manually or via your own SQL script) or register via API.
    - Sign in on the React app and send a prompt; you should see token streaming instead of a static "جارٍ الرد..." bubble.

## Backend Overview

* **Authentication** via JWT (student ID + password).
* **Chat orchestration** integrates student memory, university schedule, and LLM responses (Ollama, Allam, etc.).
* **File uploads** (PDF, DOCX, PPT/PPTX, images) up to 2.5 MB, routed to a Python extractor that uses LangChain loaders and Tesseract OCR.
* **Personalization** stores per-user summaries and facts, refreshing the system prompt each turn.
* **Admin dashboard** exposes aggregate counts, latest uploads, and potential fine-tuning sources.
* **Automated cleanup** removes uploads older than one week through a cron task.

Key entry points:

* `backend/server.js` – Express server bootstrap
* `backend/routes/*.js` – Auth, chat, uploads, admin endpoints
* `backend/controllers/*.js` – Business logic for each route group
* `backend/utils/` – LLM client, prompt builder, summarizer, file extractor, JWT middleware
* `backend/utils/text_extractor.py` – LangChain/Tesseract-powered document parsing utility

Install dependencies with the Windows instructions above or manually:

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

5. After training, update your serving stack (Ollama/LM Studio/Allam) to reference the fine-tuned weights and adjust `LLM_MODEL` in `.env`.

### scripts/finetune.py

A reference script is available under `scripts/finetune.py` (see repo). It demonstrates preparing LoRA adapters for a causal language model using data in JSONL or text format.

## Updating the System Prompt

Modify `backend/utils/promptBuilder.js` to tweak tone or inject additional context. Environment variables (`MEMORY_TOKEN_LIMIT`) control how much student memory is appended per request.

## Reloading or Replacing the Model

1. Stop the backend server.
2. Update Ollama (or LM Studio) with the new model tag or weights.
3. Edit `.env` → `LLM_MODEL` (and `LLM_PROVIDER` if needed) then restart `npm run dev` (backend) to pick up the change.

## Deployment Notes

* Designed for Windows 11; WSL is optional and no longer required for the Node.js stack.
* GPU inference via Ollama or LM Studio using GTX 1080 Ti and 24 GB RAM; expect ~1–3 s per response with quantized 3B–7B models.
* For LAN/public access, configure reverse proxy (e.g., Caddy/NGINX) and HTTPS certificates.
* Optional Bing/Serper web search can be toggled by `ENABLE_WEB_SEARCH=true` and providing an API key; integrate the logic in `backend/utils/llmClient.js` or a dedicated module.

## Cron-Based File Retention

`backend/cronDelete.js` schedules hourly cleanup of uploads older than seven days. Ensure the process stays active (use PM2, systemd, or Windows Task Scheduler if running as a service).

## Environment Configuration

Duplicate `.env.example` → `.env` and adjust credentials. Default upload path (`backend/uploads`) is relative to repo root.

Key LLM variables:

* `LLM_PROVIDER` – `ollama` (default) or `allam`
* `LLM_MODEL` – model identifier/tag for the selected provider
* `LLM_BASE_URL` – HTTP endpoint for the provider (e.g., `http://localhost:11434` or `https://api.allam.world`)
* `LLM_API_KEY` – required for authenticated providers such as Allam
* Optional tuning knobs: `LLM_TEMPERATURE`, `LLM_MAX_OUTPUT_TOKENS`, `LLM_TOP_P`


## Optional: Windows 11 with WSL

If you prefer to keep the backend tooling inside Ubuntu on WSL, follow the original workflow below. The Node.js stack also runs natively as described earlier, so WSL is no longer required.

1. **Install WSL** (if you have not already):
   ```powershell
   wsl --install -d Ubuntu
   ```
   Restart Windows when prompted and create a Unix username/password during the first boot of Ubuntu.

2. **Update the WSL distribution** (inside the Ubuntu terminal):
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Install base tooling inside WSL**:
   ```bash
   sudo apt install -y build-essential python3 python3-venv python3-pip git
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
   Node 20+ is recommended for the backend/frontend and ships with npm.

4. **Clone the repository into WSL** (or copy it into your WSL home directory):
   ```bash
   git clone <your-fork-url> saudi-ai-assistant
   cd saudi-ai-assistant
   ```

5. **Provision MySQL** (choose one of the following):
   - Install MySQL directly on Windows (MySQL Installer) and expose it on `localhost`.
   - _or_ install MariaDB inside WSL:
     ```bash
     sudo apt install -y mariadb-server
     sudo service mariadb start
     sudo mysql_secure_installation
     ```
   Import `database/schema.sql` once the server is running:
   ```bash
   mysql -u <user> -p < database/schema.sql
   ```

6. **Install your preferred inference backend** (Ollama, LM Studio, or connect to an Allam endpoint) and download a compatible quantized model such as `llama3.2:3b-instruct-q4_0` or `mistral:7b-instruct-q4`. Ensure the service listens on `http://localhost:11434` (default for Ollama) or record the HTTPS endpoint for remote providers.

7. **Create and configure the environment file**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set database credentials, JWT secret, upload directory, and the LLM provider settings. Example values for Ollama:
   ```dotenv
   LLM_PROVIDER=ollama
   LLM_MODEL=llama3.2:3b-instruct-q4_0
   LLM_BASE_URL=http://localhost:11434
   DB_HOST=127.0.0.1
   DB_USER=wsldbuser
   DB_PASSWORD=super-secret
   DB_NAME=saudi_assistant
   ```
   For Allam (cloud):
   ```dotenv
   LLM_PROVIDER=allam
   LLM_MODEL=allam-1-13b-instruct
   LLM_BASE_URL=https://api.allam.world
   LLM_API_KEY=your-api-key
   ```

8. **Install backend dependencies** inside WSL:
   ```bash
   cd backend
   npm install
   ```
   Keep this terminal open for running the API server later.

9. **Install frontend dependencies** in a new WSL terminal tab/window:
   ```bash
   cd ~/saudi-ai-assistant/frontend
   npm install
   ```

10. **Set up the Python environment for document extraction** (optional but recommended):
    ```bash
    cd ~/saudi-ai-assistant/backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install langchain pymupdf python-docx python-pptx pytesseract pillow
    ```
    These packages mirror the imports used in `backend/utils/text_extractor.py`. Install any additional dependencies you enable in that script (for example, `torch`, `sentence-transformers`, or `openai`). For OCR, install the Tesseract binary inside WSL (`sudo apt install tesseract-ocr`) or point `pytesseract` to the Windows installation path.

11. **Expose the Ollama/LM Studio port to WSL**. Ollama already binds on `localhost`, which is reachable from WSL 2. If you run LM Studio, make sure it listens on all interfaces or specifically on `127.0.0.1`.

12. **Start the backend** (WSL terminal in `/backend`):
    ```bash
    npm run dev
    ```
    The Express server launches on `http://localhost:4000`. When a chat request arrives, you should now see tokens streamed back to the browser in real time rather than a static “جارٍ الرد...” indicator.

13. **Start the frontend** (separate WSL terminal in `/frontend`):
    ```bash
    npm run dev
    ```
    Vite starts on `http://localhost:5173` and proxies API calls to the backend. Open the URL in any browser on Windows.

14. **Log in and test streaming chat**:
    - Register a test user via the API or seed the database.
    - Sign in on the React app.
    - Send a prompt—the assistant bubble will fill token-by-token as the backend proxies streamed chunks from Ollama.

15. **Optional: keep services running automatically**. For 24/7 availability use PM2 (Node) inside WSL and configure the Ollama/LM Studio service to start with Windows. Schedule `node backend/cronDelete.js` or rely on the built-in cron job to purge expired uploads.

### Launch checklist (Windows)

In summary, each time you power on the workstation:

1. Start Ollama or LM Studio on Windows and make sure the desired model is loaded.
2. Open Ubuntu (WSL) and run `npm run dev` inside `/backend`.
3. In another WSL shell, run `npm run dev` inside `/frontend`.
4. Visit `http://localhost:5173`, log in, and interact with the assistant.

## Testing Checklist

* `npm run dev` (backend) – verifies Express boots and database migrations execute.
* `npm run dev` (frontend) – ensures Vite builds the SPA.
* Sample file upload (≤2.5 MB) – validates Python extractor and DB write.
* Chat interaction – confirms Ollama connectivity and memory persistence.

## Scripts Directory

The repository includes helper scripts in `scripts/` for fine-tuning and maintenance. Review comments within each script for configuration flags and prerequisites.

## License

Released under the MIT license. Adapt and extend for your university's needs.
