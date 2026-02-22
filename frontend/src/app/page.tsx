"use client";

import { useSubconscious } from '@/hooks/useSubconscious';
import { Header } from '@/components/Header';
import { ChatPanel } from '@/components/ChatPanel';
import { GraphPanel } from '@/components/GraphPanel';
import { SidePanel } from '@/components/SidePanel';
import { AuroraBackground } from '@/components/ui/AuroraBackground';

export default function Home() {
  const {
    isConnected,
    isDreaming,
    messages,
    graph,
    stats,
    dreamThoughts,
    lastIntuition,
    sendMessage,
    triggerDream,
    refreshStats
  } = useSubconscious();

  return (
    <AuroraBackground showRadialGradient className="bg-bg-primary text-text-primary">
      {/* App floating layout */}
      <div className="relative z-10 flex flex-col h-full w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 gap-4 overflow-hidden">
        <Header stats={stats} isConnected={isConnected} />

        <div className="flex-1 flex gap-4 overflow-hidden rounded-2xl glass shadow-2xl">
          <ChatPanel
            messages={messages}
            isDreaming={isDreaming}
            onSendMessage={sendMessage}
            onTriggerDream={triggerDream}
            onRefresh={refreshStats}
          />
          <GraphPanel data={graph} />
          <SidePanel
            stats={stats}
            dreamThoughts={dreamThoughts}
            lastIntuition={lastIntuition}
          />
        </div>
      </div>
    </AuroraBackground>
  );
}
