import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, GraphData, AppStats, DreamReport } from '../types';

interface UseSubconsciousReturn {
    isConnected: boolean;
    isDreaming: boolean;
    messages: ChatMessage[];
    graph: GraphData | null;
    stats: AppStats | null;
    dreamThoughts: string[];
    lastIntuition: string | null;
    sendMessage: (text: string) => void;
    triggerDream: () => void;
    refreshStats: () => void;
}

export function useSubconscious(): UseSubconsciousReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isDreaming, setIsDreaming] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init',
            role: 'system',
            content: 'Bilinçaltı aktif. Bir şey yaz ve AI\'ın arka plan düşünce süreçlerini gözlemle.'
        }
    ]);
    const [graph, setGraph] = useState<GraphData | null>(null);
    const [stats, setStats] = useState<AppStats | null>(null);
    const [dreamThoughts, setDreamThoughts] = useState<string[]>([]);
    const [lastIntuition, setLastIntuition] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    const refreshStats = useCallback(() => {
        fetch('/api/stats').then(r => r.json()).then(setStats);
        fetch('/api/graph').then(r => r.json()).then(setGraph);
    }, []);

    const connect = useCallback(() => {
        // Always use relative WebSocket path — works both in dev proxy and production
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setIsConnected(true);
            if (reconnectTimeoutRef.current) {
                window.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                switch (msg.type) {
                    case 'chat_response':
                        setMessages(prev => {
                            const filtered = prev.filter(m => m.id !== 'loading');
                            const assistantMsg: ChatMessage = {
                                id: Date.now().toString(),
                                role: 'assistant',
                                content: msg.data.response,
                                subconscious: msg.data.subconscious
                            };
                            if (msg.data.subconscious?.intuition) {
                                setLastIntuition(msg.data.subconscious.intuition);
                            }
                            return [...filtered, assistantMsg];
                        });
                        break;

                    case 'graph_update':
                        setGraph(msg.data);
                        break;

                    case 'stats_update':
                        setStats(msg.data);
                        break;

                    case 'dream_report': {
                        setIsDreaming(false); // Set dreaming state to false
                        const report = msg.data as DreamReport;
                        // For demonstration, let's inject a system message that the dream finished
                        setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: 'system',
                            content: `Rüya tamamlandı. ${report.new_connections || 0} yeni bağlantı kuruldu.`
                        }]);
                        if (report.dream_thoughts?.length > 0) { // Changed from report.summary
                            setDreamThoughts(prev => [...report.dream_thoughts, ...prev].slice(0, 5)); // Changed from report.summary
                        }
                        refreshStats(); // Refresh stats after dream
                        break;
                    }
                }
            } catch (err) {
                console.error('WS parse error:', err);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            wsRef.current = null;
            reconnectTimeoutRef.current = window.setTimeout(() => connect(), 3000);
        };

        ws.onerror = () => ws.close();
        wsRef.current = ws;
    }, [refreshStats]); // Added refreshStats to dependencies

    useEffect(() => {
        connect();

        // Initial data fetch — relative paths (same origin, no CORS)
        fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => { });
        fetch('/api/graph').then(r => r.json()).then(setGraph).catch(() => { });

        return () => {
            wsRef.current?.close();
            if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);

    const sendMessage = useCallback((text: string) => {
        if (!text.trim()) return;

        const userMsg: ChatMessage = { id: `${Date.now()}-user`, role: 'user', content: text };
        const loadingMsg: ChatMessage = { id: 'loading', role: 'system', content: '...' };

        setMessages(prev => [...prev, userMsg, loadingMsg]);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'chat', message: text }));
        } else {
            // REST fallback — relative path
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, show_subconscious: true })
            })
                .then(r => r.json())
                .then(data => {
                    setMessages(prev => {
                        const filtered = prev.filter(m => m.id !== 'loading');
                        return [...filtered, {
                            id: Date.now().toString(),
                            role: 'assistant' as const,
                            content: data.response,
                            subconscious: data.subconscious
                        }];
                    });
                    if (data.subconscious?.intuition) setLastIntuition(data.subconscious.intuition);
                    refreshStats();
                })
                .catch(() => {
                    setMessages(prev => {
                        const filtered = prev.filter(m => m.id !== 'loading');
                        return [...filtered, { id: Date.now().toString(), role: 'system' as const, content: 'Bağlantı hatası.' }];
                    });
                });
        }
    }, [refreshStats]); // Added refreshStats to dependencies

    const triggerDream = useCallback(() => {
        setIsDreaming(true); // Set dreaming state to true
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'dream' }));
        } else {
            fetch('/api/dream', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    setIsDreaming(false); // Set dreaming state to false
                    if (data.dream_thoughts?.length > 0) { // Changed from data.summary
                        setDreamThoughts(prev => [...data.dream_thoughts, ...prev].slice(0, 5)); // Changed from data.summary
                    }
                    setMessages(prev => [...prev, { // Added system message
                        id: Date.now().toString(),
                        role: 'system',
                        content: `Rüya tamamlandı. ${data.new_connections || 0} yeni bağlantı kuruldu.`
                    }]);
                    refreshStats();
                }).catch(() => {
                    setIsDreaming(false); // Set dreaming state to false on error
                });
        }
    }, [refreshStats]);



    return { isConnected, isDreaming, messages, graph, stats, dreamThoughts, lastIntuition, sendMessage, triggerDream, refreshStats };
}
