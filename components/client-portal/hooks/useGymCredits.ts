import { useState, useEffect } from 'react';
import { gymService } from '../../../services/gymService';
import { supabase } from '../../../services/supabaseClient';
import type { GymMemberCredit } from '../../../types';

export function useGymCredits(memberId: string | undefined) {
  const [credits, setCredits] = useState<GymMemberCredit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCredits = async () => {
    if (!memberId) return;
    try {
      const data = await gymService.getMemberCredits(memberId, false);
      setCredits(data);
    } catch {
      // silently fail
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCredits();

    // Suscripcion realtime para actualizar creditos al instante
    if (!memberId) return;
    const channel = supabase
      .channel(`gym_credits_${memberId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gym_member_credits',
        filter: `member_id=eq.${memberId}`,
      }, () => { loadCredits(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [memberId]);

  const totalRemaining = credits.reduce((sum, c) => sum + c.remaining_sessions, 0);

  const daysUntilExpiry = credits.length > 0
    ? Math.max(0, Math.ceil(
        (new Date(credits[0].valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : 0;

  return { credits, isLoading, totalRemaining, daysUntilExpiry, refresh: loadCredits };
}
