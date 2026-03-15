import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { useToast } from '../../../components/ToastProvider';
import { Client } from '../../../types';
import { compressReceiptImage } from '../../../utils/imageCompression';

export function useClientPortalData(client: Client, onRefresh?: () => void | Promise<void>) {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [coachData, setCoachData] = useState<any>(null);
    const [hasMigratedSecurity, setHasMigratedSecurity] = useState(false);

    // Medication editing
    const [isEditingMedication, setIsEditingMedication] = useState(false);
    const [medicationValue, setMedicationValue] = useState(client.medical?.medication || '');
    const [isSavingMedication, setIsSavingMedication] = useState(false);

    // Payment states
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isUploadingPayment, setIsUploadingPayment] = useState(false);
    const [paymentFile, setPaymentFile] = useState<File | null>(null);

    const loadCoachData = async () => {
        if (client.coach_id) {
            const { data: cData } = await supabase
                .from('users')
                .select('name, photo_url, bio, specialty, calendar_url, email, instagram')
                .eq('id', client.coach_id)
                .single();
            if (cData) setCoachData(cData);
        }
    };

    const handleSecurityMigration = async (email: string, pass: string) => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setHasMigratedSecurity(true);
    };

    const handleMedicationSave = async () => {
        setIsSavingMedication(true);
        try {
            const { error } = await supabase
                .from('clientes_pt_notion')
                .update({ property_medicaci_n: medicationValue })
                .eq('id', client.id);

            if (error) throw error;

            toast.success('Medicación actualizada correctamente');
            setIsEditingMedication(false);
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error('Error saving medication:', error);
            toast.error('Error al guardar la medicación');
        } finally {
            setIsSavingMedication(false);
        }
    };

    const handlePaymentUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentFile) return;

        setIsUploadingPayment(true);
        try {
            const fileToUpload = await compressReceiptImage(paymentFile);
            const fileExt = fileToUpload.name.split('.').pop();
            const fileName = `${client.id}/${Date.now()}.${fileExt}`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, fileToUpload, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('clientes_pt_notion')
                .update({
                    renewal_payment_status: 'uploaded',
                    renewal_receipt_url: publicUrl
                })
                .eq('id', client.id);

            if (updateError) throw new Error(updateError.message || "Error al actualizar la base de datos");

            toast.success("¡Comprobante subido correctamente! Tu coach lo revisará pronto para activar tu nueva fase.");
            setIsPaymentModalOpen(false);
            setPaymentFile(null);

            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error('Error uploading receipt:', error);
            toast.error(`Hubo un error al guardar el pago: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsUploadingPayment(false);
        }
    };

    // Check-in window: only Friday (5) → Monday (1)
    const lastCheckinDate = client.last_checkin_submitted ? new Date(client.last_checkin_submitted) : null;
    const today = new Date();
    const dayOfWeek = today.getDay();
    // 0=Dom, 1=Lun, 5=Vie, 6=Sáb
    const isCheckinWindowOpen = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0 || dayOfWeek === 1;

    const shouldShowCheckinReminder = (() => {
        if (!isCheckinWindowOpen) return false;

        let fridayDate = new Date(today);
        // Retroceder al viernes de esta ventana
        const daysFromFriday = dayOfWeek === 0 ? 2 : dayOfWeek === 1 ? 3 : (dayOfWeek === 6 ? 1 : 0);
        fridayDate.setDate(fridayDate.getDate() - daysFromFriday);
        fridayDate.setHours(0, 0, 0, 0);

        if (!lastCheckinDate) return true;
        return lastCheckinDate < fridayDate;
    })();

    return {
        loading,
        setLoading,
        coachData,
        loadCoachData,
        hasMigratedSecurity,
        handleSecurityMigration,
        // Medication
        isEditingMedication, setIsEditingMedication,
        medicationValue, setMedicationValue,
        isSavingMedication,
        handleMedicationSave,
        // Payment
        isPaymentModalOpen, setIsPaymentModalOpen,
        isUploadingPayment,
        paymentFile, setPaymentFile,
        handlePaymentUpload,
        // Check-in reminder & window
        lastCheckinDate,
        shouldShowCheckinReminder,
        isCheckinWindowOpen,
    };
}
