import React, { useState, useEffect } from 'react';
import { Copy, Check, CreditCard, Clock, ExternalLink, Plus, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface PaymentLink {
    id: string;
    category: string;
    name: string;
    price: string;
    url: string;
}

export function PaymentLinksLibrary() {
    const [links, setLinks] = useState<PaymentLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Estado para el formulario nuevo
    const [newLink, setNewLink] = useState({
        name: '',
        price: '',
        category: 'General',
        url: ''
    });

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('payment_links')
            .select('*')
            .order('category', { ascending: true });

        if (data) setLinks(data);
        setLoading(false);
    };

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Seguro que quieres borrar este enlace?')) return;
        const { error } = await supabase.from('payment_links').delete().eq('id', id);
        if (!error) fetchLinks();
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('payment_links').insert([newLink]);
        if (!error) {
            setShowModal(false);
            setNewLink({ name: '', price: '', category: 'General', url: '' });
            fetchLinks();
        } else {
            alert('Error al guardar');
        }
    };

    // Agrupar por categoría
    const groupedLinks = links.reduce((acc, link) => {
        if (!acc[link.category]) acc[link.category] = [];
        acc[link.category].push(link);
        return acc;
    }, {} as Record<string, PaymentLink[]>);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="text-blue-600" />
                        Tarifas y Enlaces de Pago
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Catálogo de precios y enlaces directos de Hotmart.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                    <Plus size={20} /> Añadir Enlace
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400">Cargando enlaces...</div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {Object.entries(groupedLinks).map(([category, items]) => (
                        <div key={category} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-800 px-6 py-4 text-white flex justify-between items-center">
                                <h2 className="font-bold text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-white/80" />
                                    {category}
                                </h2>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800 text-lg">{item.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Precio:</span>
                                                <span className="text-xl font-bold text-green-600 bg-green-50 px-2 rounded-md">{item.price}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                title="Probar enlace"
                                            >
                                                <ExternalLink size={20} />
                                            </a>

                                            <button
                                                onClick={() => handleCopy(item.url)}
                                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${copiedUrl === item.url
                                                    ? 'bg-green-600 text-white shadow-green-200'
                                                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                                                    }`}
                                            >
                                                {copiedUrl === item.url ? (
                                                    <><Check size={18} /> ¡Copiado!</>
                                                ) : (
                                                    <><Copy size={18} /> Copiar</>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {Object.keys(groupedLinks).length === 0 && (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                            No hay enlaces guardados. ¡Añade el primero!
                        </div>
                    )}
                </div>
            )}

            {/* MODAL NUEVO ENLACE */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Añadir Nuevo Enlace</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAdd} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                                <input
                                    required autoFocus
                                    className="w-full border rounded-lg p-2 mt-1"
                                    placeholder="Ej. Oferta Flash Black Friday"
                                    value={newLink.name}
                                    onChange={e => setNewLink({ ...newLink, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Precio Texto</label>
                                    <input
                                        required
                                        className="w-full border rounded-lg p-2 mt-1"
                                        placeholder="Ej. 997€"
                                        value={newLink.price}
                                        onChange={e => setNewLink({ ...newLink, price: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                                    <input
                                        required
                                        className="w-full border rounded-lg p-2 mt-1"
                                        placeholder="Ej. Programa 6 Meses"
                                        value={newLink.category}
                                        onChange={e => setNewLink({ ...newLink, category: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">URL Hotmart</label>
                                <input
                                    required type="url"
                                    className="w-full border rounded-lg p-2 mt-1 text-blue-600"
                                    placeholder="https://..."
                                    value={newLink.url}
                                    onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                                />
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2">
                                    <Save size={18} /> Guardar Enlace
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
