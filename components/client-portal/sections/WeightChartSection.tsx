import React, { useState, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Line, ComposedChart
} from 'recharts';
import { TrendingDown, TrendingUp, Target } from 'lucide-react';

interface WeightChartSectionProps {
    weightHistory: Array<{ id: string; date: string; weight: number; source: string }>;
    targetWeight: number;
    startWeight: number;
}

type TimeRange = '1w' | '1m' | '3m' | 'all';

const RANGES: { id: TimeRange; label: string }[] = [
    { id: '1w', label: '1 sem' },
    { id: '1m', label: '1 mes' },
    { id: '3m', label: '3 meses' },
    { id: 'all', label: 'Todo' },
];

function movingAverage(data: { weight: number }[], window: number): (number | null)[] {
    return data.map((_, i) => {
        if (i < window - 1) return null;
        const slice = data.slice(i - window + 1, i + 1);
        return +(slice.reduce((s, d) => s + d.weight, 0) / slice.length).toFixed(1);
    });
}

function linearRegression(data: { weight: number }[]): { slope: number; intercept: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0]?.weight || 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i].weight;
        sumXY += i * data[i].weight;
        sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

export function WeightChartSection({ weightHistory, targetWeight, startWeight }: WeightChartSectionProps) {
    const [range, setRange] = useState<TimeRange>('all');
    const hasData = weightHistory.length > 0;

    const filteredData = useMemo(() => {
        const sorted = [...weightHistory].reverse(); // chronological
        if (range === 'all') return sorted;

        const now = new Date();
        let cutoff = new Date();
        if (range === '1w') cutoff.setDate(now.getDate() - 7);
        if (range === '1m') cutoff.setMonth(now.getMonth() - 1);
        if (range === '3m') cutoff.setMonth(now.getMonth() - 3);

        return sorted.filter(w => new Date(w.date) >= cutoff);
    }, [weightHistory, range]);

    const chartData = useMemo(() => {
        const ma = movingAverage(filteredData, Math.min(5, Math.ceil(filteredData.length / 3)));
        return filteredData.map((w, i) => ({
            date: new Date(w.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            fullDate: w.date,
            weight: w.weight,
            trend: ma[i],
        }));
    }, [filteredData]);

    // Prediction
    const prediction = useMemo(() => {
        if (filteredData.length < 3 || !targetWeight || targetWeight === startWeight) return null;
        const { slope } = linearRegression(filteredData);
        if (Math.abs(slope) < 0.001) return null; // no significant trend

        const currentWeight = filteredData[filteredData.length - 1].weight;
        const diff = targetWeight - currentWeight;

        // Is the trend going the right direction?
        const goingRight = (diff < 0 && slope < 0) || (diff > 0 && slope > 0);
        if (!goingRight) return null;

        const daysToGoal = Math.abs(diff / slope);
        const weeksToGoal = Math.round(daysToGoal / 7);

        if (weeksToGoal <= 0 || weeksToGoal > 104) return null;
        return weeksToGoal;
    }, [filteredData, targetWeight, startWeight]);

    // Weight change stats
    const totalChange = filteredData.length >= 2
        ? +(filteredData[filteredData.length - 1].weight - filteredData[0].weight).toFixed(1)
        : 0;

    if (!hasData) return null;

    return (
        <div className="glass rounded-3xl p-6 md:p-8 shadow-card">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-sea-900">Evolucion en el Tiempo</h3>
                    <div className="flex items-center gap-3 mt-1">
                        {totalChange !== 0 && (
                            <span className={`flex items-center gap-1 text-sm font-bold ${
                                totalChange < 0 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                                {totalChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                {totalChange > 0 ? '+' : ''}{totalChange} kg
                            </span>
                        )}
                        {prediction && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-lg">
                                <Target className="w-3 h-3" />
                                Meta en ~{prediction} sem
                            </span>
                        )}
                    </div>
                </div>

                {/* Range selector */}
                <div className="flex gap-1 bg-sea-50 p-1 rounded-xl">
                    {RANGES.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setRange(r.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                range === r.id
                                    ? 'bg-white text-sea-700 shadow-sm'
                                    : 'text-sea-400 hover:text-sea-600'
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(210, 45%, 40%)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(210, 45%, 40%)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(210, 20%, 94%)" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(210, 28%, 70%)', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            domain={['dataMin - 1', 'dataMax + 1']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(210, 28%, 70%)', fontSize: 12 }}
                        />
                        {targetWeight && targetWeight !== startWeight && (
                            <ReferenceLine
                                y={targetWeight}
                                stroke="hsl(175, 55%, 45%)"
                                strokeDasharray="8 4"
                                strokeWidth={2}
                                label={{
                                    value: `Meta: ${targetWeight} kg`,
                                    position: 'right',
                                    fill: 'hsl(175, 55%, 45%)',
                                    fontSize: 11,
                                    fontWeight: 600
                                }}
                            />
                        )}
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(210, 65%, 11%)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: 'hsl(210, 28%, 70%)', marginBottom: '4px' }}
                            cursor={{ stroke: 'hsl(210, 45%, 40%)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="weight"
                            stroke="hsl(210, 45%, 40%)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorWeight)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', stroke: 'hsl(210, 45%, 40%)' }}
                            name="Peso"
                        />
                        {/* Trend line (moving average) */}
                        <Line
                            type="monotone"
                            dataKey="trend"
                            stroke="hsl(175, 55%, 45%)"
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            dot={false}
                            connectNulls
                            name="Tendencia"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-sea-500">
                <span className="flex items-center gap-1.5">
                    <span className="w-5 h-0.5 bg-sea-500 rounded-full" />
                    Peso
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-5 h-0.5 border-t-2 border-dashed border-teal-500" />
                    Tendencia
                </span>
                {targetWeight && targetWeight !== startWeight && (
                    <span className="flex items-center gap-1.5">
                        <span className="w-5 h-0.5 border-t-2 border-dashed border-accent-500" />
                        Meta
                    </span>
                )}
            </div>
        </div>
    );
}
