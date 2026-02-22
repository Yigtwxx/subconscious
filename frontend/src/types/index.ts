export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    subconscious?: {
        associations: string[];
        intuition: string;
        emotion: {
            name: string;
            level: number;
        };
    };
}

export interface NodeData {
    id: string;
    label: string;
    weight: number;
    type: 'concept' | 'memory' | 'dream' | 'emotion';
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

export interface EdgeData {
    source: string;
    target: string;
    weight: number;
    type: string;
}

export interface GraphData {
    nodes: NodeData[];
    edges: EdgeData[];
}

export interface AppStats {
    memory: {
        stm_count: number;
        ltm_count: number;
    };
    associations: {
        nodes: number;
        edges: number;
        density: number;
    };
    emotions: {
        current: string;
        intensity: number;
        trend: string; /* improving, declining, stable */
    };
    dream: {
        count: number;
        last_dream: string | null;
    };
}

export interface DreamReport {
    timestamp: string;
    duration_seconds: number;
    concepts_processed: number;
    new_connections: number;
    patterns_found: string[];
    dream_thoughts: string[];
    emotional_shift?: {
        before: string;
        after: string;
    };
}
