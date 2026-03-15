import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { useToast } from '../../../components/ToastProvider';
import { Client } from '../../../types';
import { parseLocalizedNumber } from '../../../utils/numberParsing';

interface WeightEntry {
    id: string;
    date: string;
    weight: number;
    source: string;
}

export function useWeightTracking(client: Client, onRefresh?: () => void | Promise<void>) {
    const toast = useToast();
    const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Target Weight Edit
    const [isEditingTargetWeight, setIsEditingTargetWeight] = useState(false);
    const [tempTargetWeight, setTempTargetWeight] = useState(client.target_weight?.toString() || '');
    const [isSavingTargetWeight, setIsSavingTargetWeight] = useState(false);
    const [localTargetWeight, setLocalTargetWeight] = useState<number | null>(null);

    useEffect(() => {
        if (client.target_weight) {
            setLocalTargetWeight(client.target_weight);
        }
    }, [client.target_weight]);

    const loadWeightHistory = async () => {
        const { data } = await supabase
            .from('weight_history')
            .select('*')
            .eq('client_id', client.id)
            .order('date', { ascending: false })
            .limit(12);
        if (data) setWeightHistory(data);
    };

    const handleWeightSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWeight) return;
        setIsSubmitting(true);
        try {
            const weightVal = parseLocalizedNumber(newWeight);
            if (!weightVal || weightVal <= 0) {
                toast.error('Peso no valido');
                return;
            }
            const today = new Date().toISOString().split('T')[0];

            const { error: historyError } = await supabase
                .from('weight_history')
                .upsert(
                    [{
                        client_id: client.id,
                        weight: weightVal,
                        date: today,
                        source: 'user_input'
                    }],
                    { onConflict: 'client_id,date' }
                );

            if (historyError) throw historyError;

            loadWeightHistory();
            setIsWeightModalOpen(false);
            setNewWeight('');
        } catch (error: any) {
            console.error('[WEIGHT] Error saving:', error);
            const detail = error?.message || error?.details || error?.code || JSON.stringify(error);
            alert(`Error al guardar peso: ${detail}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTargetWeightSave = async () => {
        const weightVal = parseLocalizedNumber(tempTargetWeight);
        if (!weightVal || weightVal <= 0) return toast.error('Peso no válido');

        setIsSavingTargetWeight(true);
        try {
            const { error, count } = await supabase
                .from('clientes_pt_notion')
                .update({ property_peso_objetivo: weightVal })
                .eq('id', client.id)
                .select('id', { count: 'exact', head: true });

            if (error) throw error;

            // Supabase no devuelve error si RLS bloquea el UPDATE, simplemente actualiza 0 filas
            if (count === 0) {
                console.warn('[TARGET_WEIGHT] Update affected 0 rows - possible RLS issue');
                toast.error('No se pudo guardar: el servidor rechazó la actualización. Contacta con soporte.');
                return;
            }

            setLocalTargetWeight(weightVal);
            toast.success('Peso objetivo guardado correctamente');
            setIsEditingTargetWeight(false);
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error('[TARGET_WEIGHT] Error saving:', error);
            const detail = error?.message || error?.details || error?.code || JSON.stringify(error);
            toast.error(`Error al guardar peso objetivo: ${detail}`);
        } finally {
            setIsSavingTargetWeight(false);
        }
    };

    // Progress calculations
    const currentWeight = weightHistory.length > 0 ? weightHistory[0].weight : (client.current_weight || 0);
    const oldestLoadedWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : currentWeight;
    const startWeight = client.initial_weight || (client as any).starting_weight || oldestLoadedWeight;
    const targetWeight = localTargetWeight || client.target_weight || startWeight;

    const totalDist = targetWeight - startWeight;
    const currentDist = currentWeight - startWeight;

    let weightProgress = 0;
    if (Math.abs(totalDist) > 0.1) {
        const rawProgress = currentDist / totalDist;
        weightProgress = Math.min(100, Math.max(0, Math.round(rawProgress * 100)));
    }

    const remainingWeight = Math.abs(targetWeight - currentWeight).toFixed(1);
    const isWeightLoss = totalDist < 0;
    const lastWeightDate = weightHistory.length > 0 ? new Date(weightHistory[0].date) : null;

    return {
        weightHistory,
        loadWeightHistory,
        currentWeight,
        startWeight,
        targetWeight,
        weightProgress,
        remainingWeight,
        isWeightLoss,
        lastWeightDate,
        // Modal
        isWeightModalOpen,
        setIsWeightModalOpen,
        newWeight,
        setNewWeight,
        isSubmitting,
        handleWeightSubmit,
        // Target weight editing
        isEditingTargetWeight,
        setIsEditingTargetWeight,
        tempTargetWeight,
        setTempTargetWeight,
        isSavingTargetWeight,
        handleTargetWeightSave,
    };
}
