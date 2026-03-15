
export enum CaseStatus {
    DRAFT = 'draft',
    READY = 'ready_for_editor',
    PUBLISHED = 'published'
}

export enum AssetType {
    BEFORE_AFTER = 'before_after',
    TELEGRAM = 'telegram',
    GRAPH = 'graph',
    HEALTH_DATA = 'health_data'
}

export enum AssetPeriod {
    BEFORE = 'before',
    AFTER = 'after',
    NONE = 'none'
}

export enum AssetView {
    FRONT = 'front',
    PROFILE = 'profile',
    BACK = 'back',
    CLOSEUP = 'closeup',
    OTHER = 'other'
}

export interface CarouselSlide {
    id: number;
    title: string;
    description: string;
    visualHook: string;
    copy: string; // Punchy text for the image
    designInstructions: string;
}

export interface AIOutput {
    slides: CarouselSlide[];
    generalCopy: string; // Long-form caption for Instagram
    extractedMetrics: {
        glucose?: string;
        hba1c?: string;
        weight?: string;
        other?: string;
    };
    emotionalTriggers: string[];
    journeyNarrative: {
        pain: string;
        turningPoint: string;
        victory: string;
    };
}

export interface SuccessCase {
    id: string;
    patientName: string;
    initialFear: string;
    lifeAchievement: string;
    status: CaseStatus;
    createdAt: string;
    clientId?: string;
    created_by?: string;
    assets: {
        id: string;
        url: string;
        type: AssetType;
        period?: AssetPeriod;
        view?: AssetView;
    }[];
    aiOutput?: AIOutput;
}

export interface Subscription {
    status: 'active' | 'expired' | 'canceled';
    currentPeriodEnd: string;
}
