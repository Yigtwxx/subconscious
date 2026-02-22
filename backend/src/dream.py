"""
Subconscious — Dream Daemon

Arka plan "rüya" süreci. İnsan rüyası gibi:
  - Periyodik olarak bellekteki anıları tarar
  - Rastgele anıları birleştirir → yeni çağrışımlar keşfeder
  - Zayıf/eski anıları budar (forgetting)
  - Önemli kalıpları güçlendirir (konsolidasyon)
  - Çağrışım ağında gizli bağlantılar arar

Daemon iki modda çalışabilir:
  1. Otomatik: APScheduler ile periyodik (her N dakikada bir)
  2. Manuel: dream_once() ile tek seferlik
"""
import asyncio
import json
import random
import time
import logging
from dataclasses import dataclass, field
from typing import Optional, Callable

import ollama

from config import settings
from src.memory import MemoryManager, Memory
from src.associations import AssociationEngine
from src.emotions import EmotionalTagger

logger = logging.getLogger("subconscious.dream")


# ─── Dream Report ─────────────────────────────────────────────────────────────

@dataclass
class DreamReport:
    """Bir rüya döngüsünün raporu."""
    timestamp: float = field(default_factory=time.time)
    memories_reviewed: int = 0
    new_connections: int = 0
    memories_pruned: int = 0
    patterns_found: list[str] = field(default_factory=list)
    dream_thoughts: list[str] = field(default_factory=list)
    duration_seconds: float = 0.0

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "memories_reviewed": self.memories_reviewed,
            "new_connections": self.new_connections,
            "memories_pruned": self.memories_pruned,
            "patterns_found": self.patterns_found,
            "dream_thoughts": self.dream_thoughts,
            "duration_seconds": round(self.duration_seconds, 2),
        }


# ─── Dream Prompt ─────────────────────────────────────────────────────────────

DREAM_PROMPT = """Sen bir yapay zekanın rüya modülüsün. Görevin bellekteki rastgele anıları
birleştirip yeni bağlantılar ve kalıplar keşfetmek. İnsan rüyası gibi davran:
serbest çağrışımlarla düşün, beklenmedik bağlantılar kur.

## Bellekten Rastgele Çekilen Anılar
{random_memories}

## Mevcut Çağrışım Ağındaki Kavramlar
{existing_concepts}

## Görevin
Bu anıları birleştir ve aşağıdaki JSON formatında yanıt ver (SADECE JSON döndür):

{{
    "new_connections": [
        {{
            "concept_a": "kavram 1",
            "concept_b": "kavram 2",
            "reasoning": "neden bağlantılı olduklarının açıklaması",
            "weight": 0.0-1.0 arası bağlantı gücü
        }}
    ],
    "patterns": ["keşfedilen kalıp 1", "kalıp 2"],
    "dream_thought": "rüya düşüncesi — serbest çağrışımla üretilmiş bir içgörü"
}}
"""


# ─── Dream Daemon ─────────────────────────────────────────────────────────────

