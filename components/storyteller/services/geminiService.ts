import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { SuccessCase, AIOutput } from "../types";

// Get key from env and clean it
const rawKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const BACKUP_KEY = 'AIzaSyBPaCNmGWFWMfGsraEE2Pn8VzP6dU4R1eA';

const cleanKey = (key: string) => key.trim().replace(/^["']|["']$/g, '');

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
    const activeKey = cleanKey(rawKey || BACKUP_KEY);
    if (!activeKey) throw new Error("API Key no configurada.");
    if (!genAI) genAI = new GoogleGenerativeAI(activeKey);
    return genAI;
}

const SYSTEM_INSTRUCTION = `ROL: Estratega de Marca y Storyteller experto en Transformación de Salud.
MISIÓN: Tu tarea es analizar los activos (imágenes de laboratorios, progreso físico, capturas de pantalla) y el contexto de un paciente de diabetes para crear una 'Biblia de Caso de Éxito' de alto impacto.
La narrativa debe ser visceral, empática y demostrar con autoridad científica y humana el cambio del paciente.

REQUISITOS DE SALIDA (Genera exclusivamente un JSON válido):
1. extractedMetrics: Extrae valores específicos de Glucosa, HbA1c, Peso y otros si están presentes en las imágenes.
2. journeyNarrative:
   - pain: El estado inicial de sufrimiento, miedo o limitación del paciente.
   - turningPoint: El momento en que el método de Padron Trainer empezó a dar resultados.
   - victory: El estado actual de paz, libertad y salud.
3. generalCopy: Un texto estilo Instagram (caption), directo, formativo y emocional. Use saltos de línea y emojis discretamente.
4. slides: Estructura para un carrusel de 5 a 7 diapositivas.
   - id: número de slide.
   - title: Título gancho.
   - copy: Texto principal para la slide.
   - visualHook: Qué imagen o elemento visual debe aparecer específicamente.
   - designInstructions: Instrucciones para el editor sobre el tono visual o énfasis.
5. emotionalTriggers: Lista de 3-5 ganchos psicológicos que este caso activa.`;

const RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        extractedMetrics: {
            type: SchemaType.OBJECT,
            properties: {
                glucose: { type: SchemaType.STRING },
                hba1c: { type: SchemaType.STRING },
                weight: { type: SchemaType.STRING },
                other: { type: SchemaType.STRING },
            },
        },
        emotionalTriggers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        journeyNarrative: {
            type: SchemaType.OBJECT,
            properties: {
                pain: { type: SchemaType.STRING },
                turningPoint: { type: SchemaType.STRING },
                victory: { type: SchemaType.STRING },
            },
            required: ["pain", "turningPoint", "victory"],
        },
        generalCopy: { type: SchemaType.STRING },
        slides: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.NUMBER },
                    title: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    visualHook: { type: SchemaType.STRING },
                    copy: { type: SchemaType.STRING },
                    designInstructions: { type: SchemaType.STRING },
                },
                required: ["id", "title", "copy", "visualHook", "designInstructions"],
            },
        },
    },
    required: ["journeyNarrative", "generalCopy", "slides", "emotionalTriggers"],
};

async function runAnalysis(modelName: string, imageParts: any[], textContext: string): Promise<AIOutput> {
    const api = getGenAI();

    const model = api.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION
    });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [...imageParts, { text: textContext }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA as any,
        },
    });

    const response = await result.response;
    const responseText = response.text();
    if (!responseText) throw new Error("Respuesta vacía");
    return JSON.parse(responseText.trim());
}

export async function analyzeCase(successCase: SuccessCase): Promise<AIOutput> {
    const imageParts = successCase.assets.map((asset) => {
        const parts = asset.url.split(",");
        const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
        const base64Data = parts[1] || "";
        return { inlineData: { mimeType, data: base64Data } };
    });

    const textContext = `
    DUEÑO DEL CASO: ${successCase.patientName}
    ESTADO EMOCIONAL INICIAL: ${successCase.initialFear}
    LOGRO VITAL: ${successCase.lifeAchievement}
    
    Analiza las imágenes adjuntas y genera la Biblia Narrativa en formato JSON.
  `;

    // Modelos de Gemini disponibles (orden de preferencia)
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp"
    ];

    let lastError: any = null;

    for (const modelName of models) {
        try {
            console.log(`🤖 Iniciando análisis con ${modelName}...`);
            return await runAnalysis(modelName, imageParts, textContext);
        } catch (e: any) {
            console.warn(`⚠️ Error con ${modelName}:`, e.message);
            lastError = e;
        }
    }

    throw new Error(`Fallo total de IA tras varios intentos. Último error: ${lastError?.message}`);
}

