import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { useToast } from '../../../components/ToastProvider';
import { Client } from '../../../types';

export function useGoalsEditor(client: Client, onRefresh?: () => void | Promise<void>) {
    const toast = useToast();
    const cAny = client as any;

    const [localGoals, setLocalGoals] = useState(cAny.goals || {});
    useEffect(() => { setLocalGoals(cAny.goals || {}); }, [cAny.goals]);

    // 3 months
    const [isEditingGoal3, setIsEditingGoal3] = useState(false);
    const [tempGoal3, setTempGoal3] = useState(localGoals.goal_3_months || '');
    const [isSavingGoal3, setIsSavingGoal3] = useState(false);

    // 6 months
    const [isEditingGoal6, setIsEditingGoal6] = useState(false);
    const [tempGoal6, setTempGoal6] = useState(localGoals.goal_6_months || '');
    const [isSavingGoal6, setIsSavingGoal6] = useState(false);

    // 1 year
    const [isEditingGoal1, setIsEditingGoal1] = useState(false);
    const [tempGoal1, setTempGoal1] = useState(localGoals.goal_1_year || '');
    const [isSavingGoal1, setIsSavingGoal1] = useState(false);

    const handleGoalSave = async (period: '3m' | '6m' | '1y') => {
        let value = '';
        let column = '';
        let setSaving: (v: boolean) => void = () => { };
        let setEditing: (v: boolean) => void = () => { };

        if (period === '3m') {
            value = tempGoal3;
            column = 'property_3_meses';
            setSaving = setIsSavingGoal3;
            setEditing = setIsEditingGoal3;
        } else if (period === '6m') {
            value = tempGoal6;
            column = 'property_6_meses';
            setSaving = setIsSavingGoal6;
            setEditing = setIsEditingGoal6;
        } else {
            value = tempGoal1;
            column = 'property_1_a_o';
            setSaving = setIsSavingGoal1;
            setEditing = setIsEditingGoal1;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({ [column]: value })
                .eq('id', client.id);

            if (error) throw error;

            toast.success('Objetivo actualizado correctamente');
            setEditing(false);
            setLocalGoals((prev: any) => ({
                ...prev,
                ...(period === '3m' ? { goal_3_months: value } : {}),
                ...(period === '6m' ? { goal_6_months: value } : {}),
                ...(period === '1y' ? { goal_1_year: value } : {}),
            }));
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error('Error saving goal:', error);
            toast.error('Error al actualizar el objetivo');
        } finally {
            setSaving(false);
        }
    };

    return {
        goals: localGoals,
        // 3 months
        isEditingGoal3, setIsEditingGoal3,
        tempGoal3, setTempGoal3,
        isSavingGoal3,
        // 6 months
        isEditingGoal6, setIsEditingGoal6,
        tempGoal6, setTempGoal6,
        isSavingGoal6,
        // 1 year
        isEditingGoal1, setIsEditingGoal1,
        tempGoal1, setTempGoal1,
        isSavingGoal1,
        // Save handler
        handleGoalSave,
    };
}
