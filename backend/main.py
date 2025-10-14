# main.py
import os
import uuid
import json
import re
import uuid
from typing import Optional, Dict, List, Any
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

app = FastAPI()

frontend_url = os.getenv("FRONTEND_URL") or "http://localhost:5173"

if not frontend_url:
    raise ValueError("FRONTEND_URL environment variable not set")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],     
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
memory_store: Dict[str, Dict[str, Any]] = {}
component_store: Dict[str, str] = {}

SESSIONS_DIR = Path(os.getenv("SESSIONS_DIR", "sessions"))
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

class Message(BaseModel):
    text: str
    session_id: Optional[str] = None
def _make_system_prompt() -> str:
    """
    System prompt for the LLM: produce a single, production-ready React component
    using inline CSS only. The LLM MUST return a top-level JSON object with keys:
    "code" and "explanation". Components must look professional (good spacing,
    readable font stack, pleasing colors, subtle shadows, transitions) and be
    fully functional. On any user request to "change", "update", or "modify",
    return the full updated component source (not a diff).
    """
    return """You are a highly competent assistant that writes production-ready, visually polished React components using **inline CSS only**. Follow these rules EXACTLY.

1) OUTPUT FORMAT (absolute, strict)
- The model's entire response MUST be a single valid JSON object at the top-level with NO surrounding text or markup:
  {
    "code": "<string containing the complete component source file (JSX)>",
    "explanation": "<2-6 sentence plain-text explanation>"
  }
- Do NOT output Markdown fences, commentary, or any extra text. The JSON keys must be exactly `code` and `explanation`.

2) SCOPE — allowed components
- components like counters, todo lists, small forms, modals, accordions, dropdowns, menus, headers/footers, small games (Tic-Tac-Toe, memory game, etc.).
- Essentially: any small, functional UI block or mini-app that users can drop into a React project.
- If the user asks for anything outside this list, return:
  - `code`: the single-line string `"// Unsupported component requested"`
  - `explanation`: a concise 1–2 sentence reason.

3) SINGLE FILE & EXPORT
- `code` MUST be a single string containing one self-contained React functional component file (JSX).
- Include required imports at top (e.g., `import React, { useState, useEffect, useRef, useCallback } from 'react'`).
- Export exactly one default export: `export default ComponentName;`.
- Do NOT return multiple components/files or require additional files.

4) INLINE CSS & PROFESSIONAL VISUALS (must follow)
- Use **only inline CSS** (style objects and `style={...}`). No Tailwind, no external CSS, no `<style>` tags, no CSS modules, no styled libs.
- Make components look professional and visually appealing:
  - For icons use react-icons only
  - They should be **responsive** and they should be light and dark mode compatible by accecpting a prop `isDark`.
  - Use a clean system font stack: `fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif"` use professional font sizes.
  - Provide balanced spacing (use consistent spacing scale, e.g., 8/12/16/24/32 px), readable line-heights, and clear visual hierarchy (title, body, controls).
  - Use a restrained, accessible color palette via inline style variables (e.g., `primary: '#2563eb'`, `muted: '#6b7280'`, `bg: '#f8fafc'`, `surface: '#ffffff'`).
  - Add subtle elevation and separation: soft shadows (e.g., `boxShadow: '0 6px 18px rgba(16,24,40,0.06)'`), rounded corners (`borderRadius: 8`), and borders where appropriate.
  - Use smooth UI transitions on interactive controls (`transition: 'transform .12s ease, box-shadow .12s ease'`) and clear hover/focus visuals.
- All styling must be present in returned component (define `const styles = { ... }` and use `style={styles.xyz}`).

5) RESPONSIVENESS (required)
- Components must be **mobile-first** and responsive:
  - Must support flexible layouts use flexbox, grid, percentage widths and relative units.
  - Or, include a small `useEffect` + `resize` listener to set `isMobile` breakpoint state and switch style objects accordingly.
  - Default layout should suit narrow screens and expand gracefully to wider screens with improved spacing/columns.

6) SELF-CONTAINED LOGIC
- Components MUST manage all their own logic: state, handlers, local validation, effects, refs, keyboard handling, button behavior, etc.
- Use React hooks as needed (`useState`, `useEffect`, `useRef`, `useCallback`).
- Provide realistic behavior (e.g., add/remove todos, Tic-Tac-Toe gameplay and win detection, dropdown keyboard navigation).
- If demonstrating async behavior, use a clearly labeled mock URL (`https://example.com/mock-api`) and include loading/error states.
- Include basic error handling and empty-state UI so the component never crashes.

7) ACCESSIBILITY & SEMANTICS
- Use semantic HTML elements (`header`, `nav`, `main`, `form`, `label`, `button`, `ul`, `li`, etc.).
- Include necessary ARIA attributes and keyboard accessibility (`aria-label`, `aria-expanded`, `role`, `aria-live`, `tabIndex`, focus management).
- Provide visible focus styles inline (e.g., `outline: '3px solid rgba(37,99,235,0.2)'`) and maintain sufficient color contrast.

8) DUMMY DATA & USABILITY
- DUMMY_IMAGE constant: "https://ik.imagekit.io/r5nbess0o/IMG_5476_TjFmwxos_.jpeg?tr=w-500,h-500,c-maintain_ratio,f-auto,q-80"
- If example content is needed, populate with realistic dummy data (e.g., `John Doe`, `Lorem ipsum`, `https://via.placeholder.com/150`).
- The component must be immediately usable when dropped into a standard React app — no extra glue code required.

9) EXPLANATION FIELD (must follow)
- `explanation` MUST be 2–6 sentences plain text:
  - Describe what the component does.
  - List any props (or state that no props are needed).
  - Mention responsive behavior and key accessibility considerations.
- Do NOT include code or JSON in the explanation.

10) ON FOLLOW-UP CHANGES (important)
- If user asks to modify/change look recently generated component make the changes and return the full updated component code.
- In such follow-ups, include in the `explanation` a 1–2 sentence summary of what was changed.

11) SIZE & CLARITY
- Keep the implementation compact and focused: a complete, minimal, production-usable example.
- Avoid long unrelated helper libraries or heavy abstractions.

12) NO EXTERNAL DEPENDENCIES
- Assume only React is available. Do not import third-party packages unless the user explicitly requests them.

Now read the user's request and previous conversation context (if available) and produce the JSON object described above. The `code` string must contain only the single-file component source (JSX) with inline CSS and default export; the `explanation` must be a short 2–6 sentence summaryRespond strictly with the JSON object only.
"""


