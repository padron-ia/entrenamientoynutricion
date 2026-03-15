import fs from 'fs';
import path from 'path';
import { supabase } from './config.js';

const args = process.argv.slice(2);
const includeNoVideo = args.includes('--include-no-video');
const csvArg = args.find(arg => !arg.startsWith('--'));
const CSV_PATH = csvArg || 'C:/Users/jmart/Documents/.csv';
const BATCH_SIZE = 200;

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsv(csv) {
  const rows = [];
  let curRow = [];
  let curCell = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        curCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      curRow.push(curCell.trim());
      curCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      curRow.push(curCell.trim());
      if (curRow.some(c => c !== '')) rows.push(curRow);
      curRow = [];
      curCell = '';
      if (char === '\r' && nextChar === '\n') i++;
    } else {
      curCell += char;
    }
  }

  if (curCell.length > 0 || curRow.length > 0) {
    curRow.push(curCell.trim());
    if (curRow.some(c => c !== '')) rows.push(curRow);
  }

  return rows;
}

function detectMediaType(url) {
  const lower = (url || '').toLowerCase();
  if (!lower) return 'none';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  if (lower.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/)) return 'image';
  return 'youtube';
}

function splitExerciseAndMuscles(rawName) {
  const value = (rawName || '').trim();
  if (!value) return { name: '', muscleMain: 'Varios', muscleSecondary: [] };

  const separator = ' - ';
  const idx = value.indexOf(separator);
  if (idx === -1) {
    return { name: value, muscleMain: 'Varios', muscleSecondary: [] };
  }

  const name = value.slice(0, idx).trim();
  const musclesRaw = value.slice(idx + separator.length).trim();
  const muscles = musclesRaw
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);

  return {
    name: name || value,
    muscleMain: muscles[0] || 'Varios',
    muscleSecondary: muscles.slice(1),
  };
}

async function run() {
  const resolvedCsvPath = path.resolve(CSV_PATH);
  if (!fs.existsSync(resolvedCsvPath)) {
    throw new Error(`No se encontro el CSV en ${resolvedCsvPath}`);
  }

  console.log(`Leyendo CSV: ${resolvedCsvPath}`);
  const csvContent = fs.readFileSync(resolvedCsvPath, 'utf8');
  const rows = parseCsv(csvContent);

  if (rows.length === 0) {
    throw new Error('El CSV esta vacio');
  }

  const headerRowIndex = rows.findIndex((row) => {
    const normalized = row.map(cell => normalizeText(cell));
    return normalized.includes('nombre del ejercicio') && normalized.includes('video por defecto');
  });

  if (headerRowIndex === -1) {
    throw new Error('No se encontro la cabecera con Nombre del ejercicio / Video por defecto');
  }

  const headers = rows[headerRowIndex].map(cell => normalizeText(cell));
  const nameIndex = headers.findIndex(h => h === 'nombre del ejercicio');
  const defaultVideoIndex = headers.findIndex(h => h === 'video por defecto');
  const coachVideoIndex = headers.findIndex(h => h === 'video del preparador');

  if (nameIndex === -1 || defaultVideoIndex === -1) {
    throw new Error('No se pudieron mapear columnas obligatorias');
  }

  const { data: existingData, error: existingError } = await supabase
    .from('training_exercises')
    .select('name');

  if (existingError) throw existingError;

  const existingNames = new Set((existingData || []).map((r) => normalizeText(r.name)));

  const candidates = [];
  let skippedNoName = 0;
  let skippedNoVideo = 0;
  let skippedDuplicates = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const rawName = (row[nameIndex] || '').trim();
    const defaultVideo = (row[defaultVideoIndex] || '').trim();
    const coachVideo = coachVideoIndex >= 0 ? (row[coachVideoIndex] || '').trim() : '';
    const selectedVideo = defaultVideo || coachVideo;

    if (!rawName) {
      skippedNoName++;
      continue;
    }
    if (!selectedVideo && !includeNoVideo) {
      skippedNoVideo++;
      continue;
    }

    const { name, muscleMain, muscleSecondary } = splitExerciseAndMuscles(rawName);
    const key = normalizeText(name);
    if (!key) {
      skippedNoName++;
      continue;
    }
    if (existingNames.has(key)) {
      skippedDuplicates++;
      continue;
    }

    existingNames.add(key);
    candidates.push({
      name,
      media_type: selectedVideo ? detectMediaType(selectedVideo) : 'none',
      media_url: selectedVideo || null,
      muscle_main: muscleMain,
      muscle_secondary: muscleSecondary,
      equipment: ['Gimnasio'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`Total candidatos a insertar: ${candidates.length}`);
  console.log(`Saltados sin nombre: ${skippedNoName}`);
  console.log(`Saltados sin video: ${skippedNoVideo}`);
  console.log(`Modo incluir sin video: ${includeNoVideo ? 'si' : 'no'}`);
  console.log(`Saltados duplicados: ${skippedDuplicates}`);

  let inserted = 0;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('training_exercises').insert(batch);
    if (error) throw error;
    inserted += batch.length;
    console.log(`Insertados ${inserted}/${candidates.length}`);
  }

  const { count } = await supabase
    .from('training_exercises')
    .select('*', { count: 'exact', head: true });

  console.log('Importacion completada');
  console.log(`Nuevos ejercicios insertados: ${inserted}`);
  console.log(`Total ejercicios en biblioteca: ${count ?? 'desconocido'}`);
}

run().catch((error) => {
  console.error('Error en importacion:', error.message || error);
  process.exit(1);
});
