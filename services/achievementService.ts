import { supabase } from './supabaseClient';
import { Client } from '../types';

interface Achievement {
    id: string;
    code: string;
    title: string;
}

const MILESTONES = [
    { code: 'minus_5kg', type: 'weight_loss', threshold: 5 },
    { code: 'minus_10kg', type: 'weight_loss', threshold: 10 },
    { code: 'minus_15kg', type: 'weight_loss', threshold: 15 }, // Needs DB update if not present
    { code: 'minus_20kg', type: 'weight_loss', threshold: 20 },
    { code: 'minus_25kg', type: 'weight_loss', threshold: 25 },
    { code: 'minus_30kg', type: 'weight_loss', threshold: 30 },
];

export const checkAndUnlockAchievements = async (client: Client) => {
    if (!client.id) return;

    try {
        // 1. Calculate metrics
        const startWeight = Number(client.initial_weight) || 0;
        const currentWeight = Number(client.current_weight) || 0;
        const lostWeight = startWeight > 0 && currentWeight > 0 ? startWeight - currentWeight : 0;

        // 2. Fetch all system achievements
        const { data: allAchievements } = await supabase
            .from('achievements')
            .select('id, code');

        if (!allAchievements) return;

        // 3. Fetch already unlocked achievements for this client
        const { data: unlocked } = await supabase
            .from('client_achievements')
            .select('achievement_id')
            .eq('client_id', client.id);

        const unlockedIds = new Set(unlocked?.map(u => u.achievement_id) || []);

        // 4. Check each milestone
        const newUnlocks = [];

        for (const milestone of MILESTONES) {
            // Find corresponding achievement in DB
            const dbAchievement = allAchievements.find(a => a.code === milestone.code);
            if (!dbAchievement) continue;

            // Skip if already unlocked
            if (unlockedIds.has(dbAchievement.id)) continue;

            // Check criteria
            if (milestone.type === 'weight_loss') {
                if (lostWeight >= milestone.threshold) {
                    newUnlocks.push({
                        client_id: client.id,
                        achievement_id: dbAchievement.id,
                        unlocked_at: new Date().toISOString()
                    });
                }
            }
        }

        // 5. Insert new unlocks
        if (newUnlocks.length > 0) {
            const { error } = await supabase
                .from('client_achievements')
                .insert(newUnlocks);

            if (error) console.error('Error unlocking achievements:', error);
            else console.log(`[GAMIFICATION] Unlocked ${newUnlocks.length} achievements for client ${client.id}`);
        }

    } catch (error) {
        console.error('Error in achievement check:', error);
    }
};
