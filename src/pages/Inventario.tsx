import React, { useState, useEffect } from 'react';
import { Producto, CategoriaProducto } from '../models';
import { ColaInventario } from '../lib/dataStructures/colaInventario';

interface InventarioProps {
    colaFisica: ColaInventario;
}

export default function Inventario({ colaFisica }: InventarioProps) {
    const [stockRenderizado, setStockRenderizado] = useState<Producto[]>([]);

    // Estados del formulario extendido
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState<CategoriaProducto>('electronica');
    const [precio, setPrecio] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [stockMinimo, setStockMinimo] = useState('5');

    const [cantidadDespacho, setCantidadDespacho] = useState('1');

    useEffect(() => {
        actualizarPantalla();
    }, []);

    const actualizarPantalla = () => {
        setStockRenderizado(colaFisica.mapearStockActual());
    };

    // Cálculo de valor financiero del depósito
    const calcularCapitalTotal = () => {
        return stockRenderizado.reduce((total, prod) => total + prod.getPrecio(), 0);
    };

    const handleIngresarLote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !precio || !cantidad || !stockMinimo) return;

        const numPrecio = parseFloat(precio);
        const numCantidad = parseInt(cantidad, 10);
        const numMinimo = parseInt(stockMinimo, 10);

        try {
            const nuevoProducto = new Producto(nombre, categoria, numPrecio, numCantidad, numMinimo);
            colaFisica.ingresarLote(nuevoProducto, numCantidad);

            setNombre('');
            setPrecio('');
            setCantidad('');
            actualizarPantalla();

        } catch (error: any) {
            alert(`Error al registrar entrada: ${error.message}`);
        }
    };

    const handleDespachar = () => {
        const numDespacho = parseInt(cantidadDespacho, 10);
        if (isNaN(numDespacho) || numDespacho <= 0) return;

        const extraidos = colaFisica.despacharPedido(numDespacho);

        if (extraidos.length === 0) {
            alert("⚠️ Error: No hay mercadería suficiente para este despacho.");
            return;
        }

        actualizarPantalla();
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 bg-gray-50 rounded-xl shadow-sm">

            {/* --- DASHBOARD FINANCIERO Y DE STOCK --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Cajas Físicas en Bodega</p>
                    <p className="text-3xl font-black text-gray-800 mt-1">{stockRenderizado.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Capital Inmovilizado (Gs.)</p>
                    <p className="text-3xl font-black text-green-600 mt-1">
                        {calcularCapitalTotal().toLocaleString('es-PY')}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Lógica Operativa</p>
                    <p className="text-lg font-bold text-blue-600 mt-2 flex items-center gap-2">
                        ⏱️ FIFO - Tiempo O(1)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* --- RECEPCIÓN DE MERCADERÍA --- */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="border-b pb-3 mb-5">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            📦 Entrada de Stock
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Registre el ingreso físico de mercadería al final de la cola.</p>
                    </div>

                    <form onSubmit={handleIngresarLote} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Comercial del Producto</label>
                            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full border-2 border-gray-200 focus:border-green-500 rounded-md p-2.5 outline-none transition" placeholder="Ej: PlayStation 5" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
                                <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaProducto)} className="w-full border-2 border-gray-200 rounded-md p-2.5 bg-white">
                                    <option value="electronica">Electrónica</option>
                                    <option value="hogar">Hogar / Electro</option>
                                    <option value="alimentos">Alimentos</option>
                                    <option value="ropa">Ropa / Moda</option>
                                    <option value="otros">Otros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Costo / Precio (Gs.)</label>
                                <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} required className="w-full border-2 border-gray-200 rounded-md p-2.5 font-mono" placeholder="0" min="0" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border border-gray-100">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Cajas Recibidas</label>
                                <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} required className="w-full border-2 border-gray-200 rounded-md p-2.5 text-lg font-black text-center" min="1" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-orange-600 mb-1">Alerta Stock Mínimo</label>
                                <input type="number" value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} required className="w-full border-2 border-orange-200 focus:border-orange-500 rounded-md p-2.5 text-center text-orange-700 font-bold" min="1" title="El sistema alertará cuando queden menos de estas unidades" />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-md hover:bg-black transition shadow-md flex justify-center items-center gap-2">
                            Registrar Ingreso de Bodega
                        </button>
                    </form>
                </div>

                {/* --- DESPACHO LOGÍSTICO (Estricto FIFO) --- */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                    <div>
                        <div className="border-b pb-3 mb-5">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                🚚 Salida Logística
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Extracción estricta FIFO. El sistema asigna automáticamente el lote más antiguo.</p>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-lg mb-6">

                            {/* Lector automático del Frente de la Cola */}
                            {stockRenderizado.length > 0 ? (
                                <div className="mb-4 bg-white p-3 rounded border border-blue-200 shadow-sm">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Próximo en fila a despachar:</p>
                                    <p className="text-lg font-black text-gray-800 truncate">{stockRenderizado[0].getNombre()}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-mono">ID: {stockRenderizado[0].getCodigo()}</p>
                                </div>
                            ) : (
                                <div className="mb-4 bg-gray-100 p-3 rounded border border-gray-200 text-gray-500 text-sm text-center">
                                    No hay mercancía en espera.
                                </div>
                            )}

                            <label className="block text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide">Cajas a extraer:</label>
                            <input
                                type="number"
                                value={cantidadDespacho}
                                onChange={e => setCantidadDespacho(e.target.value)}
                                className="w-full border-2 border-blue-300 rounded-md p-4 text-2xl font-black text-center text-blue-800 focus:border-blue-500 outline-none"
                                min="1"
                                max={stockRenderizado.length || 1}
                                disabled={stockRenderizado.length === 0}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleDespachar}
                        disabled={stockRenderizado.length === 0}
                        className={`w-full font-bold py-4 rounded-md transition text-lg shadow-md flex justify-center items-center gap-2
              ${stockRenderizado.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {stockRenderizado.length === 0 ? 'Bodega Vacía' : 'Extraer Cajas y Rutar'}
                    </button>
                </div>
            </div>

            {/* --- RENDERIZADO VISUAL DEL VECTOR (COLA) --- */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex justify-between items-end border-b pb-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Mapa Físico del Depósito</h3>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">Memoria Activa</span>
                </div>

                {stockRenderizado.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-gray-50 rounded border-2 border-dashed border-gray-200 font-mono">
                        [ array vacío ] No hay inventario.
                    </div>
                ) : (
                    <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300">
                        <div className="flex gap-2 w-max">
                            <div className="flex flex-col items-center justify-center shrink-0 text-blue-600 font-black px-4 bg-blue-50 rounded-l-lg border-2 border-blue-200 border-r-0">
                                <span className="text-xl">FRENTE</span>
                                <span className="text-xs uppercase tracking-widest mt-1">Salida ➡️</span>
                            </div>

                            {stockRenderizado.map((prod, index) => (
                                <div key={`${prod.getCodigo()}-${index}`} className={`shrink-0 border-2 rounded-md p-3 w-44 flex flex-col justify-between transition-all hover:-translate-y-1
                  ${index === 0 ? 'border-blue-400 bg-white shadow-md' : 'border-gray-200 bg-gray-50'}`}>
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Pos {index}</span>
                                            {prod.necesitaReabastecimiento() && (
                                                <span title="Alerta: Quedan pocas unidades en la bodega en total" className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                            )}
                                        </div>
                                        <p className="font-bold text-gray-800 text-sm leading-tight mb-2 h-10 overflow-hidden" title={prod.getNombre()}>{prod.getNombre()}</p>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-gray-100 pt-2">
                                        <span className="text-[10px] font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                                            {prod.getCodigo()}
                                        </span>
                                        <span className="text-xs font-bold text-green-700">
                                            ₲ {prod.getPrecio().toLocaleString('es-PY')}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <div className="flex flex-col items-center justify-center shrink-0 text-green-600 font-black px-4 bg-green-50 rounded-r-lg border-2 border-green-200 border-l-0">
                                <span className="text-xs uppercase tracking-widest mb-1">⬅️ Entrada</span>
                                <span className="text-xl">FONDO</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}