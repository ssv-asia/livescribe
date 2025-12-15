# LiveScribe (Web Edition)

A minimal, reliable system for real-time transcription of YouTube livestreams using the Gemini Live API directly in the browser.

**No backend required.** This version captures audio directly from your browser tab.

## Prerequisites

1.  **Node.js** (v18+)
2.  **Google Gemini API Key** (Set as `API_KEY` in environment)

## Setup & Run

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run the application with your API Key:
    ```bash
    # Linux/Mac
    export API_KEY="your_gemini_api_key"
    npm start

    # Windows (PowerShell)
    $env:API_KEY="your_gemini_api_key"
    npm start
    ```

3.  The app will open at `http://localhost:3000`.

## Usage

1.  **Select Source**: Paste the YouTube Livestream URL into the input field.
2.  **Open Tab**: Click "OPEN TAB" to launch the video in a separate window.
3.  **Start Transcription**:
    *   Click "START TRANSCRIPTION".
    *   In the browser popup, select the **Tab** you just opened.
    *   **IMPORTANT**: Ensure the **"Share tab audio"** checkbox is ticked.
4.  **View**: The transcript will appear in real-time.

## Troubleshooting

*   **No Text Appearing?**
    *   Ensure the YouTube video is unmuted.
    *   Ensure you checked "Share tab audio" when selecting the tab.
    *   Check the browser console for API errors.

*   **Audio drift/latency**:
    *   This uses real-time streaming to Gemini. Network latency may apply.

## Tech Stack

*   React + TypeScript
*   Tailwind CSS
*   Google Gemini Live API (`@google/genai`)
*   Web Audio API (`ScriptProcessor` + `getDisplayMedia`)
