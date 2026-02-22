"""
Subconscious — Web API (FastAPI)

REST API + WebSocket for the subconscious dashboard.
Zero HTML files — the app shell is generated dynamically from Python.
"""
import sys
import os
import json
import glob
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from src.engine import SubconsciousEngine

# ─── Engine singleton ────────────────────────────────────────────────────────
engine: SubconsciousEngine = None  # type: ignore

def get_engine() -> SubconsciousEngine:
    global engine
    if engine is None:
        engine = SubconsciousEngine()
    return engine

def set_engine(ext_engine: SubconsciousEngine):
    """Dışarıdan engine inject et (start.py all modu için)."""
    global engine
    engine = ext_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start dream daemon on startup."""
    e = get_engine()
    e.dream.start_background(interval_seconds=300)
    yield
    e.dream.stop()


app = FastAPI(
    title="Subconscious API",
    version="0.4.0",
    description="🧠 AI Bilinçaltı Framework API — Pure TSX, Zero HTML",
    lifespan=lifespan,
)

# Serve Vite-built static assets (JS/CSS bundles) from frontend/dist
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
assets_dir = os.path.join(static_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


def _discover_assets():
    """Auto-discover JS and CSS filenames from the Vite build output."""
    js_file = ""
    css_file = ""
    if os.path.exists(assets_dir):
        # Match both hashed (index-XXXX.js) and non-hashed (index.js) names
        for f in os.listdir(assets_dir):
            if f.endswith(".js") and f.startswith("index"):
                js_file = f
            elif f.endswith(".css") and f.startswith("index"):
                css_file = f
    return js_file, css_file


def _generate_app_shell() -> str:
    """Generate the minimal app shell dynamically — no .html file required."""
    js_file, css_file = _discover_assets()
    css_tag = f'<link rel="stylesheet" href="/assets/{css_file}">' if css_file else ""
    js_tag = f'<script type="module" src="/assets/{js_file}"></script>' if js_file else ""
    return f"""<!doctype html><html lang="tr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>🧠 Subconscious — AI Dashboard</title>{css_tag}</head><body><div id="root"></div>{js_tag}</body></html>"""


# ─── Models ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    show_subconscious: bool = True

class ChatResponse(BaseModel):
    response: str
    subconscious: Optional[dict] = None


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def index():
    return HTMLResponse(_generate_app_shell())


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    result = get_engine().chat(req.message, show_subconscious=req.show_subconscious)
    return ChatResponse(**result)


@app.get("/api/stats")
async def stats():
    e = get_engine()
    return {
        "memory": e.get_memory_stats(),
        "associations": e.get_association_stats(),
        "emotions": e.get_emotional_trend(),
        "dream": e.dream.stats(),
    }


@app.get("/api/graph")
async def graph():
    return get_engine().associations.export_graph()


@app.get("/api/concepts")
async def concepts(limit: int = 20):
    return get_engine().get_active_concepts(limit)


@app.get("/api/concepts/{name}/related")
async def related(name: str, limit: int = 10):
    return get_engine().get_related_concepts(name, limit)


@app.get("/api/connections")
async def connections(limit: int = 10):
    return get_engine().discover_connections(limit)


@app.get("/api/memories")
async def memories(limit: int = 20):
    recent = get_engine().memory.recent(limit)
    return [m.to_dict() for m in recent]


@app.post("/api/dream")
async def dream_now():
    report = get_engine().dream.dream_once(use_llm=True)
    return report.to_dict()


@app.get("/api/dream/thoughts")
async def dream_thoughts(limit: int = 10):
    return get_engine().dream.get_dream_thoughts(limit)


# ─── WebSocket for real-time updates ─────────────────────────────────────────

connected_clients: list[WebSocket] = []

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.append(ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "chat":
                e = get_engine()
                result = e.chat(msg["message"], show_subconscious=True)
                await ws.send_json({
                    "type": "chat_response",
                    "data": result,
                })
                # Broadcast graph update to all clients
                graph_data = e.associations.export_graph()
                stats_data = {
                    "memory": e.get_memory_stats(),
                    "associations": e.get_association_stats(),
                    "emotions": e.get_emotional_trend(),
                    "dream": e.dream.stats(),
                }
                for client in connected_clients:
                    try:
                        await client.send_json({"type": "graph_update", "data": graph_data})
                        await client.send_json({"type": "stats_update", "data": stats_data})
                    except:
                        pass

            elif msg.get("type") == "dream":
                report = get_engine().dream.dream_once(use_llm=True)
                await ws.send_json({
                    "type": "dream_report",
                    "data": report.to_dict(),
                })

    except WebSocketDisconnect:
        connected_clients.remove(ws)


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=3000, reload=True)
