import { supabase } from './supabaseClient';
import type {
  GymServiceType,
  GymBono,
  GymMember,
  GymMemberCredit,
  GymClassSlot,
  GymReservation,
  GymBonoPurchase,
} from '../types';

// ============================================================================
// MODULO PRESENCIAL - Servicio de gimnasio
// ============================================================================

export const gymService = {

  // ======== SERVICE TYPES ========

  async getServiceTypes(): Promise<GymServiceType[]> {
    const { data, error } = await supabase
      .from('gym_service_types')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async createServiceType(input: Partial<GymServiceType>): Promise<GymServiceType> {
    const { data, error } = await supabase
      .from('gym_service_types')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateServiceType(id: string, input: Partial<GymServiceType>): Promise<void> {
    const { error } = await supabase
      .from('gym_service_types')
      .update(input)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteServiceType(id: string): Promise<void> {
    const { error } = await supabase
      .from('gym_service_types')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ======== BONOS ========

  async getBonos(): Promise<GymBono[]> {
    const { data, error } = await supabase
      .from('gym_bonos')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getActiveBonos(): Promise<GymBono[]> {
    const { data, error } = await supabase
      .from('gym_bonos')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createBono(input: Partial<GymBono>): Promise<GymBono> {
    const { data, error } = await supabase
      .from('gym_bonos')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBono(id: string, input: Partial<GymBono>): Promise<void> {
    const { error } = await supabase
      .from('gym_bonos')
      .update(input)
      .eq('id', id);
    if (error) throw error;
  },

  // ======== MEMBERS ========

  async getMembers(): Promise<GymMember[]> {
    const { data, error } = await supabase
      .from('gym_members')
      .select('*')
      .order('last_name');
    if (error) throw error;
    return (data || []).map(m => ({
      ...m,
      full_name: `${m.first_name} ${m.last_name}`,
    }));
  },

  async getMemberByUserId(userId: string): Promise<GymMember | null> {
    const { data, error } = await supabase
      .from('gym_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...data, full_name: `${data.first_name} ${data.last_name}` };
  },

  async getMemberById(id: string): Promise<GymMember | null> {
    const { data, error } = await supabase
      .from('gym_members')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { ...data, full_name: `${data.first_name} ${data.last_name}` };
  },

  async createMember(input: Partial<GymMember>): Promise<GymMember> {
    const { data, error } = await supabase
      .from('gym_members')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return { ...data, full_name: `${data.first_name} ${data.last_name}` };
  },

  async updateMember(id: string, input: Partial<GymMember>): Promise<void> {
    const { error } = await supabase
      .from('gym_members')
      .update(input)
      .eq('id', id);
    if (error) throw error;
  },

  // ======== CREDITS ========

  async getMemberCredits(memberId: string, includeExpired = false): Promise<GymMemberCredit[]> {
    let query = supabase
      .from('gym_member_credits')
      .select('*, gym_bonos(name)')
      .eq('member_id', memberId)
      .eq('payment_status', 'completed')
      .order('valid_until', { ascending: true });

    if (!includeExpired) {
      query = query.eq('is_expired', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      bono_name: (c as any).gym_bonos?.name || '',
      gym_bonos: undefined,
    }));
  },

  async getMemberCreditSummary(memberId: string): Promise<{
    vigente: GymMemberCredit[];
    caducado: GymMemberCredit[];
  }> {
    const { data, error } = await supabase
      .from('gym_member_credits')
      .select('*, gym_bonos(name)')
      .eq('member_id', memberId)
      .eq('payment_status', 'completed')
      .order('valid_until', { ascending: false });

    if (error) throw error;
    const all = (data || []).map(c => ({
      ...c,
      bono_name: (c as any).gym_bonos?.name || '',
      gym_bonos: undefined,
    }));

    return {
      vigente: all.filter(c => !c.is_expired && c.valid_until >= new Date().toISOString().split('T')[0]),
      caducado: all.filter(c => c.is_expired || c.valid_until < new Date().toISOString().split('T')[0]),
    };
  },

  async addManualCredits(
    memberId: string,
    bonoId: string,
    paymentProvider: 'manual' | 'cash' = 'manual',
    paymentReference?: string
  ): Promise<GymMemberCredit> {
    // Obtener datos del bono
    const { data: bono, error: bonoError } = await supabase
      .from('gym_bonos')
      .select('*')
      .eq('id', bonoId)
      .single();
    if (bonoError) throw bonoError;

    // Calcular valid_until = ultimo dia del mes actual
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const validUntil = lastDay.toISOString().split('T')[0];

    const { data: credit, error } = await supabase
      .from('gym_member_credits')
      .insert({
        member_id: memberId,
        bono_id: bonoId,
        total_sessions: bono.sessions_count,
        valid_from: now.toISOString().split('T')[0],
        valid_until: validUntil,
        payment_provider: paymentProvider,
        payment_reference: paymentReference || `manual_${Date.now()}`,
        payment_status: 'completed',
        amount_paid: bono.price,
      })
      .select()
      .single();
    if (error) throw error;

    // Registrar compra
    await supabase.from('gym_bono_purchases').insert({
      member_id: memberId,
      bono_id: bonoId,
      credit_id: credit.id,
      amount: bono.price,
      payment_provider: paymentProvider,
      payment_reference: paymentReference || `manual_${Date.now()}`,
      payment_status: 'completed',
    });

    return credit;
  },

  // ======== CLASS SLOTS (HORARIO) ========

  async getClassSlots(startDate: string, endDate: string): Promise<GymClassSlot[]> {
    const { data, error } = await supabase
      .from('gym_class_slots')
      .select('*, gym_service_types(name, color, icon, is_bookable_by_client), profiles!gym_class_slots_coach_id_fkey(name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return (data || []).map(s => ({
      ...s,
      service_type: (s as any).gym_service_types || undefined,
      coach_name: (s as any).profiles?.name || undefined,
      gym_service_types: undefined,
      profiles: undefined,
    }));
  },

  async getClassSlotsForWeek(weekStartDate: string): Promise<GymClassSlot[]> {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return this.getClassSlots(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  },

  async getClassSlotsWithBookings(startDate: string, endDate: string, memberId?: string): Promise<GymClassSlot[]> {
    const slots = await this.getClassSlots(startDate, endDate);

    // Obtener conteo de reservas confirmadas por slot
    const slotIds = slots.map(s => s.id);
    if (slotIds.length === 0) return slots;

    const { data: bookings } = await supabase
      .from('gym_reservations')
      .select('class_slot_id, status')
      .in('class_slot_id', slotIds)
      .in('status', ['confirmed', 'waitlisted']);

    const bookingCounts: Record<string, number> = {};
    (bookings || []).forEach(b => {
      if (b.status === 'confirmed') {
        bookingCounts[b.class_slot_id] = (bookingCounts[b.class_slot_id] || 0) + 1;
      }
    });

    // Si hay memberId, obtener sus reservas
    let memberReservations: Record<string, { status: string; id: string }> = {};
    if (memberId) {
      const { data: myRes } = await supabase
        .from('gym_reservations')
        .select('id, class_slot_id, status')
        .eq('member_id', memberId)
        .in('class_slot_id', slotIds)
        .in('status', ['confirmed', 'waitlisted']);

      (myRes || []).forEach(r => {
        memberReservations[r.class_slot_id] = { status: r.status, id: r.id };
      });
    }

    return slots.map(s => ({
      ...s,
      current_bookings: bookingCounts[s.id] || 0,
      is_full: (bookingCounts[s.id] || 0) >= s.capacity,
      user_reservation_status: memberReservations[s.id]?.status as any || null,
      user_reservation_id: memberReservations[s.id]?.id || undefined,
    }));
  },

  async createClassSlot(input: Partial<GymClassSlot>): Promise<GymClassSlot> {
    const { data, error } = await supabase
      .from('gym_class_slots')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateClassSlot(id: string, input: Partial<GymClassSlot>): Promise<void> {
    const { error } = await supabase
      .from('gym_class_slots')
      .update(input)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteClassSlot(id: string): Promise<void> {
    const { error } = await supabase
      .from('gym_class_slots')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async duplicateWeekSchedule(sourceWeekStart: string, targetWeekStart: string): Promise<number> {
    const sourceSlots = await this.getClassSlotsForWeek(sourceWeekStart);
    if (sourceSlots.length === 0) return 0;

    const sourceStart = new Date(sourceWeekStart);
    const targetStart = new Date(targetWeekStart);
    const dayOffset = Math.round((targetStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

    const newSlots = sourceSlots.map(s => {
      const originalDate = new Date(s.date);
      originalDate.setDate(originalDate.getDate() + dayOffset);
      return {
        service_type_id: s.service_type_id,
        date: originalDate.toISOString().split('T')[0],
        start_time: s.start_time,
        end_time: s.end_time,
        title: s.title,
        coach_id: s.coach_id,
        capacity: s.capacity,
        notes: s.notes,
      };
    });

    const { error } = await supabase
      .from('gym_class_slots')
      .insert(newSlots);
    if (error) throw error;
    return newSlots.length;
  },

  // ======== RESERVATIONS ========

  async bookClass(memberId: string, classSlotId: string): Promise<{
    success: boolean;
    status?: string;
    message?: string;
    error?: string;
    credit_remaining?: number;
    waitlist_position?: number;
  }> {
    const { data, error } = await supabase.rpc('book_class', {
      p_member_id: memberId,
      p_class_slot_id: classSlotId,
    });
    if (error) throw error;
    return data;
  },

  async cancelReservation(reservationId: string, cancelledBy = 'client'): Promise<{
    success: boolean;
    credit_returned?: boolean;
    message?: string;
    error?: string;
  }> {
    const { data, error } = await supabase.rpc('cancel_reservation', {
      p_reservation_id: reservationId,
      p_cancelled_by: cancelledBy,
    });
    if (error) throw error;
    return data;
  },

  async assignPersonalSession(memberId: string, classSlotId: string, assignedBy: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const { data, error } = await supabase.rpc('assign_personal_session', {
      p_member_id: memberId,
      p_class_slot_id: classSlotId,
      p_assigned_by: assignedBy,
    });
    if (error) throw error;
    return data;
  },

  async getMyReservations(memberId: string, filter: 'upcoming' | 'past'): Promise<GymReservation[]> {
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('gym_reservations')
      .select('*, gym_class_slots(*, gym_service_types(name, color, icon), profiles!gym_class_slots_coach_id_fkey(name))')
      .eq('member_id', memberId);

    if (filter === 'upcoming') {
      query = query
        .in('status', ['confirmed', 'waitlisted'])
        .gte('gym_class_slots.date', today)
        .order('created_at', { ascending: true });
    } else {
      query = query
        .in('status', ['confirmed', 'cancelled', 'attended', 'no_show'])
        .lt('gym_class_slots.date', today)
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(r => {
      const slot = (r as any).gym_class_slots;
      return {
        ...r,
        class_slot: slot ? {
          ...slot,
          service_type: slot.gym_service_types || undefined,
          coach_name: slot.profiles?.name || undefined,
          gym_service_types: undefined,
          profiles: undefined,
        } : undefined,
        gym_class_slots: undefined,
      };
    });
  },

  async getSlotReservations(classSlotId: string): Promise<GymReservation[]> {
    const { data, error } = await supabase
      .from('gym_reservations')
      .select('*, gym_members(first_name, last_name, email, phone)')
      .eq('class_slot_id', classSlotId)
      .in('status', ['confirmed', 'waitlisted'])
      .order('status')
      .order('waitlist_position');

    if (error) throw error;
    return (data || []).map(r => ({
      ...r,
      member_name: (r as any).gym_members
        ? `${(r as any).gym_members.first_name} ${(r as any).gym_members.last_name}`
        : undefined,
      gym_members: undefined,
    }));
  },

  // ======== PURCHASES ========

  async getPurchaseHistory(memberId: string): Promise<GymBonoPurchase[]> {
    const { data, error } = await supabase
      .from('gym_bono_purchases')
      .select('*, gym_bonos(name, sessions_count)')
      .eq('member_id', memberId)
      .order('purchased_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      bono_name: (p as any).gym_bonos?.name || '',
      bono_sessions: (p as any).gym_bonos?.sessions_count || 0,
      gym_bonos: undefined,
    }));
  },

  // ======== ADMIN QUERIES ========

  async getOccupancyReport(date: string): Promise<(GymClassSlot & { confirmed_count: number; waitlisted_count: number })[]> {
    const slots = await this.getClassSlots(date, date);
    const slotIds = slots.map(s => s.id);
    if (slotIds.length === 0) return [];

    const { data: reservations } = await supabase
      .from('gym_reservations')
      .select('class_slot_id, status')
      .in('class_slot_id', slotIds)
      .in('status', ['confirmed', 'waitlisted']);

    const counts: Record<string, { confirmed: number; waitlisted: number }> = {};
    (reservations || []).forEach(r => {
      if (!counts[r.class_slot_id]) counts[r.class_slot_id] = { confirmed: 0, waitlisted: 0 };
      if (r.status === 'confirmed') counts[r.class_slot_id].confirmed++;
      if (r.status === 'waitlisted') counts[r.class_slot_id].waitlisted++;
    });

    return slots.map(s => ({
      ...s,
      confirmed_count: counts[s.id]?.confirmed || 0,
      waitlisted_count: counts[s.id]?.waitlisted || 0,
    }));
  },
};