class DreamDaemon:
    """
    🌙 Rüya Daemon'u

    Arka planda çalışarak:
      1. Rastgele anıları çeker ve LLM ile yeniden işler
      2. Yeni çağrışımlar keşfeder
      3. Eski/zayıf anıları budar
      4. Önemli kalıpları güçlendirir
    """

    def __init__(self, memory: MemoryManager,
                 associations: AssociationEngine,
                 emotions: EmotionalTagger,
                 model: Optional[str] = None):
        self.memory = memory
        self.associations = associations
        self.emotions = emotions
        self.model = model or settings.OLLAMA_MODEL

        self.dream_history: list[DreamReport] = []
        self.is_dreaming: bool = False
        self._scheduler_task: Optional[asyncio.Task] = None
        self._running: bool = False

        # Dream config
        self.dream_interval_seconds: int = 300  # 5 dakikada bir
        self.memories_per_dream: int = 5        # Her rüyada kaç anı işle
        self.prune_threshold_days: int = 30     # 30 günden eski zayıf anılar budanır
        self.min_importance_to_keep: float = 0.3  # Bu skorun altındakiler budanır

        # Callbacks
        self._on_dream_complete: Optional[Callable] = None

    # ─── Tek Seferlik Rüya ────────────────────────────────────────────

    def dream_once(self, use_llm: bool = True) -> DreamReport:
        """
        Tek seferlik rüya döngüsü çalıştır.

        Args:
            use_llm: True ise LLM ile derin rüya, False ise sadece mekanik işlem
        """
        start_time = time.time()
        self.is_dreaming = True
        report = DreamReport()

        try:
            # 1) Rastgele anıları çek
            recent_memories = self.memory.recent(limit=20)
            if not recent_memories:
                logger.info("Dream: Bellekte anı yok, rüya atlanıyor.")
                return report

            sample_size = min(self.memories_per_dream, len(recent_memories))
            random_memories = random.sample(recent_memories, sample_size)
            report.memories_reviewed = sample_size

            # 2) LLM ile rüya işleme
            if use_llm and sample_size >= 2:
                llm_result = self._dream_with_llm(random_memories)
                if llm_result:
                    # Yeni bağlantıları çağrışım ağına ekle
                    for conn in llm_result.get("new_connections", []):
                        a = conn.get("concept_a", "")
                        b = conn.get("concept_b", "")
                        w = conn.get("weight", 0.4)
                        if a and b:
                            self.associations.connect(a, b, weight=w, association_type="dream")
                            report.new_connections += 1

                    # Keşfedilen kalıpları kaydet
                    patterns = llm_result.get("patterns", [])
                    report.patterns_found.extend(patterns)
                    for pattern in patterns:
                        self.memory.remember(
                            content=f"[RÜYA KALIP] {pattern}",
                            memory_type="intuition",
                            emotional_weight=0.6,
                            tags=["dream", "pattern"],
                        )

                    # Rüya düşüncesini kaydet
                    thought = llm_result.get("dream_thought", "")
                    if thought:
                        report.dream_thoughts.append(thought)
                        self.memory.remember(
                            content=f"[RÜYA] {thought}",
                            memory_type="intuition",
                            emotional_weight=0.5,
                            tags=["dream", "thought"],
                        )

            # 3) Mekanik bağlantı keşfi (graf tabanlı)
            hidden = self.associations.discover_hidden_connections(limit=3)
            for h in hidden:
                if h["avg_weight"] > 0.4:
                    self.associations.connect(
                        h["concept_a"], h["concept_b"],
                        weight=h["avg_weight"] * 0.5,
                        association_type="dream",
                    )
                    report.new_connections += 1

            # 4) Forgetting — zayıf anıları buda
            pruned = self._prune_weak_memories()
            report.memories_pruned = pruned

            # 5) Duygusal decay uygula (spreading activation'da zaten var)

        except Exception as e:
            logger.error(f"Dream error: {e}")
            report.dream_thoughts.append(f"Rüya hatası: {str(e)}")

        finally:
            self.is_dreaming = False
            report.duration_seconds = time.time() - start_time
            self.dream_history.append(report)

            # Callback
            if self._on_dream_complete:
                self._on_dream_complete(report)

        return report

    def _dream_with_llm(self, memories: list[Memory]) -> Optional[dict]:
        """LLM ile rüya işleme — rastgele anıları birleştirir."""
        memories_text = "\n".join(
            f"- [{m.memory_type}] {m.content}" for m in memories
        )

        # Mevcut kavramları al
        active = self.associations.get_most_active(limit=10)
        concepts_text = ", ".join(c["concept"] for c in active) if active else "Henüz kavram yok"

        prompt = DREAM_PROMPT.format(
            random_memories=memories_text,
            existing_concepts=concepts_text,
        )

        try:
            response = ollama.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 1.0},  # Rüyada yüksek yaratıcılık
            )
            raw = response["message"]["content"].strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                raw = raw.rsplit("```", 1)[0]
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Dream LLM error: {e}")
            return None

    def _prune_weak_memories(self) -> int:
        """
        Forgetting mekanizması — zayıf ve eski anıları buda.
        İnsan beynindeki sinaptic pruning'den esinlenilmiş.
        """
        pruned_count = 0
        threshold_time = time.time() - (self.prune_threshold_days * 86400)

        recent = self.memory.stm.recall_recent(limit=100)
        for mem in recent:
            # Eski + zayıf duygu + düşük erişim = buda
            if (mem.timestamp < threshold_time
                    and mem.emotional_weight < self.min_importance_to_keep
                    and mem.access_count < 2
                    and mem.memory_type not in ("intuition",)):  # Sezgiler budanmaz
                self.memory.stm.delete(mem.memory_id)
                pruned_count += 1

        return pruned_count

    # ─── Scheduler (Async) ────────────────────────────────────────────

    async def start(self, interval_seconds: Optional[int] = None):
        """
        Daemon'u başlat — periyodik rüya döngüsü.

        Args:
            interval_seconds: Rüya aralığı (saniye), None ise default kullanılır
        """
        if self._running:
            logger.warning("Dream daemon zaten çalışıyor.")
            return

        self._running = True
        interval = interval_seconds or self.dream_interval_seconds
        logger.info(f"Dream daemon başlatıldı (aralık: {interval}s)")

        while self._running:
            await asyncio.sleep(interval)
            if self._running:
                logger.info("Dream döngüsü başlıyor...")
                report = self.dream_once(use_llm=True)
                logger.info(
                    f"Dream tamamlandı: {report.new_connections} bağlantı, "
                    f"{report.memories_pruned} budanan, "
                    f"{report.duration_seconds:.1f}s"
                )

    def stop(self):
        """Daemon'u durdur."""
        self._running = False
        if self._scheduler_task:
            self._scheduler_task.cancel()
            self._scheduler_task = None
        logger.info("Dream daemon durduruldu.")

    def start_background(self, interval_seconds: Optional[int] = None):
        """
        Daemon'u arka plan task'ı olarak başlat.
        Mevcut event loop içinde çalışır.
        """
        try:
            loop = asyncio.get_running_loop()
            self._scheduler_task = loop.create_task(
                self.start(interval_seconds)
            )
        except RuntimeError:
            # Event loop yoksa yeni oluştur
            import threading
            def _run():
                asyncio.run(self.start(interval_seconds))
            thread = threading.Thread(target=_run, daemon=True)
            thread.start()

    # ─── Hooks ────────────────────────────────────────────────────────

    def on_dream_complete(self, callback: Callable):
        """Rüya tamamlandığında çağrılacak callback."""
        self._on_dream_complete = callback

    # ─── Stats ────────────────────────────────────────────────────────

    def stats(self) -> dict:
        total_connections = sum(r.new_connections for r in self.dream_history)
        total_pruned = sum(r.memories_pruned for r in self.dream_history)
        total_patterns = sum(len(r.patterns_found) for r in self.dream_history)

        return {
            "total_dreams": len(self.dream_history),
            "is_dreaming": self.is_dreaming,
            "is_running": self._running,
            "total_connections_discovered": total_connections,
            "total_memories_pruned": total_pruned,
            "total_patterns_found": total_patterns,
            "last_dream": self.dream_history[-1].to_dict() if self.dream_history else None,
        }

    def get_dream_thoughts(self, limit: int = 10) -> list[str]:
        """Rüya düşüncelerini getir."""
        thoughts = []
        for report in reversed(self.dream_history):
            thoughts.extend(report.dream_thoughts)
            if len(thoughts) >= limit:
                break
        return thoughts[:limit]
