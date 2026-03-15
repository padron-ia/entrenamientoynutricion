import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Client, NutritionPlan, NutritionRecipe, MealSlot, RecipeCategory, IngredientSection } from '../../types';
import jsPDF from 'jspdf';

interface NutritionPdfGeneratorProps {
    client: Client;
    plan: NutritionPlan;
    recipes: NutritionRecipe[];
    planId: string;
    plannerGrid?: Record<string, string | null>;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MEALS_LABELS: Record<MealSlot, string> = {
    breakfast: 'Desayuno',
    lunch: 'Comida',
    dinner: 'Cena',
    snack: 'Snack'
};
const MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
    breakfast: 'Desayunos',
    lunch: 'Comidas',
    dinner: 'Cenas',
    snack: 'Snacks'
};

function inferSection(name: string): IngredientSection {
    const n = name.toLowerCase();
    if (/salm[oó]n|at[uú]n|merluza|bacalao|gambas?|langostino|calamar|sardina|anchoa|pescado|marisco|trucha|rape|dorada|lubina/.test(n)) return 'Pescadería';
    if (/pollo|pavo|ternera|cerdo|jamón|chorizo|carne|filete|pechuga|lomo|cordero|conejo/.test(n)) return 'Carnicería';
    if (/manzana|pl[aá]tano|naranja|fresa|ar[aá]ndano|uva|kiwi|aguacate|tomate|lechuga|espinaca|cebolla|ajo|zanahoria|pimiento|calabac|br[oó]coli|pepino|champi[ñn]|patata|boniato|perejil|albahaca|r[uú]cula|apio|puerro/.test(n)) return 'Frutería';
    if (/leche|yogur|queso|nata|mantequilla|kefir|mozzarella|parmesano|skyr/.test(n)) return 'Lácteos';
    if (/pan |pan$|tostada|baguette|integral|wrap|pita/.test(n)) return 'Panadería';
    return 'Despensa';
}

