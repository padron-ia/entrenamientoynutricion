import { useState, useEffect } from 'react';
import { gymService } from '../../../services/gymService';
import type { GymMember } from '../../../types';

export function useGymMember(userId: string | undefined) {
  const [member, setMember] = useState<GymMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    gymService.getMemberByUserId(userId)
      .then(m => { setMember(m); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [userId]);

  return { member, isLoading, isGymMember: !!member };
}