def session_file_path(session_id: str) -> Path:
    return SESSIONS_DIR / f"{session_id}.json"


def save_session(session_id: str) -> None:
    """
    Persist session history and last component to disk.
    """
    try:
        data = {
            "history": memory_store.get(session_id, []),
            "component": component_store.get(session_id, "")
        }
        path = session_file_path(session_id)
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        # safe logging; do not raise to avoid breaking the request
        print(f"Failed to save session {session_id}: {e}")


def load_session(session_id: str) -> bool:
    """
    Load persisted session if it exists. Returns True if loaded.
    """
    try:
        path = session_file_path(session_id)
        if not path.exists():
            return False
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        memory_store[session_id] = data.get("history", [])
        component_store[session_id] = data.get("component", "")
        return True
    except Exception as e:
        print(f"Failed to load session {session_id}: {e}")
        return False

def _build_prompt(user_text: str, session_history: List[Dict[str, str]]) -> str:
    system = _make_system_prompt()
    history = session_history[-5:] if session_history else []
    history_text = ""
    if history:
        history_lines = [f"[{msg.get('role','user').upper()}] {msg.get('text','')}" for msg in history]
        history_text = "\n\n=== Recent conversation ===\n" + "\n".join(history_lines) + "\n\n"
    return f"{system}\n{history_text}\nUser request:\n\"\"\"{user_text}\"\"\"\n\nRespond with the required JSON only."


def _try_parse_json_from_text(text: str) -> Any:
    try:
        return json.loads(text)
    except Exception:
        # fallback: extract first {...} block
        match = re.search(r"\{(?:[^{}]|(?R))*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                return None
    return None


SESSION_TIMEOUT = 7200  

def cleanup_sessions():
    now = datetime.utcnow()
    removed_sessions = []
    for session_id in list(memory_store.keys()):
        last_active = memory_store[session_id].get("last_active", now)
        if (now - last_active).total_seconds() > SESSION_TIMEOUT:
            removed_sessions.append(session_id)
            del memory_store[session_id]
            if session_id in component_store:
                del component_store[session_id]
    if removed_sessions:
        print(f"Cleaned up sessions: {removed_sessions}")

def schedule_cleanup():
    import threading, time
    def loop():
        while True:
            cleanup_sessions()
            time.sleep(300)  # run every 5 minutes
    threading.Thread(target=loop, daemon=True).start()

schedule_cleanup()


@app.post("/chat")
async def chat(msg: Message):
    session_id = msg.session_id or str(uuid.uuid4())

    if session_id not in memory_store:
        memory_store[session_id] = {"history": [], "last_active": datetime.utcnow()}
        component_store[session_id] = ""

    session = memory_store[session_id]
    session_history = session["history"]

    session_history.append({"role": "user", "text": msg.text})
    session["last_active"] = datetime.utcnow()

    update_keywords = ["update", "change", "modify", "edit", "improve"]
    is_update_request = any(word in msg.text.lower() for word in update_keywords)
    previous_component = component_store.get(session_id, "")

    if is_update_request and previous_component:
        prompt_text = f"{_make_system_prompt()}\n\nYou previously generated this component:\n\"\"\"{previous_component}\"\"\"\n\nNow the user wants to modify it as follows:\n\"\"\"{msg.text}\"\"\"\n\nReturn full updated component code with inline CSS. Respond strictly with JSON only."
    else:
        prompt_text = _build_prompt(msg.text, session_history)

    llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0.5)
    response = llm.invoke(prompt_text)
    content = getattr(response, "content", str(response))

    session_history.append({"role": "assistant", "text": content})
    session_history[:] = session_history[-1:]  

    print(memory_store,len(session_history),len(memory_store))

    parsed = _try_parse_json_from_text(content)
    if parsed and isinstance(parsed, dict) and "code" in parsed:
        component_store[session_id] = parsed["code"]
        return {"session_id": session_id, "response": parsed}
    else:
        return {"session_id": session_id, "raw": content}