export function NutritionPdfGenerator({ client, plan, recipes, planId, plannerGrid: passedPlannerGrid }: NutritionPdfGeneratorProps) {
    const [generating, setGenerating] = useState(false);

    const generatePdf = async () => {
        setGenerating(true);

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
                    return true;
                }
                return false;
            };

            // ====== PAGE 1: Header + Weekly Plan ======
            // Header bar
            doc.setFillColor(22, 163, 74); // green-600
            doc.rect(0, 0, pageW, 35, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Padron Trainer', margin, 15);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Plan Nutricional Personalizado', margin, 23);

            // Client info
            doc.setFontSize(10);
            const clientName = `${client.firstName || ''} ${client.surname || ''}`.trim();
            doc.text(clientName, pageW - margin, 15, { align: 'right' });
            doc.text(plan.name, pageW - margin, 23, { align: 'right' });

            y = 42;

            // Plan info box
            doc.setTextColor(30, 41, 59); // slate-800
            if (plan.target_calories) {
                doc.setFillColor(255, 247, 237); // orange-50
                doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`Objetivo: ${plan.target_calories} kcal/día`, margin + 4, y + 7);
                if (plan.diet_type) {
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Dieta: ${plan.diet_type}`, pageW - margin - 4, y + 7, { align: 'right' });
                }
                y += 14;
            }

            // Description
            if (plan.description) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100, 116, 139);
                const descLines = doc.splitTextToSize(plan.description, contentW);
                doc.text(descLines, margin, y + 4);
                y += descLines.length * 4 + 6;
            }

            // Instructions
            if (plan.instructions) {
                addNewPageIfNeeded(30);
                doc.setFillColor(238, 242, 255); // indigo-50
                doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
                doc.setTextColor(67, 56, 202); // indigo-600
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Instrucciones del Coach', margin + 3, y + 5.5);
                y += 10;

                doc.setTextColor(51, 65, 85);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                const instrLines = doc.splitTextToSize(plan.instructions, contentW - 6);
                const instrHeight = Math.min(instrLines.length * 3.5, 60);
                doc.text(instrLines.slice(0, Math.floor(instrHeight / 3.5)), margin + 3, y + 3);
                y += instrHeight + 6;
            }

            // Weekly Planner Table
            let plannerGrid: Record<string, string | null> | null = passedPlannerGrid || null;
            if (!plannerGrid) {
                try {
                    const saved = localStorage.getItem(`ado_weekly_plan_${planId}`);
                    if (saved) plannerGrid = JSON.parse(saved);
                } catch { }
            }

            if (plannerGrid && Object.keys(plannerGrid).length > 0) {
                addNewPageIfNeeded(70);
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('Planificador Semanal', margin, y + 5);
                y += 10;

                const colW = (contentW - 18) / 7; // 18mm for meal label column
                const rowH = 14;

                // Header row
                doc.setFillColor(241, 245, 249); // slate-100
                doc.rect(margin, y, contentW, 8, 'F');
                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('', margin + 1, y + 5.5);
                DAYS.forEach((day, i) => {
                    doc.text(day, margin + 18 + i * colW + colW / 2, y + 5.5, { align: 'center' });
                });
                y += 8;

                // Meal rows
                MEAL_ORDER.forEach(meal => {
                    doc.setDrawColor(226, 232, 240);
                    doc.line(margin, y, margin + contentW, y);

                    // Meal label
                    doc.setFillColor(248, 250, 252);
                    doc.rect(margin, y, 18, rowH, 'F');
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(100, 116, 139);
                    doc.text(MEALS_LABELS[meal], margin + 1, y + rowH / 2 + 1);

                    // Cells
                    DAYS.forEach((_, dayIdx) => {
                        const key = `${dayIdx}-${meal}`;
                        const recipeId = plannerGrid![key];
                        const recipe = recipeId ? recipes.find(r => r.id === recipeId) : null;
                        const cellX = margin + 18 + dayIdx * colW;

                        doc.setDrawColor(226, 232, 240);
                        doc.rect(cellX, y, colW, rowH);

                        if (recipe) {
                            doc.setFillColor(240, 253, 244); // green-50
                            doc.rect(cellX + 0.3, y + 0.3, colW - 0.6, rowH - 0.6, 'F');
                            doc.setFontSize(5);
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(30, 41, 59);
                            const nameLines = doc.splitTextToSize(recipe.name, colW - 2);
                            doc.text(nameLines.slice(0, 2), cellX + 1, y + 4);
                            if (recipe.calories) {
                                doc.setFontSize(4.5);
                                doc.setTextColor(234, 88, 12);
                                doc.text(`${recipe.calories} kcal`, cellX + 1, y + rowH - 2);
                            }
                        }
                    });

                    y += rowH;
                });

                // Day calorie totals
                doc.setFillColor(254, 252, 232); // yellow-50
                doc.rect(margin + 18, y, contentW - 18, 7, 'F');
                doc.setFontSize(5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(234, 88, 12);
                DAYS.forEach((_, dayIdx) => {
                    const dayCal = MEAL_ORDER.reduce((total, meal) => {
                        const key = `${dayIdx}-${meal}`;
                        const recipeId = plannerGrid![key];
                        const recipe = recipeId ? recipes.find(r => r.id === recipeId) : null;
                        return total + (recipe?.calories || 0);
                    }, 0);
                    if (dayCal > 0) {
                        const cellX = margin + 18 + dayIdx * colW;
                        doc.text(`${dayCal} kcal`, cellX + colW / 2, y + 5, { align: 'center' });
                    }
                });
                y += 12;
            }

            // ====== PAGE 2: Shopping List ======
            if (plannerGrid && Object.keys(plannerGrid).length > 0) {
                doc.addPage();
                y = margin;

                // Header
                doc.setFillColor(22, 163, 74);
                doc.rect(0, 0, pageW, 20, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Lista de la Compra', margin, 14);
                y = 28;

                // Aggregate ingredients
                const selectedIds = new Set(Object.values(plannerGrid).filter(Boolean) as string[]);
                const aggregated = new Map<string, { name: string; quantity: number; unit: string; section: IngredientSection }>();

                recipes.forEach(recipe => {
                    if (!selectedIds.has(recipe.id)) return;
                    const count = Object.values(plannerGrid!).filter(id => id === recipe.id).length;
                    recipe.ingredients.forEach(ing => {
                        const key = `${ing.name.trim().toLowerCase()}-${ing.unit}`;
                        const section = (ing as any).section || inferSection(ing.name);
                        if (aggregated.has(key)) {
                            aggregated.get(key)!.quantity += (ing.quantity || 0) * count;
                        } else {
                            aggregated.set(key, { name: ing.name.trim(), quantity: (ing.quantity || 0) * count, unit: ing.unit || '', section });
                        }
                    });
                });

                // Group by section
                const grouped: Record<string, typeof aggregated extends Map<string, infer V> ? V[] : never> = {};
                aggregated.forEach(item => {
                    if (!grouped[item.section]) grouped[item.section] = [];
                    grouped[item.section].push(item);
                });

                const sectionColors: Record<string, [number, number, number]> = {
                    'Pescadería': [6, 182, 212],
                    'Carnicería': [220, 38, 38],
                    'Frutería': [22, 163, 74],
                    'Lácteos': [59, 130, 246],
                    'Panadería': [234, 88, 12],
                    'Despensa': [217, 119, 6],
                    'Congelados': [99, 102, 241],
                    'Otros': [100, 116, 139]
                };

                const sectionOrder: IngredientSection[] = ['Frutería', 'Carnicería', 'Pescadería', 'Lácteos', 'Panadería', 'Congelados', 'Despensa', 'Otros'];

                // Render in 2 columns
                const colWidth = (contentW - 4) / 2;
                let col = 0;
                let colY = y;
                const startY = y;

                sectionOrder.forEach(section => {
                    const items = grouped[section];
                    if (!items || items.length === 0) return;
                    items.sort((a, b) => a.name.localeCompare(b.name));

                    const sectionHeight = 8 + items.length * 5;
                    if (colY + sectionHeight > pageH - margin) {
                        if (col === 0) {
                            col = 1;
                            colY = startY;
                        } else {
                            doc.addPage();
                            y = margin;
                            colY = margin;
                            col = 0;
                        }
                    }

                    const xOff = margin + col * (colWidth + 4);
                    const color = sectionColors[section] || [100, 116, 139];

                    // Section header
                    doc.setFillColor(color[0], color[1], color[2]);
                    doc.roundedRect(xOff, colY, colWidth, 7, 1, 1, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(section, xOff + 3, colY + 5);
                    colY += 9;

                    // Items
                    doc.setTextColor(51, 65, 85);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    items.forEach(item => {
                        // Checkbox
                        doc.setDrawColor(203, 213, 225);
                        doc.rect(xOff + 2, colY, 3, 3);
                        doc.text(item.name, xOff + 7, colY + 2.5);
                        if (item.quantity > 0) {
                            doc.setTextColor(148, 163, 184);
                            const qtyText = `${Math.round(item.quantity * 10) / 10} ${item.unit}`;
                            doc.text(qtyText, xOff + colWidth - 2, colY + 2.5, { align: 'right' });
                            doc.setTextColor(51, 65, 85);
                        }
                        colY += 5;
                    });
                    colY += 3;
                });
            }

            // ====== PAGE 3+: Recipe Cards ======
            doc.addPage();
            y = margin;

            // Header
            doc.setFillColor(22, 163, 74);
            doc.rect(0, 0, pageW, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Recetario', margin, 14);
            y = 28;

            const categoryOrder: RecipeCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
            const catColors: Record<RecipeCategory, [number, number, number]> = {
                breakfast: [245, 158, 11],
                lunch: [249, 115, 22],
                dinner: [99, 102, 241],
                snack: [16, 185, 129]
            };

            categoryOrder.forEach(category => {
                const catRecipes = recipes.filter(r => r.category === category).sort((a, b) => a.position - b.position);
                if (catRecipes.length === 0) return;

                addNewPageIfNeeded(15);

                // Category Header
                const color = catColors[category];
                doc.setFillColor(color[0], color[1], color[2]);
                doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(CATEGORY_LABELS[category], margin + 4, y + 6.5);
                y += 13;

                catRecipes.forEach(recipe => {
                    // Estimate height needed
                    const ingLines = recipe.ingredients.length;
                    const prepLines = recipe.preparation ? doc.splitTextToSize(recipe.preparation, contentW * 0.55 - 4).length : 0;
                    const estimatedHeight = Math.max(ingLines * 4 + 15, prepLines * 3.5 + 15, 30);

                    addNewPageIfNeeded(estimatedHeight);

                    // Recipe card
                    doc.setDrawColor(226, 232, 240);
                    doc.setFillColor(255, 255, 255);
                    const cardY = y;

                    // Recipe name
                    doc.setTextColor(30, 41, 59);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(recipe.name, margin + 3, y + 5);

                    // Macros on same line
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'normal');
                    let macroX = pageW - margin - 3;
                    const macros: string[] = [];
                    if (recipe.fat) macros.push(`G: ${recipe.fat}g`);
                    if (recipe.carbs) macros.push(`C: ${recipe.carbs}g`);
                    if (recipe.protein) macros.push(`P: ${recipe.protein}g`);
                    if (recipe.calories) macros.push(`${recipe.calories} kcal`);
                    doc.setTextColor(148, 163, 184);
                    doc.text(macros.join('  |  '), macroX, y + 5, { align: 'right' });
                    y += 9;

                    // Divider
                    doc.setDrawColor(241, 245, 249);
                    doc.line(margin + 3, y, margin + contentW - 3, y);
                    y += 3;

                    // Two columns: Ingredients (left 40%) + Preparation (right 60%)
                    const leftW = contentW * 0.38;
                    const rightW = contentW * 0.58;
                    const colStartY = y;

                    // Ingredients
                    if (recipe.ingredients.length > 0) {
                        doc.setTextColor(100, 116, 139);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'bold');
                        doc.text('INGREDIENTES', margin + 3, y + 3);
                        y += 6;

                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(71, 85, 105);
                        doc.setFontSize(6.5);
                        recipe.ingredients.forEach(ing => {
                            const bullet = `• ${ing.name}`;
                            const qty = ing.quantity > 0 ? ` (${ing.quantity} ${ing.unit})` : '';
                            doc.text(bullet + qty, margin + 4, y + 2.5);
                            y += 4;
                        });
                    }

                    const leftEndY = y;

                    // Preparation (right column)
                    let rightY = colStartY;
                    if (recipe.preparation) {
                        doc.setTextColor(100, 116, 139);
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'bold');
                        doc.text('PREPARACIÓN', margin + leftW + 6, rightY + 3);
                        rightY += 6;

                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(71, 85, 105);
                        doc.setFontSize(6.5);
                        const prepLines = doc.splitTextToSize(recipe.preparation, rightW - 8);
                        doc.text(prepLines, margin + leftW + 6, rightY + 2.5);
                        rightY += prepLines.length * 3.2 + 3;
                    }

                    y = Math.max(leftEndY, rightY) + 4;

                    // Card border
                    const cardH = y - cardY;
                    doc.setDrawColor(226, 232, 240);
                    doc.roundedRect(margin, cardY - 2, contentW, cardH + 2, 2, 2, 'S');

                    y += 4;
                });

                y += 4;
            });

            // ====== PAGE: Block Content (for Simple/Block Plans) ======
            const hasBlockContent = plan.intro_content || plan.breakfast_content || plan.lunch_content || plan.dinner_content || plan.snack_content;

            if (hasBlockContent) {
                doc.addPage();
                y = margin;

                // Header
                doc.setFillColor(22, 163, 74);
                doc.rect(0, 0, pageW, 20, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Detalles del Plan', margin, 14);
                y = 30;

                const renderTextBlock = (title: string, content: string | undefined, color: [number, number, number]) => {
                    if (!content) return;

                    addNewPageIfNeeded(20);

                    doc.setFillColor(color[0], color[1], color[2]);
                    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(title, margin + 4, y + 6.5);
                    y += 13;

                    doc.setTextColor(51, 65, 85);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    const lines = doc.splitTextToSize(content, contentW - 8);

                    // Check if we need a new page for long content
                    let startLine = 0;
                    while (startLine < lines.length) {
                        const remainingH = pageH - margin - y;
                        const linesThatFit = Math.floor(remainingH / 5);

                        if (linesThatFit <= 0) {
                            doc.addPage();
                            y = margin + 5;
                            continue;
                        }

                        const batch = lines.slice(startLine, startLine + linesThatFit);
                        doc.text(batch, margin + 4, y);
                        y += batch.length * 5;
                        startLine += linesThatFit;

                        if (startLine < lines.length) {
                            doc.addPage();
                            y = margin + 5;
                        }
                    }
                    y += 10;
                };

                if (plan.intro_content) renderTextBlock('Introducción', plan.intro_content, [22, 163, 74]);
                if (plan.breakfast_content) renderTextBlock('Desayuno', plan.breakfast_content, [245, 158, 11]);
                if (plan.lunch_content) renderTextBlock('Comida', plan.lunch_content, [249, 115, 22]);
                if (plan.dinner_content) renderTextBlock('Cena', plan.dinner_content, [99, 102, 241]);
                if (plan.snack_content) renderTextBlock('Snack', plan.snack_content, [16, 185, 129]);
            }

            // Footer
            addNewPageIfNeeded(15);
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.text(
                `Generado por Padron Trainer • ${new Date().toLocaleDateString('es-ES')}`,
                pageW / 2,
                pageH - 8,
                { align: 'center' }
            );

            // Save
            const fileName = `Plan_Nutricional_${(client.firstName || 'Cliente').replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error al generar el PDF. Inténtalo de nuevo.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <button
            onClick={generatePdf}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-colors font-medium disabled:opacity-50"
        >
            {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{generating ? 'Generando...' : 'Descargar PDF'}</span>
        </button>
    );
}
