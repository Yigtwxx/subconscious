import { useState, useRef, useEffect } from 'react';
import { Send, Moon, RefreshCw, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
    messages: ChatMessage[];
    isDreaming: boolean;
    onSendMessage: (text: string) => void;
    onTriggerDream: () => void;
    onRefresh: () => void;
}

export function ChatPanel({ messages, isDreaming, onSendMessage, onTriggerDream, onRefresh }: ChatPanelProps) {
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;
        onSendMessage(text);
        setInput('');
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col h-full w-full lg:w-[420px] shrink-0 border-r border-white/5 overflow-hidden">
            {/* Title */}
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                <Sparkles className="w-4 h-4 text-accent-purple" />
                <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-text-primary/90">Sohbet</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, idx) => (
                    <MessageBubble key={msg.id || idx} msg={msg} idx={idx} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/5 p-4 bg-white/[0.01]">
                <form onSubmit={handleSubmit} className="flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Bilinçaltına fısılda..."
                        autoComplete="off"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-purple/50 focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-indigo text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:-translate-y-0.5 active:scale-95 transition-all"
                    >
                        <Send className="w-5 h-5 ml-1" />
                    </button>
                </form>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 pl-1">
                    <ActionButton onClick={onTriggerDream} icon={<Moon className={`w-4 h-4 ${isDreaming ? 'animate-pulse' : ''}`} />} label={isDreaming ? 'Rüya Görülüyor...' : 'Rüya Gör'} variant="dream" />
                    <ActionButton onClick={onRefresh} icon={<RefreshCw className="w-4 h-4" />} label="Yenile" />
                </div>
            </div>
        </div>
    );
}

function ActionButton({ onClick, icon, label, variant }: { onClick: () => void; icon: React.ReactNode; label: string; variant?: 'dream' }) {
    const cls = variant === 'dream'
        ? 'bg-accent-indigo/10 border-accent-indigo/30 hover:bg-accent-indigo/20 hover:border-accent-indigo/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] text-accent-indigo'
        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-text-secondary hover:text-text-primary';
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3.5 py-2 text-[12px] font-semibold rounded-lg border transition-all ${cls}`}
        >
            {icon}{label}
        </button>
    );
}

function MessageBubble({ msg, idx }: { msg: ChatMessage; idx: number }) {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';
    const isLoading = msg.id === 'loading';

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 py-2 animate-fade-in">
                <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-accent-purple rounded-full" style={{ animation: `dot-bounce 1.4s infinite ${i * 0.15}s` }} />
                    ))}
                </div>
                <span className="text-[12px] text-text-dim">Düşünüyor...</span>
            </div>
        );
    }

    if (isSystem) {
        return (
            <div className="text-center py-2 animate-fade-in">
                <span className="text-[11px] text-text-dim italic">{msg.content}</span>
            </div>
        );
    }

    return (
        <div className={`max-w-[85%] animate-slide-up ${isUser ? 'self-end ml-auto' : 'self-start mr-auto'}`} style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}>
            <div className={`px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${isUser
                ? 'bg-gradient-to-br from-accent-purple to-accent-indigo text-white rounded-br-sm shadow-[0_4px_20px_rgba(139,92,246,0.2)]'
                : 'bg-white/5 border border-white/5 backdrop-blur-md rounded-bl-sm'
                }`}>
                {msg.content}
            </div>

            {/* Subconscious overlay */}
            {msg.subconscious && (
                <div className="mt-2.5 ml-2 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm animate-fade-in shadow-inner">
                    {msg.subconscious.associations?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {msg.subconscious.associations.map((a: any, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                                    {typeof a === 'string' ? a : a.content || JSON.stringify(a)}
                                </span>
                            ))}
                        </div>
                    )}
                    {msg.subconscious.intuition && (
                        <div className="text-[11.5px] text-accent-pink italic mt-1.5 pt-2 border-t border-white/5 opacity-90">
                            ✧ {msg.subconscious.intuition}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
