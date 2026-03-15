import React, { useRef, useState, useEffect } from 'react';
import { OnboardingData } from '../OnboardingPage';
import { FileText, PenTool, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

interface ContractStepProps {
    formData: OnboardingData;
    updateField: (field: keyof OnboardingData, value: any) => void;
    contractDuration: number;
    templateContent?: string;
}

export function ContractStep({ formData, updateField, contractDuration, templateContent }: ContractStepProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [accepted, setAccepted] = useState(false);

    // Initialize canvas with high precision
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const resizeCanvas = () => {
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;

                // Set the internal resolution
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                }
            };

            resizeCanvas();
            // Debounced resize and initial stabilization
            const timer = setTimeout(resizeCanvas, 200);
            window.addEventListener('resize', resizeCanvas);

            return () => {
                window.removeEventListener('resize', resizeCanvas);
                clearTimeout(timer);
            };
        }
    }, []);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        } else {
            // For mouse events, use native offsetX/offsetY which are relative to the content area
            const mouseEvent = e as React.MouseEvent;
            const native = mouseEvent.nativeEvent;

            // If offsetX is available, it's the most precise as it's relative to the element
            if (typeof native.offsetX === 'number') {
                return { x: native.offsetX, y: native.offsetY };
            }

            // Fallback to manual calculation
            return {
                x: mouseEvent.clientX - rect.left,
                y: mouseEvent.clientY - rect.top
            };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const { x, y } = getCoordinates(e);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
        }

        if (e.cancelable) e.preventDefault();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const signatureData = canvas.toDataURL('image/png');
            updateField('signatureImage' as any, signatureData);
            setHasSignature(true);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        if (e.cancelable) e.preventDefault();
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasSignature(false);
            updateField('signatureImage' as any, '');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                    <h3 className="text-emerald-900 font-bold text-sm uppercase tracking-wider">Compromiso de Colaboración</h3>
                    <p className="text-emerald-700 text-xs mt-1">Este es el último paso para formalizar tu entrada al programa.</p>
                </div>
            </div>

            {/* Contract Container */}
            <div className="bg-white border border-slate-200 rounded-xl p-8 h-96 overflow-y-auto text-[13px] leading-relaxed text-slate-700 shadow-inner">
                <div className="max-w-none prose prose-slate prose-sm text-justify">
                    <div className="flex justify-center mb-6">
                        <img src="https://i.postimg.cc/h4m6qRgP/Logo_Academia_Diabetes.jpg" alt="Logo PT" className="w-24 h-24 object-contain" />
                    </div>

                    {templateContent ? (
                        <div className="whitespace-pre-wrap">
                            {templateContent
                                .replace(/\[DIA\]/g, new Date().getDate().toString())
                                .replace(/\[MES\]/g, new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase())
                                .replace(/\[AÑO\]/g, new Date().getFullYear().toString())
                                .replace(/\[NOMBRE_CLIENTE\]/g, `${formData.firstName} ${formData.surname}`)
                                .replace(/\[DNI_CLIENTE\]/g, formData.idNumber || '________________')
                                .replace(/\[DOMICILIO_CLIENTE\]/g, formData.address || '__________________________________________')
                                .replace(/\[DURACION_MESES\]/g, contractDuration.toString())
                                .replace(/\[DURACION_DIAS\]/g, (contractDuration * 30).toString())
                            }
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-black text-slate-900 text-center uppercase mb-6 underline decoration-emerald-500 decoration-2 underline-offset-4">CONTRATO PRESTACIÓN DE SERVICIOS MÉDICOS ONLINE</h3>

                            <p className="mb-4">
                                En <strong>ALMERÍA</strong>, a <strong>{new Date().getDate()}</strong> de <strong>{new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase()}</strong> de 202{new Date().getFullYear().toString().slice(-1)}.
                            </p>

                            <div className="space-y-4 mb-6">
                                <p>
                                    <strong>De una parte:</strong> Víctor Bravo Matilla, con número de Colegiado 04-0405305,
                                    persona física, con DNI: 77235910-R y domicilio social en Calle Universidad
                                    de Texas Nº17 Piso 2, Puerta 5 con CP 04005.
                                </p>
                                <p>
                                    <strong>Y de otra:</strong> <strong>{formData.firstName} {formData.surname}</strong> con DNI <strong>{formData.idNumber || '________________'}</strong> y domicilio
                                    en <strong>{formData.address || '__________________________________________'}</strong> (en adelante “el cliente”).
                                </p>
                            </div>

                            <p className="font-bold mb-4">INTERVIENEN</p>
                            <p className="mb-4">
                                Ambas partes, en su propio nombre y derecho, aseguran tener
                                y se reconocen mutuamente plena capacidad legal para contratar y obligarse, en
                                especial para este acto y de común acuerdo,
                            </p>

                            <h4 className="font-bold text-slate-900 mb-3">MANIFIESTAN</h4>

                            <div className="space-y-4 mb-6">
                                <p>
                                    <strong>I.</strong> Que, Víctor Bravo Matilla, presta un servicio denominado
                                    <strong> “ACADEMIA DIABETES ONLINE”</strong> por el cual ofrece los
                                    siguientes servicios:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Servicio Online de Endocrinología, Nutrición y Entrenamiento de {contractDuration * 30} días de duración.</li>
                                    <li>Acceso a App privada (HARBIZ) durante la duración deservicio.</li>
                                    <li>Soporte de Lunes a Sábado en horario de 12:00-13:00 y de 18:00-19:00 por chat privado de Telegram.</li>
                                    <li>Acceso a rutina de entrenamiento, nutrición y clases online con control semanal de resultados.</li>
                                </ul>

                                <p>
                                    <strong>II.</strong> Que quedan expresamente excluidos de dicho programa los
                                    siguiente servicios: Soporte fuera de plazo, acceso a HARBIZ tras finalizar el periodo o soporte por medios no acordados.
                                </p>

                                <p>
                                    <strong>III.</strong> Que dicho servicio tiene un coste según lo acordado en la entrevista inicial para la duración de <strong>{contractDuration} meses</strong>.
                                </p>

                                <p>
                                    <strong>IV.</strong> Que el cliente manifiesta que conoce y acepta los servicios incluidos
                                    y excluidos, los acepta en todas sus condiciones, estando interesado en la realización del mismo.
                                </p>

                                <p>
                                    <strong>V.</strong> Que las partes firman el presente contrato, comprometiéndose a su estricto cumplimiento sujeto a los siguientes:
                                </p>
                            </div>

                            <h4 className="font-bold text-slate-900 text-center mb-4">TÉRMINOS Y CONDICIONES</h4>

                            <div className="space-y-4">
                                <p><strong>PRIMERA - Del objeto del contrato.</strong> Víctor Bravo Matilla, tiene como objeto principal la impartición de servicios de endocrinología online dirigidos a todos los aspectos referentes a la mejora de la salud y pérdida de peso, entre otras funciones adicionales y relacionadas con la diabetes, la obesidad y el sobrepeso. El presente contrato tiene como objeto la prestación de servicios de endocrinología a distancia, en la forma de programa de entrenamiento y nutrición, con contenido, duración y condiciones establecidas en la llamada de acceso previa al programa ya sea con Víctor Bravo Matilla o con cualquiera de sus asistentes.</p>

                                <p><strong>SEGUNDA - Del registro de alumnos.</strong> Al registrarse el cliente en el registro de Víctor Bravo Matilla, en el servicio que este ofrece por el presente instrumento legal, el cliente estará automáticamente adhiriéndose y aceptando someterse integralmente a las disposiciones y condiciones del presente contrato.</p>

                                <p><strong>TERCERA - De la duración y vigencia del contrato.</strong> Asimismo, el presente contrato tendrá vigencia mientras dure el servicio en cuestión hasta la efectiva finalización del mismo o hasta el desistimiento de alguna de las partes con las pertinentes consecuencias que ello conlleva. La duración del programa (y consecuente duración del contrato), queda indicada en todos sus términos en la llamada de acceso previa al programa, donde se establece la fecha de iniciación del mismo, por lo que, las partes se obligan a cumplir con dicha duración y todas sus condiciones.</p>

                                <p><strong>CUARTA - Del coste.</strong> La retribución pactada de los servicios, y como ya se ha indicado en el expositivo III del presente, asciende a lo acordado en la llamada efectuada (IVA incluido) en un pago único o en los plazos pactados. Toda la información pertinente del servicio objeto del presente contrato se da por explicada en la llamada efectuada y en el contenido de este contrato, como primera entrevista entre ambas partes, habiendo entendido el cliente todos sus extremos.</p>

                                <p><strong>QUINTA - De las obligaciones del alumno.</strong> El alumno se compromete a seguir los modelos de conducta establecidos y vigentes en el presente contrato y siguiendo los principios de la buena fe, se compromete a: Cumplir con los programas de entrenamiento y nutrición asignados; Realizar los controles de progreso en los tiempos y modo indicados en la llamada inicial; Respetar las vías de soporte y uso del programa indicadas en la llamada inicial; Completar el programa en el tiempo y forma establecidas en la llamada inicial.</p>

                                <p><strong>SEXTA - Supuestos de exención de responsabilidad por Víctor Bravo Matilla.</strong> Víctor Bravo Matilla no se responsabiliza por los posibles problemas causados por un mal uso del programa por parte del cliente, por problemas eventuales provenientes de la interrupción de los servicios del proveedor de acceso del alumno, ni por la interrupción de los servicios en el caso de falta de energía eléctrica para el sistema de su proveedor de acceso, fallos en el sistema de transmisión o de navegación en el acceso a internet, incompatibilidad de los sistemas de los usuarios con los del proveedor de acceso o cualquier acción de terceros que impidan la prestación del servicio resultante de caso fortuito, imprevisibles o de fuerza mayor.</p>

                                <p><strong>SÉPTIMA - De los derechos de propiedad intelectual.</strong> Todos los derechos de propiedad intelectual o industrial sobre el servicio prestado, así como su documentación preparatoria, actualizaciones, documentación técnica, manuales de uso, son titularidad de Víctor Bravo Matilla, y ello para cualquier idioma y/o lenguaje. Víctor Bravo Matilla se encuentra protegido por la legislación española en materia de Propiedad Intelectual e Industrial (Real Decreto Legislativo 1/1996, de 12 de abril, por el que se aprueba el texto refundido de la Ley de Propiedad Intelectual, regularizando, aclarando y armonizando las disposiciones legales vigentes sobre la materia) y por los demás tratados internacionales reguladores de estas materias. Por lo que, las partes acuerdan y en especial el alumno se compromete a proteger los derechos de propiedad industrial de Víctor Bravo Matilla y a no difundir, replicar, reproducir ni copiar en ninguna de las formas el contenido del material, instrucciones, técnicas, documentación o material de cualquier índole otorgado por Víctor Bravo Matilla., bajo el apercibimiento de la responsabilidad civil y penal en la que incurriría.</p>

                                <p><strong>OCTAVA - Responsabilidad del cliente.</strong> El cliente se compromete a hacer un uso responsable de todo el material o indicaciones prestadas por la parte contratada, asegurando hacer un uso del servicio individualizado. Ello conlleva que el cliente se compromete a que el contenido o acceso al programa no lo va a compartir, ni transferir ni revender a varios usuarios ni a difundir en ningún momento ni por ninguna vía el material contenido en el programa y proporcionado por Víctor Bravo Matilla.</p>

                                <p><strong>NOVENA - Política de reembolso.</strong> Este servicio cuenta con una estricta política de no reembolso tras el periodo estipulado por ley. Al aceptar el contrato el cliente acepta que no existe ninguna posibilidad de reembolso por causas como desistimiento, abandono del programa por razones propias o cualquier causa ajena a Víctor Bravo Matilla. Asimismo, el cliente también se verá obligado a abonar la totalidad del importe del programa si él mismo decide abandonar el programa antes de los 90 días y no finalizar el programa en cuestión, tanto si hubiera decidido abonar el programa con un pago como a plazos. Se acuerda por las partes que el hecho de elegir abonar el programa en diferentes plazos, y antes del devengo de alguno de ellos el cliente decidiera abandonar o desistir del programa quedará igualmente obligado a abonar la totalidad del mismo.</p>

                                <p><strong>DÉCIMA - Del pago a plazos.</strong> En el caso de acordar abonar el importe del programa establecido en diversos plazos, el cliente se compromete a pagar puntualmente los plazos establecidos que se devenguen en cada momento fruto de la presente relación contractual, considerándose un incumplimiento contractual el retraso de cualquiera de ellos.</p>

                                <p><strong>DÉCIMA PRIMERA - Del éxito del servicio.</strong> Víctor Bravo Matilla no se responsabiliza del éxito del programa, pues la responsabilidad del éxito dentro del programa es cometido en todos los aspectos del cliente, de su compromiso, dedicación y trabajo. Víctor Bravo Matilla ofrece los servicios indicados a lo largo de este contrato y asistencia para ayudar al usuario en el proceso, pero el éxito final es responsabilidad única del cliente, a excepción de que exista incumplimiento por parte de Víctor Bravo Matilla o colaboradores, que incumban con los servicios acordados. En caso de que el cliente haya completado y demostrado con pruebas fotográficas y videográficas el 100% de las acciones necesarias para tener éxito en el programa and no haya alcanzado el objetivo acordado en la entrevista de acceso (ver apartado) se ampliará el servicio sin coste adicional por su parte hasta que se alcance el objetivo acordado.</p>

                                <p><strong>DÉCIMA SEGUNDA - De la grabación de la llamada telefónica.</strong> Se informa por parte de Víctor Bravo Matilla o de cualquiera de sus asistentes al cliente que la entrevista de acceso previa que se realizará o se ha realizado vía telefónica o videollamada, quedará grabada, por lo que, con la firma del presente contrato, el cliente muestra su total conformidad con dicha grabación, renunciando a la interposición de cualquier acción contra la misma.</p>

                                <p><strong>DÉCIMA TERCERA - De la confidencialidad.</strong> Las partes acuerdan tratar confidencialmente todos aquellos datos, documentación y demás información que haya sido suministrada durante la vigencia del presente contrato. Ambas partes se comprometen a no divulgar esta información a ninguna persona ni entidad, exceptuando sus propios empleados, a condición de que mantengan también la confidencialidad y solo en la medida que sea necesaria para la correcta ejecución del presente contrato. El alumno se comprometerá a no compartir con terceros todos los datos e informaciones facilitados por Víctor Bravo Matilla y que sean concernientes a la prestación del servicio aquí regulado. En particular, será considerado como Información Confidencial todo el know how o saber hacer resultante de la ejecución de los servicios contratados (los Servicios), debiendo el adjudicatario mantener dicha información en reserva y secreto y no revelarla de ninguna forma, en todo o en parte, a ninguna persona física o jurídica que no sea parte del contrato.</p>

                                <p><strong>DÉCIMA CUARTA - De la autorización para compartir datos del cliente.</strong> Víctor Bravo Matilla puede hacer uso de los mensajes, fotos y testimonios del alumno en relación con el servicio, con fines divulgativos y con objeto de ayudar a otras personas con la pérdida de peso y el control de la diabetes, siempre respetando la privacidad del cliente, solamente si el alumno otorga su consentimiento explícito para su utilización. Los acuerdos de confidencialidad establecidos en la presente cláusula tendrán validez permanente y seguirán en vigor tras la extinción o finalización de la relación contractual objeto del presente. Dicha cláusula de confidencialidad no será aplicable en los únicos supuestos siguientes: Cualquier información que el cliente considere no revelable no se publicará; Cualquier información o conocimiento revelado legítimamente por terceros; Cuando la divulgación sea requerida por la autoridad judicial, por ley o por alguna normativa.</p>

                                <p><strong>DECIMOQUINTA - De la parte que otorga los servicios.</strong> El cliente se compromete a aceptar que el servicio por el cual está interesado y es objeto de este contrato pueda ser ofrecido por cualquiera de los profesionales o personas que forman o trabajan para Víctor Bravo Matilla.</p>

                                <p><strong>DECIMOSEXTA - De la protección de datos.</strong> En virtud de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales, Víctor Bravo Matilla informa de que los datos personales del cliente quedarán registrados en el fichero de Víctor Bravo Matilla (persona responsable del fichero), con la finalidad de llevar el pertinente Registro de Datos de sus clientes. Con la firma de este contrato, el cliente da su consentimiento explícito a que el responsable del tratamiento pueda tratar sus datos personales. Por otro lado, conforme los Art.12 a 15 LOPD, el cliente puede ejercer los derechos de acceso, cancelación, rectificación u oposición previstos en la ley, mediante el envío de un correo personal dirigido a Víctor Bravo Matilla.</p>

                                <p><strong>DECIMOSEPTIMA - Del incumplimiento.</strong> Las partes acuerdan que el incumplimiento de cualquiera de las cláusulas del presente contrato tanto por parte de Víctor Bravo Matilla como del cliente conllevará la resolución del contrato y consecuentemente la relación contractual entre las mismas, pudiendo la parte que hubiera cumplido las suyas solicitar una indemnización de daños y perjuicios en virtud del artículo 1124 del Código Civil. En especial, será motivo de resolución del presente contrato el impago de cualquiera de los pagos fijados por el curso, tanto si se hubiera elegido abonar la totalidad del curso en un pago como si se hubiera elegido abonar el curso en diferentes plazos, facultando a Víctor Bravo Matilla finalizar e interrumpir con la prestación de los servicios. Por lo que, en el caso especial de abonar el servicio en diferentes plazos, el incumplimiento de uno de ellos ya es motivo suficiente para que Víctor Bravo Matilla resuelva el presente contrato y restrinja el servicio al cliente con la consecuente finalización de la prestación de los servicios. Asimismo, también será motivo especial de incumplimiento y consecuente resolución del contrato que el cliente ceda a terceros su usuario y/o contraseña.</p>

                                <p><strong>DECIMOCTAVA - Del compromiso de las partes.</strong> Las partes aceptan el presente contrato y sus efectos jurídicos y se comprometen a su cumplimiento de buena fe. Y en prueba de conformidad con todo lo pactado y manifestado en el presente contrato, lo firman las partes, extendiéndolo por duplicado ejemplar y a un solo efecto en ALMERÍA y a fecha de hoy.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100 italic text-xs text-slate-500">
                    Documento generado electrónicamente para <strong>{formData.firstName} {formData.surname}</strong> el {new Date().toLocaleDateString()}.
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                    <h4 className="text-blue-900 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Protección de Datos de Salud (RGPD)
                    </h4>
                    <p className="text-[11px] text-blue-800 leading-normal text-justify mb-3">
                        Para poder ofrecerte un servicio personalizado, necesitamos tratar tus datos de categoría especial (glucosa, peso, medicación, etc.). Estos datos serán visibles exclusivamente para tu Coach y el equipo médico de la Academia, y no serán compartidos con terceros sin tu permiso expreso.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-5 h-5 text-blue-600 rounded mt-0.5"
                            checked={formData.healthConsent}
                            onChange={(e) => updateField('healthConsent', e.target.checked)}
                        />
                        <span className="text-xs font-bold text-blue-900">Consiento expresamente el tratamiento de mis datos de salud para la ejecución del programa. *</span>
                    </label>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                    <input
                        type="checkbox"
                        className="w-5 h-5 text-emerald-600 rounded"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span className="text-sm text-slate-700">He leído y acepto los términos del contrato de colaboración.</span>
                </label>

                {accepted && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <PenTool className="w-4 h-4" />
                                Firma Digital aquí
                            </label>
                            <button
                                onClick={clearSignature}
                                className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-all"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Borrar firma
                            </button>
                        </div>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none h-[200px]">
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseUp={stopDrawing}
                                onMouseOut={stopDrawing}
                                onMouseMove={draw}
                                onTouchStart={startDrawing}
                                onTouchEnd={stopDrawing}
                                onTouchMove={draw}
                                className="w-full h-full block cursor-crosshair"
                            />
                        </div>
                        {!hasSignature ? (
                            <p className="text-[10px] text-slate-400 text-center">Usa el dedo o el ratón para firmar dentro del recuadro</p>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 py-2 rounded-lg border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" />
                                Firma capturada con éxito
                            </div>
                        )}
                    </div>
                )}

                {!accepted && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <p className="text-amber-700 text-xs italic">Debes marcar la casilla de aceptación para poder firmar el contrato.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
