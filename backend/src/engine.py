"""
Subconscious — Engine (v0.2.0)

Ana bilinçaltı motoru. Her konuşma turunda:
  1. Kullanıcı mesajını al
  2. Bellekten ilgili anıları çek (recall)
  3. Çağrışım ağını aktive et (spreading activation)
  4. Duygusal analiz yap
  5. Bilinçaltı analiz çalıştır (gizli prompt)
  6. Çağrışımları belleğe + çağrışım ağına kaydet
  7. Sezgileri ana yanıta enjekte et
  8. Kullanıcıya zenginleştirilmiş yanıt döndür
"""
import json
from typing import Optional

import ollama

from config import settings
from src.memory import MemoryManager
from src.associations import AssociationEngine
from src.emotions import EmotionalTagger, EmotionCategory
from src.dream import DreamDaemon, DreamReport
from src.prompts import (
    SUBCONSCIOUS_ANALYSIS,
    INTUITION_INJECTION,
    SYSTEM_PROMPT,
)


class SubconsciousEngine:
    """
    🧠 Bilinçaltı Motoru (v0.3.0 — Hibrit Mimari)

    Dual-prompt mimarisi + Association Engine + Emotional Tagging + Dream Daemon:
      Prompt 1 (gizli)  → bilinçaltı analiz → çağrışım + sezgi + duygu
      Prompt 2 (görünür) → ana yanıt + sezgi enjeksiyonu
      Arka plan          → çağrışım grafiği + duygusal bellek
      Dream Daemon       → periyodik rüya, bellek konsolidasyonu, forgetting
    """

    def __init__(self, model: Optional[str] = None):
        self.model = model or settings.OLLAMA_MODEL
        self.memory = MemoryManager()
        self.associations = AssociationEngine(memory=self.memory)
        self.emotions = EmotionalTagger()
        self.dream = DreamDaemon(
            memory=self.memory,
            associations=self.associations,
            emotions=self.emotions,
            model=self.model,
        )
        self.conversation_history: list[dict] = []
        self._last_analysis: Optional[dict] = None

    def chat(self, user_message: str, show_subconscious: bool = False) -> dict:
        """
        Ana sohbet fonksiyonu.

        Args:
            user_message: Kullanıcı mesajı
            show_subconscious: True ise bilinçaltı düşünceleri de döndür

        Returns:
            {
                "response": "Ana yanıt",
                "subconscious": {
                    ...analysis,
                    "emotional_tag": {...},
                    "activated_concepts": {...},
                    "association_stats": {...},
                    "emotional_trend": {...},
                }
            }
        """
        # 1) Duygusal analiz (keyword-based, hızlı)
        emotional_tag = self.emotions.analyze(user_message, context="user_message")

        # 2) Bellekten ilgili anıları çek
        relevant_memories = self.memory.recall(user_message)
        memories_text = self._format_memories(relevant_memories)

        # 3) Çağrışım ağını aktive et (spreading activation)
        concepts = self._extract_concepts_simple(user_message)
        activated_concepts = {}
        for concept in concepts:
            activated = self.associations.activate(concept, strength=0.8, depth=2)
            activated_concepts.update(activated)

        # 4) Konuşma bağlamını hazırla
        context = self._format_conversation()

        # 5) 🔒 Bilinçaltı analiz (GİZLİ PROMPT)
        analysis = self._subconscious_process(
            user_message=user_message,
            conversation_context=context,
            relevant_memories=memories_text,
        )
        self._last_analysis = analysis

        # 6) LLM duygusal tonunu da işle
        llm_tone = analysis.get("emotional_tone", "")
        if llm_tone:
            llm_tag = self.emotions.analyze_with_llm_result(llm_tone, context="llm_analysis")
            # Keyword ve LLM sonuçlarını birleştir (LLM'e daha çok güven)
            if llm_tag.intensity > emotional_tag.intensity:
                emotional_tag = llm_tag

        # 7) Çağrışımları belleğe + çağrışım grafiğine kaydet
        self._store_associations(analysis, source=user_message[:100])
        self._update_association_graph(analysis, concepts)

        # 8) Kullanıcı mesajını belleğe kaydet (duygusal ağırlıkla)
        self.memory.remember(
            content=f"Kullanıcı: {user_message}",
            memory_type="conversation",
            emotional_weight=emotional_tag.memory_priority,
            tags=[emotional_tag.primary_emotion.value],
        )

        # 9) Sezgilerle zenginleştirilmiş yanıt oluştur
        response = self._generate_response(
            user_message, analysis, activated_concepts, emotional_tag
        )

        # 10) Yanıtı belleğe kaydet
        self.memory.remember(
            content=f"Asistan: {response}",
            memory_type="conversation",
        )

        # 11) Konuşma geçmişine ekle
        self.conversation_history.append({"role": "user", "content": user_message})
        self.conversation_history.append({"role": "assistant", "content": response})

        result = {"response": response}
        if show_subconscious:
            result["subconscious"] = {
                **analysis,
                "emotional_tag": emotional_tag.to_dict(),
                "activated_concepts": activated_concepts,
                "association_stats": self.associations.stats(),
                "emotional_trend": self.emotions.get_emotional_trend(),
            }

        return result

    def _subconscious_process(self, user_message: str,
                               conversation_context: str,
                               relevant_memories: str) -> dict:
        """🔒 Gizli bilinçaltı analiz — kullanıcı bunu görmez."""
        prompt = SUBCONSCIOUS_ANALYSIS.format(
            conversation_context=conversation_context,
            user_message=user_message,
            relevant_memories=relevant_memories if relevant_memories else "Henüz ilgili anı yok.",
        )

        try:
            response = ollama.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.8},
            )
            raw = response["message"]["content"]
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1]
                raw = raw.rsplit("```", 1)[0]
            return json.loads(raw)
        except (json.JSONDecodeError, KeyError, Exception) as e:
            return {
                "associations": [],
                "emotional_tone": "belirsiz",
                "hidden_patterns": "",
                "intuition": "",
                "_error": str(e),
            }

    def _generate_response(self, user_message: str, analysis: dict,
                            activated_concepts: dict,
                            emotional_tag) -> str:
        """Ana yanıt oluştur — bilinçaltı sezgilerle zenginleştirilmiş."""
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Bilinçaltı sezgileri enjekte et
        intuitions = analysis.get("intuition", "")
        associations = [a.get("content", "") for a in analysis.get("associations", [])]

        # Aktive olan kavramları da sezgiye ekle
        if activated_concepts:
            top_activated = sorted(
                activated_concepts.items(), key=lambda x: x[1], reverse=True
            )[:5]
            activated_text = ", ".join(f"{c} ({a:.2f})" for c, a in top_activated)
            associations.append(f"Aktive olan kavramlar: {activated_text}")

        # Duygusal bağlamı ekle
        emotion_context = f"Kullanıcının duygusal tonu: {emotional_tag.primary_emotion.value} (yoğunluk: {emotional_tag.current_intensity:.2f})"
        associations.append(emotion_context)

        if intuitions or associations:
            injection = INTUITION_INJECTION.format(
                intuitions=intuitions if intuitions else "Yok",
                associations="\n".join(f"- {a}" for a in associations) if associations else "Yok",
            )
            messages.append({"role": "system", "content": injection})

        messages.extend(self.conversation_history[-10:])
        messages.append({"role": "user", "content": user_message})

        response = ollama.chat(
            model=self.model,
            messages=messages,
            options={"temperature": 0.7},
        )
        return response["message"]["content"]

    def _format_memories(self, memories: list[dict]) -> str:
        """Bellekten çekilen anıları metin formatına çevir."""
        if not memories:
            return "Henüz ilgili anı yok."
        parts = []
        for m in memories[:5]:
            content = m.get("content", "")
            similarity = m.get("similarity", 0)
            parts.append(f"[{similarity:.0%}] {content}")
        return "\n".join(parts)

    def _format_conversation(self) -> str:
        """Konuşma geçmişini metin formatına çevir."""
        if not self.conversation_history:
            return "İlk konuşma."
        parts = []
        for msg in self.conversation_history[-6:]:  # Son 6 mesaj
            role = "Sen" if msg["role"] == "user" else "AI"
            parts.append(f"{role}: {msg['content'][:200]}")
        return "\n".join(parts)

    def _store_associations(self, analysis: dict, source: str):
        """Bilinçaltı çağrışımları belleğe kaydet."""
        for assoc in analysis.get("associations", []):
            content = assoc.get("content", "")
            if not content:
                continue
            self.memory.remember(
                content=content,
                memory_type="association",
                emotional_weight=assoc.get("emotional_weight", 0.5),
                tags=assoc.get("tags", []),
                source=source,
            )

    def _update_association_graph(self, analysis: dict, user_concepts: list[str]):
        """Çağrışım grafiğini güncelle."""
        all_concepts = list(user_concepts)

        # Analizden gelen etiketleri de kavram olarak ekle
        for assoc in analysis.get("associations", []):
            tags = assoc.get("tags", [])
            all_concepts.extend(tags)

        # Tüm kavramları ekle
        for concept in all_concepts:
            if concept:
                self.associations.add_concept(concept)

        # Co-occurrence bağlantıları kur
        if len(all_concepts) > 1:
            self.associations.connect_cooccurrence(
                [c for c in all_concepts if c]
            )

        # Temporal bağlantıları kur (aynı konuşmadaki kavramlar)
        if len(user_concepts) > 1:
            self.associations.connect_temporal(user_concepts)

    def _extract_concepts_simple(self, text: str) -> list[str]:
        """
        Basit kavram çıkarma (stopword filtresi ile).
        İleride LLM-based NER ile değiştirilebilir.
        """
        stopwords = {
            "bir", "bu", "şu", "ve", "ile", "de", "da", "mı", "mi", "mu", "mü",
            "ne", "nasıl", "neden", "ama", "fakat", "için", "gibi", "kadar",
            "çok", "az", "var", "yok", "ben", "sen", "biz", "siz", "onlar",
            "the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
            "to", "for", "of", "with", "by", "from", "it", "this", "that",
            "i", "you", "we", "they", "he", "she", "my", "your", "and", "or",
            "can", "do", "does", "did", "will", "would", "could", "should",
            "what", "how", "why", "when", "where", "which", "who",
            "hakkında", "olarak", "olan", "olan", "olacak", "olabilir",
        }

        words = text.lower().split()
        concepts = []
        for word in words:
            # Temizle
            clean = word.strip(".,!?;:'\"()[]{}").strip()
            if len(clean) >= 3 and clean not in stopwords:
                concepts.append(clean)

        return concepts[:10]  # Maksimum 10 kavram

    # ─── Public API ───────────────────────────────────────────────────────

    def get_memory_stats(self) -> dict:
        """Bellek istatistiklerini döndür."""
        return self.memory.stats()

    def get_association_stats(self) -> dict:
        """Çağrışım ağı istatistiklerini döndür."""
        return self.associations.stats()

    def get_emotional_trend(self) -> dict:
        """Duygusal trend bilgisini döndür."""
        return self.emotions.get_emotional_trend()

    def get_active_concepts(self, limit: int = 10) -> list[dict]:
        """En aktif kavramları döndür."""
        return self.associations.get_most_active(limit)

    def get_related_concepts(self, concept: str, limit: int = 10) -> list[dict]:
        """Bir kavramla ilişkili kavramları döndür."""
        return self.associations.get_related(concept, limit)

    def discover_connections(self, limit: int = 5) -> list[dict]:
        """Gizli bağlantıları keşfet."""
        return self.associations.discover_hidden_connections(limit)

    def get_last_analysis(self) -> Optional[dict]:
        """Son bilinçaltı analizini döndür (debug için)."""
        return self._last_analysis

    # ─── Dream API ────────────────────────────────────────────────────

    def dream_now(self, use_llm: bool = True) -> DreamReport:
        """Hemen bir rüya döngüsü çalıştır."""
        return self.dream.dream_once(use_llm=use_llm)

    def start_dreaming(self, interval_seconds: int = 300):
        """Arka plan rüya daemon'unu başlat."""
        self.dream.start_background(interval_seconds)

    def stop_dreaming(self):
        """Rüya daemon'unu durdur."""
        self.dream.stop()

    def get_dream_stats(self) -> dict:
        """Rüya istatistiklerini döndür."""
        return self.dream.stats()

    def get_dream_thoughts(self, limit: int = 10) -> list[str]:
        """Rüya düşüncelerini döndür."""
        return self.dream.get_dream_thoughts(limit)

    def reset(self):
        """Konuşma geçmişini sıfırla (bellek, ağ ve rüya geçmişi korunur)."""
        self.conversation_history = []
        self._last_analysis = None
