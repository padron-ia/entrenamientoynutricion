import React, { useState } from 'react';
import { ChevronRight, FileText, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react';
import { Client } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { SignaturePad } from '../shared/SignaturePad';
import { useToast } from '../ToastProvider';
import { generateContractHTML, calculateDaysFromMonths, getMesesList, ContractData } from '../../utils/contractTemplate';
import jsPDF from 'jspdf';

interface ContractViewProps {
    client: Client;
    onBack: () => void;
    onRefresh?: () => void;
}

export function ContractView({ client, onBack, onRefresh }: ContractViewProps) {
    const toast = useToast();
    const [accepted, setAccepted] = useState(false);
    const [healthConsent, setHealthConsent] = useState(false);
    const [signatureData, setSignatureData] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [wasSignedSuccessfully, setWasSignedSuccessfully] = useState(false);

    const isSigned = client.program?.contract_signed || wasSignedSuccessfully;
    const signedAt = wasSignedSuccessfully ? new Date().toISOString() : client.program?.contract_signed_at;
    const signatureImage = wasSignedSuccessfully ? signatureData : client.program?.contract_signature_image;

    // Build contract data from client fields
    const program = client.program || {} as any;
    const meses = getMesesList();
    const contractDate = program.contract_date || '';
    const parsedDate = contractDate ? new Date(contractDate + 'T00:00:00') : null;

    const duracionMeses = client.program_duration_months || 3;
    const contractData: ContractData = {
        fechaDia: parsedDate ? parsedDate.getDate().toString() : '____',
        fechaMes: parsedDate ? meses[parsedDate.getMonth()] : '________',
        fechaAno: parsedDate ? parsedDate.getFullYear().toString() : '202_',
        nombreCliente: `${client.firstName || ''} ${client.surname || ''}`.trim(),
        dniCliente: client.idNumber || '',
        domicilioCliente: client.address || '',
        duracionMeses: duracionMeses,
        duracionDias: calculateDaysFromMonths(duracionMeses),
        importe: program.contract_amount || 0,
        financiacionPlazos: program.contract_financing_installments || 0,
        financiacionImporte: program.contract_financing_amount || 0
    };

    const contractHTML = generateContractHTML(contractData);

    const getContractPlainText = (): string => {
        // Strip HTML tags for PDF generation
        return contractHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const handleSign = async () => {
        if (!signatureData) {
            toast.error('Debes firmar antes de continuar');
            return;
        }
        if (!accepted) {
            toast.error('Debes aceptar los términos del contrato');
            return;
        }
        if (!healthConsent) {
            toast.error('Debes aceptar el tratamiento de datos de salud');
            return;
        }

        setIsSigning(true);
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('clientes_pt_notion')
                .update({
                    contract_signed: true,
                    contract_signed_at: now,
                    contract_signature_image: signatureData
                })
                .eq('id', client.id)
                .select();

            if (error) {
                toast.error(`Error de base de datos: ${error.message}`);
                throw error;
            }

            if (!data || data.length === 0) {
                toast.error('No se pudo guardar la firma. Contacta con soporte.');
                return;
            }

            setWasSignedSuccessfully(true);
            toast.success('Contrato firmado correctamente');
            if (onRefresh) onRefresh();
        } catch (err: any) {
            console.error('Error signing contract:', err);
            toast.error(`Error al firmar: ${err.message || 'Error desconocido'}`);
        } finally {
            setIsSigning(false);
        }
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentW = pageW - 2 * margin;
            let y = margin;

            const addNewPageIfNeeded = (requiredSpace: number) => {
                if (y + requiredSpace > pageH - margin) {
                    doc.addPage();
                    y = margin;
                }
            };

            // Header bar
            doc.setFillColor(16, 185, 129);
            doc.rect(0, 0, pageW, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Padron Trainer', margin, 13);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Contrato de Prestacion de Servicios', margin, 21);

            const clientName = `${client.firstName || ''} ${client.surname || ''}`.trim();
            doc.setFontSize(9);
            doc.text(clientName, pageW - margin, 13, { align: 'right' });

            y = 38;

            // Contract text
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            const contractText = getContractPlainText();
            const lines = doc.splitTextToSize(contractText, contentW);

            for (let i = 0; i < lines.length; i++) {
                addNewPageIfNeeded(6);
                doc.text(lines[i], margin, y);
                y += 4.5;
            }

            // Signature section
            addNewPageIfNeeded(60);
            y += 10;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, margin + contentW / 2 - 10, y);
            doc.line(margin + contentW / 2 + 10, y, margin + contentW, y);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('Empresa (Sello/Firma)', margin + contentW / 4 - 10, y + 6, { align: 'center' });
            doc.text('Cliente (Firma Digital)', margin + contentW * 3 / 4 + 10, y + 6, { align: 'center' });

            try {
                doc.addImage('/firma_victor.png', 'PNG', margin + 5, y - 25, 45, 22);
            } catch (e) {
                console.warn('Could not add Victor signature to PDF', e);
            }

            if (signatureImage || signatureData) {
                const sigImg = signatureImage || signatureData;
                try {
                    doc.addImage(sigImg, 'PNG', margin + contentW / 2 + 15, y - 30, 50, 25);
                } catch { /* ignore */ }
            }

            y += 12;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            const signedDate = signedAt ? new Date(signedAt).toLocaleDateString('es-ES') : 'Pendiente';
            doc.text(`Firmado electronicamente por ${clientName} - ${signedDate}`, margin + contentW * 3 / 4 + 10, y, { align: 'center' });

            doc.save(`Contrato_${clientName.replace(/\s+/g, '_')}.pdf`);
            toast.success('PDF descargado');
        } catch (err) {
            console.error('Error generating PDF:', err);
            toast.error('Error al generar el PDF');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold group">
                <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> Volver al Dashboard
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-sea-50 text-sea-600 rounded-xl">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Mi Contrato</h2>
                    <p className="text-slate-500 text-sm">
                        {isSigned ? 'Contrato firmado' : 'Pendiente de firma'}
                    </p>
                </div>
            </div>

            {/* Signed Status Card */}
            {isSigned && (
                <div className="bg-sea-50 border border-sea-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-sea-500" />
                        <div>
                            <p className="font-bold text-sea-900">Contrato Firmado</p>
                            <p className="text-sm text-sea-700">
                                Firmado el {signedAt ? new Date(signedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 px-5 py-2.5 bg-sea-700 text-white rounded-xl hover:bg-sea-800 transition-colors text-sm font-bold shadow-lg shadow-sea-200 disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Descargar PDF
                    </button>
                </div>
            )}

            {/* Contract Content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden mb-6">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sea-400 via-sea-500 to-sea-600 opacity-80"></div>
                <div className="prose prose-slate prose-sm max-w-none text-justify leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: contractHTML }} />

                    {/* Signature Section */}
                    <div className="mt-12 grid grid-cols-2 gap-12">
                        <div className="text-center space-y-4">
                            <div className="h-32 border-b border-slate-300 flex items-center justify-center p-2">
                                <img
                                    src="/firma_victor.png"
                                    alt="Firma Dr. Víctor Bravo"
                                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                                    onError={(e) => {
                                        (e.target as any).style.display = 'none';
                                        (e.target as any).parentElement.innerHTML = '<span class="italic text-slate-400">Víctor Bravo Matilla</span>';
                                    }}
                                />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Empresa (Sello/Firma)</p>
                        </div>
                        <div className="text-center space-y-4">
                            <div className="h-32 border-b border-slate-300 flex items-center justify-center p-2">
                                {(signatureImage || signatureData) ? (
                                    <img
                                        src={signatureImage || signatureData}
                                        alt="Firma del Cliente"
                                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                                    />
                                ) : (
                                    <span className="text-xs italic text-slate-400">Pendiente de Firma</span>
                                )}
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Cliente (Firma Digital)</p>
                            {isSigned && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                    FIRMADO ELECTRONICAMENTE POR {client.firstName} {client.surname}<br />
                                    {signedAt || 'Fecha no registrada'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Signing Area - Only show if NOT signed */}
            {!isSigned && (
                <div className="space-y-4">
                    {/* RGPD Consent */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="text-blue-900 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Protección de Datos de Salud (RGPD)
                        </h4>
                        <p className="text-[11px] text-blue-800 leading-normal text-justify mb-3">
                            Para poder ofrecerte un servicio personalizado, necesitamos tratar tus datos de categoría especial (glucosa, peso, medicación, etc.). Estos datos serán visibles exclusivamente para tu Coach y el equipo de La Muralla Fit Boutique, y no serán compartidos con terceros sin tu permiso expreso.
                        </p>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-5 h-5 text-blue-600 rounded mt-0.5"
                                checked={healthConsent}
                                onChange={(e) => setHealthConsent(e.target.checked)}
                            />
                            <span className="text-xs font-bold text-blue-900">Consiento expresamente el tratamiento de mis datos de salud para la ejecución del programa. *</span>
                        </label>
                    </div>

                    {/* Accept Terms */}
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                        <input
                            type="checkbox"
                            className="w-5 h-5 text-sea-600 rounded"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                        />
                        <span className="text-sm text-slate-700">He leído y acepto los términos del contrato de colaboración.</span>
                    </label>

                    {/* Signature Pad */}
                    {accepted && healthConsent && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
                            <SignaturePad
                                onSignatureCapture={(data) => setSignatureData(data)}
                                onClear={() => setSignatureData('')}
                            />

                            <button
                                onClick={handleSign}
                                disabled={isSigning || !signatureData}
                                className="w-full py-3 bg-gradient-to-r from-accent-400 to-accent-500 text-white font-bold rounded-xl shadow-lg shadow-sea-200 hover:from-accent-500 hover:to-accent-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSigning ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Firmando...</>
                                ) : (
                                    <><CheckCircle2 className="w-5 h-5" /> Firmar Contrato</>
                                )}
                            </button>
                        </div>
                    )}

                    {(!accepted || !healthConsent) && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <p className="text-amber-700 text-xs italic">Debes aceptar ambas casillas para poder firmar el contrato.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
