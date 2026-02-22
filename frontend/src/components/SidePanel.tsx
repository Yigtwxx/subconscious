import type { AppStats } from '../types';
import { Activity, Database, Sparkles, Moon } from 'lucide-react';

const EMOTION_MAP: Record<string, { icon: string; color: string }> = {
    'sevinç': { icon: '😊', color: '#10b981' },
    'güven': { icon: '🤝', color: '#3b82f6' },
    'korku': { icon: '😨', color: '#ef4444' },
    'şaşkınlık': { icon: '😲', color: '#f59e0b' },
    'üzüntü': { icon: '😢', color: '#6366f1' },
    'tiksinme': { icon: '🤢', color: '#84cc16' },
    'öfke': { icon: '😡', color: '#ef4444' },
    'beklenti': { icon: '🔮', color: '#8b5cf6' },
    'merak': { icon: '🤔', color: '#06b6d4' },
    'heyecan': { icon: '🤩', color: '#ec4899' },
    'kaygı': { icon: '😰', color: '#f97316' },
    'sakinlik': { icon: '😌', color: '#14b8a6' },
    'nötr': { icon: '😐', color: '#6b7280' },
};

const TREND_MAP: Record<string, { label: string; color: string; arrow: string }> = {
    'improving': { label: 'İyileşen', color: 'text-accent-emerald', arrow: '↗' },
    'declining': { label: 'Kötüleşen', color: 'text-accent-red', arrow: '↘' },
    'stable': { label: 'Stabil', color: 'text-accent-amber', arrow: '→' },
};

interface SidePanelProps {
    stats: AppStats | null;
    dreamThoughts: string[];
    lastIntuition: string | null;
}

export function SidePanel({ stats, dreamThoughts, lastIntuition }: SidePanelProps) {
    const emotionKey = stats?.emotions?.current?.toLowerCase() ?? 'nötr';
    const emotion = EMOTION_MAP[emotionKey] ?? EMOTION_MAP['nötr'];
    const intensity = Math.round((stats?.emotions?.intensity ?? 0) * 100);
    const trendKey = stats?.emotions?.trend ?? 'stable';
    const trend = TREND_MAP[trendKey] ?? TREND_MAP['stable'];

    return (
        <div className="hidden lg:flex flex-col h-full w-[340px] shrink-0 border-l border-white/5 overflow-y-auto">

            {/* Emotion */}
            <Section icon={<Activity className="w-4 h-4" />} title="Duygusal Durum">
                <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 shadow-inner rounded-2xl">
                    <span className="text-4xl">{emotion.icon}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold capitalize tracking-wide">{emotionKey}</p>
                        <div className="h-2 bg-black/40 rounded-full mt-2.5 overflow-hidden shadow-inner">
                            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${intensity}%`, backgroundColor: emotion.color, boxShadow: `0 0 10px ${emotion.color}80` }} />
                        </div>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold ${trend.color} bg-current/10`}>
                    {trend.arrow} {trend.label}
                </span>
            </Section>

            {/* Memory Stats */}
            <Section icon={<Database className="w-4 h-4" />} title="Bellek">
                <div className="grid grid-cols-2 gap-3">
                    <StatCard label="STM" value={stats?.memory.stm_count ?? 0} color="text-accent-cyan" />
                    <StatCard label="LTM" value={stats?.memory.ltm_count ?? 0} color="text-accent-blue" />
                    <StatCard label="Kavram" value={stats?.associations.nodes ?? 0} color="text-accent-purple" />
                    <StatCard label="Bağlantı" value={stats?.associations.edges ?? 0} color="text-accent-emerald" />
                </div>
            </Section>

            {/* Dreams */}
            <Section icon={<Moon className="w-4 h-4" />} title="Rüya Düşünceleri">
                <div className="space-y-3">
                    {dreamThoughts.length === 0 ? (
                        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-indigo-800/20 text-[12px] italic text-text-dim">
                            Henüz rüya görülmedi...
                        </div>
                    ) : (
                        dreamThoughts.map((t, i) => (
                            <div key={i} className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-indigo-800/20 text-[12px] italic text-text-secondary animate-slide-in-left" style={{ animationDelay: `${i * 80}ms` }}>
                                {t}
                            </div>
                        ))
                    )}
                </div>
            </Section>

            {/* Intuition */}
            <Section icon={<Sparkles className="w-4 h-4" />} title="Son Sezgi">
                <p className="text-[13px] text-text-primary/90 italic leading-relaxed p-4 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                    {lastIntuition ?? 'Henüz sezgi yok...'}
                </p>
            </Section>
        </div>
    );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="p-5 border-b border-white/5 last:border-b-0">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
                {icon}{title}
            </h3>
            {children}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center transition-all hover:bg-white/[0.04] hover:-translate-y-0.5 shadow-inner group">
            <div className={`font-mono text-2xl font-bold ${color} group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_currentColor]`}>{value}</div>
            <div className="text-[10px] text-text-secondary mt-1.5 uppercase tracking-[0.15em] font-bold">{label}</div>
        </div>
    );
}
