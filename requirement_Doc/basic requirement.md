# Software Requirements Specification (SRS)

## 1. File Upload and Management (Ref: Section 6: Supabase Object Store)
**Core Objective:** Implement a stable and intuitive mechanism for file uploading, cloud storage, and document previewing.

### 1.1 File Upload Interface (UI/UX & Frontend)
* **Description:** The website must provide a clearly defined "Upload Zone."
* **Detailed Specifications:**
    * Support both **Drag & Drop** and **Click-to-Select** via the system file explorer.
    * Restrict supported file formats strictly to `.pdf` and `.txt`.
    * Provide visual feedback during the upload process (e.g., a loading spinner or progress bar).

### 1.2 Cloud Storage Integration (Backend)
* **Description:** Physical files must be stored in the cloud rather than solely in the local browser.
* **Detailed Specifications:**
    * Integrate APIs to transmit and write files to **Supabase Storage (Buckets)**.
    * Implement a naming convention (e.g., appending a **UUID** or **Timestamp**) to prevent filename conflicts.

### 1.3 File List and Deletion (UI & Backend)
* **Description:** Allow users to manage their uploaded documents.
* **Detailed Specifications:**
    * The interface should perform real-time rendering of the "Uploaded Documents List" fetched from Supabase (including filename, format icons, etc.).
    * Each list item must include a **Delete** button.
    * Clicking "Delete" must trigger the Supabase Storage API to permanently remove the file from the cloud and update the frontend UI accordingly.

### 1.4 Built-in Document Viewer (UI/UX)
* **Description:** Provide a seamless reading experience without requiring a download.
* **Detailed Specifications:**
    * When a user selects a PDF or TXT file from the list, the system should display a preview area or a **Modal**.
    * For PDF files, an integrated **PDF Viewer** must be used to render the document content directly.

---

## 2. Customized AI Summary Generation (Ref: Section 7: AI Summary)
**Core Objective:** Parse document content and utilize AI models to generate highly customizable, readable summaries.

### 2.1 Text Extraction (Backend/Frontend)
* **Description:** Automatically extract text from documents for AI processing.
* **Detailed Specifications:**
    * Once a user selects a PDF/TXT for preview, the system must perform **Text Extraction** in the background.
    * Handle character encoding issues to ensure the extracted text is free of garbled characters.

### 2.2 Custom Summary Configuration (UI/UX)
* **Description:** Allow users to set AI output preferences before generating a summary.
* **Detailed Specifications:**
    * **Language Selection:** Provide a dropdown or radio buttons for output language (e.g., English, Traditional/Simplified Chinese, Japanese).
    * **Style & Formatting:** Provide options for users to toggle preferences, such as "Limit to 4 bullet points" or "Use a vivid tone with emojis 😆."

### 2.3 AI Model Invocation (Backend)
* **Description:** Assemble the text and user settings into a prompt for the AI.
* **Detailed Specifications:**
    * Triggered when the user clicks the **"Generate Summary"** button.
    * The backend calls the **GitHub Models API (Model: GPT-4o-mini)**.
    * The system merges the extracted text with the criteria defined in 2.2 into a comprehensive **System Prompt**.
    * Display an "AI is thinking..." loading animation during generation.

### 2.4 Markdown Renderer and Editor (UI/UX)
* **Description:** Display AI-generated results clearly and allow user modifications.
* **Detailed Specifications:**
    * **Markdown Viewer:** The Markdown syntax returned by the AI (e.g., `#`, `*`, `**bold**`) must be parsed into aesthetic Rich Text.
    * **Manual Editing:** Provide an **"Edit"** button that toggles the viewer into a text area (Textarea), allowing users to modify the raw AI-generated content directly.

---

## 3. Summary Caching Mechanism (Ref: Section 8: Database Integration)
**Core Objective:** Optimize performance, reduce AI API token costs, and preserve user edits.

### 3.1 Write to Cache Database (Backend)
* **Description:** Store structured data of initial or modified summaries.
* **Detailed Specifications:**
    * Upon successful generation, save the following data to the **Supabase PostgreSQL Database**:
        * `document_id` (Linked to the file in Storage)
        * `summary_content` (The text content of the summary)
        * `model_used` (e.g., "gpt-4o-mini")
        * `language` & `style` (The parameters used for generation)
        * `last_updated` (Timestamp of the latest update)

### 3.2 Cache Retrieval and Synchronization (Frontend & Backend)
* **Description:** Intelligently determine whether to call the AI or fetch existing data.
* **Detailed Specifications:**
    * **Cache Hit:** When a user re-opens a document, the frontend must first query the Supabase database for an existing `document_id`. If found, the summary is displayed directly, **skipping the AI API call**.
    * **Sync Update:** If a user modifies the summary via the editor and saves it, the system sends an **UPDATE** request to the database to overwrite `summary_content`.