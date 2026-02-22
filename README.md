# 🧠 Subconscious — AI Bilinçaltı Framework

Yapay zekaya **bilinçaltı** kazandıran bir framework. İnsan bilinçaltından ilham alarak, AI'ın arka planda çağrışımlar kurmasını, duygusal tonları algılamasını ve sezgisel bağlantılar oluşturmasını sağlar.

## 🧩 Nasıl Çalışır?

```
Kullanıcı Mesajı
       │
       ▼
┌──────────────────┐     ┌──────────────────────────┐
│   Bilinç (LLM)   │────▶│  🔒 Bilinçaltı (Gizli)   │
│   Ana Yanıt       │     │  • Çağrışım çıkarma       │
│                   │◀────│  • Duygusal analiz         │
│                   │     │  • Sezgi üretme            │
└──────────────────┘     └──────────────────────────┘
       │                          │
       ▼                          ▼
  Yanıt döner              Belleğe kaydeder
  (sezgilerle               (STM + LTM)
   zenginleştirilmiş)
```

**Dual-Prompt Mimarisi**: Her kullanıcı mesajında iki ayrı LLM çağrısı yapılır:
1. **Gizli prompt** — Bilinçaltı analiz (kullanıcı görmez)
2. **Görünür prompt** — Sezgilerle zenginleştirilmiş yanıt

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
pip install -r requirements.txt

# Ollama'nın çalıştığından emin ol
ollama serve

# Modeli çek (ilk seferde)
ollama pull qwen2.5:7b
```

## 🚀 Kullanım

### CLI Demo
```bash
python cli.py
```

### Komutlar
| Komut | Açıklama |
|---|---|
| `/sub` | Bilinçaltı düşünceleri göster/gizle |
| `/bellek` | Bellek istatistiklerini göster |
| `/sıfırla` | Konuşmayı sıfırla (bellek korunur) |
| `/çıkış` | Çıkış |

### Python API
```python
from subconscious.engine import SubconsciousEngine

engine = SubconsciousEngine()

# Basit sohbet
result = engine.chat("Kuantum fiziği hakkında ne düşünüyorsun?")
print(result["response"])

# Bilinçaltını göster
result = engine.chat("Evren hakkında konuşalım", show_subconscious=True)
print(result["subconscious"])  # çağrışımlar, sezgiler, duygusal ton
```

## 🗂️ Proje Yapısı

```
subconscious/
├── backend/                # Python FastAPI & AI Motoru
│   ├── cli.py              # Etkileşimli terminal arayüzü
│   ├── config.py           # Ayarlar (Pydantic)
│   ├── requirements.txt    # Bağımlılıklar
│   ├── server.py           # Web API ve UI sunucusu
│   ├── start.py            # Başlatıcı
│   └── subconscious/       # 🧠 Ana bilinçaltı motoru
├── frontend/               # React, TypeScript, Vite Web Arayüzü
│   ├── src/                # Arayüz kaynak kodları
│   ├── package.json        
│   └── vite.config.ts      
├── data/                   # SQLite ve ChromaDB veritabanları
│   ├── memory.db           
│   └── chroma/             
├── README.md
└── .gitignore 
```

## 🔮 Yol Haritası

- [x] **Faz 1** — MVP: Dual-prompt bilinçaltı + bellek + CLI
- [ ] **Faz 2** — Association Engine, Emotional Tagging, Spreading Activation
- [ ] **Faz 3** — Dream Daemon (arka plan rüya modülü)
- [ ] **Faz 4** — Graf tabanlı çağrışım ağı + Web UI

## ⚙️ Yapılandırma

Ortam değişkenleri veya `.env` dosyası ile:

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `SUBCONSCIOUS_OLLAMA_MODEL` | `qwen2.5:7b` | Kullanılacak LLM modeli |
| `SUBCONSCIOUS_OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama sunucu adresi |
| `SUBCONSCIOUS_STM_CAPACITY` | `50` | STM maksimum anı sayısı |
| `SUBCONSCIOUS_ASSOCIATION_THRESHOLD` | `0.6` | Min benzerlik eşiği |

## 📄 Lisans

MIT
