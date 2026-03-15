import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

export function useUnreadCounts(clientId: string, activeView: string) {
    const [unreadReportsCount, setUnreadReportsCount] = useState(0);
    const [unreadReviewsCount, setUnreadReviewsCount] = useState(0);
    const [unreadMedicalReviewsCount, setUnreadMedicalReviewsCount] = useState(0);
    const [unreadCoachReviewsCount, setUnreadCoachReviewsCount] = useState(0);

    const REPORTS_READ_KEY = `ado_reports_last_seen_${clientId}`;
    const REVIEWS_READ_KEY = `ado_reviews_last_seen_${clientId}`;

    const loadUnreadCounts = async () => {
        try {
            // Attempt to load from Supabase
            let { data: settings, error: settingsError } = await supabase
                .from('client_portal_settings')
                .select('reports_last_seen_at, reviews_last_seen_at')
                .eq('client_id', clientId)
                .maybeSingle();

            if (settingsError) throw settingsError;

            let reportsLastSeen = settings?.reports_last_seen_at;
            let reviewsLastSeen = settings?.reviews_last_seen_at;

            // Migration fallback from localStorage if Supabase data is missing
            if (!settings) {
                const localReports = localStorage.getItem(REPORTS_READ_KEY);
                const localReviews = localStorage.getItem(REVIEWS_READ_KEY);

                reportsLastSeen = localReports;
                reviewsLastSeen = localReviews;

                // Initial sync to Supabase if we have local data
                if (localReports || localReviews) {
                    await supabase
                        .from('client_portal_settings')
                        .upsert({
                            client_id: clientId,
                            reports_last_seen_at: localReports,
                            reviews_last_seen_at: localReviews,
                            updated_at: new Date().toISOString()
                        });
                }
            }

            let reportsQuery = supabase
                .from('medical_reviews')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', clientId)
                .eq('report_type', 'Informe Médico')
                .eq('status', 'reviewed');
            if (reportsLastSeen) {
                reportsQuery = reportsQuery.gt('reviewed_at', reportsLastSeen);
            }
            const { count: reportsCount } = await reportsQuery;
            setUnreadReportsCount(reportsCount || 0);

            let medicalQuery = supabase
                .from('medical_reviews')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', clientId)
                .neq('report_type', 'Informe Médico')
                .eq('status', 'reviewed');
            if (reviewsLastSeen) {
                medicalQuery = medicalQuery.gt('reviewed_at', reviewsLastSeen);
            }

            let coachQuery = supabase
                .from('weekly_checkins')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', clientId)
                .eq('status', 'reviewed');
            if (reviewsLastSeen) {
                coachQuery = coachQuery.gt('reviewed_at', reviewsLastSeen);
            }

            const [{ count: medCount }, { count: coachCount }] = await Promise.all([medicalQuery, coachQuery]);
            const mCount = medCount || 0;
            const cCount = coachCount || 0;
            setUnreadMedicalReviewsCount(mCount);
            setUnreadCoachReviewsCount(cCount);
            setUnreadReviewsCount(mCount + cCount);
        } catch (err) {
            console.warn('Error loading unread counts:', err);
        }
    };

    const markReportsAsRead = async () => {
        const now = new Date().toISOString();
        // Update Supabase
        await supabase
            .from('client_portal_settings')
            .upsert({
                client_id: clientId,
                reports_last_seen_at: now,
                updated_at: now
            }, { onConflict: 'client_id' });

        // Update local for immediate UI feedback (optional but good)
        localStorage.setItem(REPORTS_READ_KEY, now);
        setUnreadReportsCount(0);
    };

    const markReviewsAsRead = async () => {
        const now = new Date().toISOString();
        // Update Supabase
        await supabase
            .from('client_portal_settings')
            .upsert({
                client_id: clientId,
                reviews_last_seen_at: now,
                updated_at: now
            }, { onConflict: 'client_id' });

        // Update local
        localStorage.setItem(REVIEWS_READ_KEY, now);
        setUnreadReviewsCount(0);
        setUnreadMedicalReviewsCount(0);
        setUnreadCoachReviewsCount(0);
    };

    useEffect(() => {
        loadUnreadCounts();
    }, [clientId]);

    useEffect(() => {
        if (activeView === 'reports') markReportsAsRead();
        if (activeView === 'reviews') markReviewsAsRead();
    }, [activeView]);

    return {
        unreadReportsCount,
        unreadReviewsCount,
        unreadMedicalReviewsCount,
        unreadCoachReviewsCount,
        markReportsAsRead,
        markReviewsAsRead,
    };
}
