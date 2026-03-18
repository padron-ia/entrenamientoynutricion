import { useState, useEffect } from 'react';
import { gymService } from '../../../services/gymService';
import type { GymReservation } from '../../../types';

export function useGymReservations(memberId: string | undefined) {
  const [upcoming, setUpcoming] = useState<GymReservation[]>([]);
  const [past, setPast] = useState<GymReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    if (!memberId) return;
    try {
      const [u, p] = await Promise.all([
        gymService.getMyReservations(memberId, 'upcoming'),
        gymService.getMyReservations(memberId, 'past'),
      ]);
      setUpcoming(u);
      setPast(p);
    } catch {
      // silently fail
    }
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [memberId]);

  return { upcoming, past, isLoading, refresh: load };
}
