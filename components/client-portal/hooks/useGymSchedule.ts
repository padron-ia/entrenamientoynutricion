import { useState, useEffect, useMemo } from 'react';
import { gymService } from '../../../services/gymService';
import type { GymClassSlot } from '../../../types';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function useGymSchedule(memberId: string | undefined) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [slots, setSlots] = useState<GymClassSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart.getTime()]
  );

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];
      const data = await gymService.getClassSlotsWithBookings(startDate, endDate, memberId);
      setSlots(data);
    } catch {
      // silently fail
    }
    setIsLoading(false);
  };

  useEffect(() => { loadSlots(); }, [weekStart.getTime(), memberId]);

  const navigateWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  const goToThisWeek = () => setWeekStart(getMonday(new Date()));

  const slotsByDay = useMemo(() => {
    const map: Record<string, GymClassSlot[]> = {};
    weekDates.forEach(d => {
      map[d.toISOString().split('T')[0]] = [];
    });
    slots.forEach(s => {
      if (map[s.date]) map[s.date].push(s);
    });
    return map;
  }, [slots, weekDates]);

  return {
    weekStart,
    weekDates,
    slots,
    slotsByDay,
    isLoading,
    navigateWeek,
    goToThisWeek,
    refresh: loadSlots,
  };
}
