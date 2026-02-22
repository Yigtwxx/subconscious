import { Brain, Link2, Boxes, Moon, Wifi, WifiOff } from 'lucide-react';
import type { AppStats } from '../types';

interface HeaderProps {
    stats: AppStats | null;
    isConnected: boolean;
}

export function Header({ stats, isConnected }: HeaderProps) {
    return (
        <header className="glass-strong rounded-2xl flex items-center justify-between px-6 h-16 z-20 shrink-0 shadow-lg">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple/80 to-accent-blue/80 flex items-center justify-center shadow-[0_4px_20px_rgba(139,92,246,0.3)] backdrop-blur-md border border-white/10">
                    <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="font-extrabold text-[19px] tracking-tight bg-gradient-to-r from-white via-white/90 to-text-secondary bg-clip-text text-transparent">Subconscious</span>
                    <span className="text-[10px] text-accent-purple font-mono px-1.5 py-0.5 rounded-md bg-accent-purple/10 border border-accent-purple/20">v0.5</span>
                </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-5">
                {/* Connection indicator */}
                <div className="flex items-center gap-1.5 text-[12px]">
                    {isConnected ? (
                        <>
                            <Wifi className="w-3.5 h-3.5 text-accent-emerald" />
                            <span className="text-accent-emerald font-medium">Bağlı</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-3.5 h-3.5 text-accent-red" />
                            <span className="text-accent-red font-medium">Bağlantı yok</span>
                        </>
                    )}
                </div>

                <div className="w-px h-6 bg-border/50" />

                <StatBadge
                    icon={<div className="w-2 h-2 rounded-full bg-accent-emerald animate-glow-pulse" />}
                    label="STM"
                    value={stats?.memory.stm_count ?? 0}
                />
                <StatBadge
                    icon={<Link2 className="w-3.5 h-3.5 text-accent-blue" />}
                    label="Bağlantı"
                    value={stats?.associations.edges ?? 0}
                />
                <StatBadge
                    icon={<Boxes className="w-3.5 h-3.5 text-accent-purple" />}
                    label="Kavram"
                    value={stats?.associations.nodes ?? 0}
                />
                <StatBadge
                    icon={<Moon className="w-3.5 h-3.5 text-accent-indigo" />}
                    label="Rüya"
                    value={stats?.dream.count ?? 0}
                />
            </div>
        </header>
    );
}

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
            {icon}
            <span className="font-mono font-semibold text-text-primary text-[13px]">{value}</span>
            <span className="hidden sm:inline">{label}</span>
        </div>
    );
}
