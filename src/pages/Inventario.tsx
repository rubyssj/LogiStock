import React, { useState, useEffect } from 'react';
import { Producto, CategoriaProducto } from '../models';
import { ColaInventario } from '../lib/dataStructures/colaInventario';
import { TablaHashInventario } from '../lib/dataStructures/tablaHashInventario';
import { PuntoDeEntrega } from '../lib/dataStructures/grafoLogistica';

/**
 * INTERFAZ DE PROPS (InventarioProps)
 * ---------------------------------------------------------------------------
 * Aquí conectamos las Estructuras de Datos. 
 * @param colaFisica La Cola FIFO que maneja el inventario.
 * @param nodosGrafo Diccionario de Nodos (Sucursales/Clientes) provenientes del Grafo.
 * @param onDespacharRuta Función "Callback" para avisar a App.tsx que el camión ya fue cargado y debe saltar a Rutas.
 */
interface InventarioProps {
    colaFisica: ColaInventario;
    tablaProductos: TablaHashInventario;
    nodosGrafo: { [idNodo: string]: PuntoDeEntrega };
    // El callback ahora recibe ORIGEN y DESTINO por separado para trazar la ruta completa
    onDespacharRuta: (productosExtraidos: Producto[], idOrigen: string, idDestino: string) => void;
}

export default function Inventario({ colaFisica, tablaProductos, nodosGrafo, onDespacharRuta }: InventarioProps) {
    // 1. ESTADO DEL RENDERIZADO
    // Guardamos una copia del array físico para poder pintarlo en la pantalla (React).
    const [stockRenderizado, setStockRenderizado] = useState<Producto[]>([]);
    const [catalogoHash, setCatalogoHash] = useState<Producto[]>([]);

    // 2. ESTADOS DEL FORMULARIO DE INGRESO (Entrada a la Cola)
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState<CategoriaProducto>('electronica');
    const [precio, setPrecio] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [stockMinimo, setStockMinimo] = useState('5');

    // 3. ESTADOS DEL FORMULARIO DE DESPACHO (Salida de la Cola hacia el Grafo)
    const [cantidadDespacho, setCantidadDespacho] = useState('1');
    const [tipoTraslado, setTipoTraslado] = useState<'entrega' | 'interno'>('entrega');
    // Origen: desde qué depósito sale el camión
    const [origenDespacho, setOrigenDespacho] = useState('');
    // Destino: a qué sucursal/cliente llega el camión
    const [destinoDespacho, setDestinoDespacho] = useState('');

    const [buscarCodigo, setBuscarCodigo] = useState('');
    const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(null);
    const [busquedaSinResultado, setBusquedaSinResultado] = useState(false);

    // Array plano de nodos del Grafo para los selects
    const listaDestinos = Object.values(nodosGrafo);

    // Cuando el componente se monta por primera vez, leemos la Cola.
    useEffect(() => {
        actualizarPantalla();
    }, []);

    // Función auxiliar para forzar a React a dibujar la Cola actualizada.
    const actualizarPantalla = () => {
        const cola = colaFisica.mapearStockActual();
        setStockRenderizado(cola);
        setCatalogoHash(tablaProductos.listarCatalogo());
        if (productoEncontrado) {
            const actualizado = tablaProductos.buscarPorCodigo(productoEncontrado.getCodigo());
            setProductoEncontrado(actualizado);
        }
    };

    const handleBuscarProducto = () => {
        if (!buscarCodigo.trim()) return;
        const encontrado = tablaProductos.buscarPorCodigo(buscarCodigo);
        setProductoEncontrado(encontrado);
        setBusquedaSinResultado(!encontrado);
    };

    // Calcula el valor inmovilizado iterando el stock. (Análisis O(N) de la Cola).
    const calcularCapitalTotal = () => {
        return stockRenderizado.reduce((total, prod) => total + prod.getPrecio(), 0);
    };

    /**
     * OPERACIÓN ENQUEUE (Encolar)
     * -----------------------------------------------------------------------
     * Se ejecuta al registrar ingreso de bodega. Inserta al final (Tail) de la Cola.
     */
    const handleIngresarLote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !precio || !cantidad || !stockMinimo) return;

        const numPrecio = parseFloat(precio);
        const numCantidad = parseInt(cantidad, 10);
        const numMinimo = parseInt(stockMinimo, 10);

        try {
            // Instanciamos el objeto de negocio Producto
            const nuevoProducto = new Producto(nombre, categoria, numPrecio, numCantidad, numMinimo);
            // Lo ingresamos a nuestra estructura de datos personalizada (ColaInventario)
            colaFisica.ingresarLote(nuevoProducto, numCantidad);
            tablaProductos.registrar(nuevoProducto);

            // Limpiamos los campos visuales
            setNombre(''); setPrecio(''); setCantidad('');
            actualizarPantalla();
        } catch (error: any) {
            // El try-catch atrapa validaciones como "precio no puede ser negativo" definidas en la clase Producto.
            alert(`Error al registrar entrada: ${error.message}`);
        }
    };

    /**
     * OPERACIÓN DEQUEUE + CONEXIÓN AL GRAFO
     * -----------------------------------------------------------------------
     * Se ejecuta al presionar "Extraer Cajas y Rutar".
     * Saca del FRENTE de la Cola (FIFO) y pasa el resultado al padre (App.tsx).
     *
     * Reglas de validación:
     * - Modo "entrega": el usuario debe elegir de qué depósito parte y a qué cliente llega.
     * - Modo "interno":  el usuario debe elegir dos depósitos distintos (A → B).
     */
    const handleDespachar = () => {
        const numDespacho = parseInt(cantidadDespacho, 10);
        if (isNaN(numDespacho) || numDespacho <= 0) return;

        // Validación: ambos campos (origen y destino) son obligatorios
        if (!origenDespacho) {
            alert("⚠️ Seleccione el Depósito de SALIDA del camión.");
            return;
        }
        if (!destinoDespacho) {
            alert("⚠️ Seleccione el Depósito o Cliente de LLEGADA.");
            return;
        }
        // No puede ser el mismo nodo para ambos campos
        if (origenDespacho === destinoDespacho) {
            alert("⚠️ El origen y el destino no pueden ser el mismo punto.");
            return;
        }

        // DEQUEUE: Extraemos N elementos del FRENTE (Front) de la Cola FIFO
        const extraidos = colaFisica.despacharPedido(numDespacho);
        if (extraidos.length === 0) {
            alert("⚠️ No hay mercadería suficiente para este despacho.");
            return;
        }

        // Llamamos al padre con el origen, destino y los productos.
        // App.tsx disparará el salto a Rutas y ejecutará Dijkstra + OSRM.
        onDespacharRuta(extraidos, origenDespacho, destinoDespacho);
        actualizarPantalla();
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 bg-gray-50 rounded-xl shadow-sm">
            {/* --- DASHBOARD FINANCIERO Y DE STOCK --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-1">
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
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Productos Registrados</p>
                    <p className="text-3xl font-black text-gray-800 mt-1">{catalogoHash.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Buscar por Código</p>
                    <div className="flex items-stretch gap-1.5 mt-1">
                        <input
                            type="text"
                            value={buscarCodigo}
                            onChange={e => { setBuscarCodigo(e.target.value); setBusquedaSinResultado(false); }}
                            onKeyDown={e => e.key === 'Enter' && handleBuscarProducto()}
                            placeholder="Ej: P-002"
                            title="Buscar producto por código"
                            className="flex-1 min-w-0 text-sm border border-gray-200 focus:border-gray-400 rounded-md px-2.5 py-2 font-mono outline-none bg-gray-50 focus:bg-white"
                        />
                        <button
                            type="button"
                            onClick={handleBuscarProducto}
                            className="shrink-0 flex items-center justify-center w-9 border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-600 transition"
                            title="Buscar"
                        >
                            🔍
                        </button>
                    </div>
                </div>
            </div>
            {(productoEncontrado || busquedaSinResultado) && (
                <div className="mb-4">
                    {productoEncontrado ? (
                        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-3 text-sm">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Código</p>
                                <p className="font-mono font-semibold text-gray-800">{productoEncontrado.getCodigo()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Producto</p>
                                <p className="font-medium text-gray-800 truncate" title={productoEncontrado.getNombre()}>{productoEncontrado.getNombre()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">En bodega</p>
                                <p className="font-semibold text-gray-800">
                                    {tablaProductos.contarUnidadesEnCola(productoEncontrado.getCodigo(), stockRenderizado)} cajas
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Precio</p>
                                <p className="font-semibold text-green-700">₲ {productoEncontrado.getPrecio().toLocaleString('es-PY')}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Estado</p>
                                <p className={`font-medium ${productoEncontrado.necesitaReabastecimiento() ? 'text-red-600' : 'text-gray-500'}`}>
                                    {productoEncontrado.necesitaReabastecimiento() ? 'Stock bajo' : 'Normal'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-right sm:text-left">
                            No se encontró ese código.
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {/* --- RECEPCIÓN DE MERCADERÍA (ENQUEUE) --- */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="border-b pb-3 mb-5">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            Entrada de Stock
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
                                <input type="number" value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} required className="w-full border-2 border-orange-200 focus:border-orange-500 rounded-md p-2.5 text-center text-orange-700 font-bold" min="1" />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-md hover:bg-black transition shadow-md flex justify-center items-center gap-2">
                            Registrar Ingreso de Bodega
                        </button>
                    </form>
                </div>

                {/* --- DESPACHO LOGÍSTICO HACIA EL GRAFO (DEQUEUE) --- */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                    <div>
                        <div className="border-b pb-3 mb-5">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                Preparar Traslado / Entrega
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Conecta el Inventario FIFO con el Grafo de Rutas Dijkstra.</p>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-lg mb-6 space-y-4">

                            {/* SELECTOR DE TIPO DE MOVIMIENTO */}
                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1 uppercase">Tipo de Movimiento</label>
                                <select
                                    value={tipoTraslado}
                                    onChange={e => {
                                        // Al cambiar el tipo, limpiamos los selectores para evitar
                                        // que quede seleccionado un nodo inválido del modo anterior.
                                        setTipoTraslado(e.target.value as 'entrega' | 'interno');
                                        setOrigenDespacho('');
                                        setDestinoDespacho('');
                                    }}
                                    className="w-full border border-blue-200 rounded p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="entrega">🛒 Entrega Final a Cliente</option>
                                    <option value="interno">🔄 Traslado Interno (Depósito → Depósito)</option>
                                </select>
                            </div>

                            {/* SELECTOR DE ORIGEN: Depósito desde donde sale el camión */}
                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1 uppercase">
                                    {tipoTraslado === 'entrega' ? '🏭 Depósito de Salida' : '🏭 Depósito Origen (A)'}
                                </label>
                                <select
                                    value={origenDespacho}
                                    onChange={e => setOrigenDespacho(e.target.value)}
                                    className="w-full border border-blue-200 rounded p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="">-- Seleccione punto de partida --</option>
                                    {/* Filtramos el nodo que ya eligió como destino para evitar conflictos */}
                                    {listaDestinos
                                        .filter(n => n.idNodo !== destinoDespacho)
                                        .map(nodo => (
                                            <option key={nodo.idNodo} value={nodo.idNodo}>
                                                {nodo.nombreCliente}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* SELECTOR DE DESTINO: Depósito o Cliente al que llega */}
                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1 uppercase">
                                    {tipoTraslado === 'entrega' ? '📍 Dirección del Cliente (Destino)' : '📍 Depósito Destino (B)'}
                                </label>
                                <select
                                    value={destinoDespacho}
                                    onChange={e => setDestinoDespacho(e.target.value)}
                                    className="w-full border border-blue-200 rounded p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <option value="">-- Seleccione destino --</option>
                                    {/* Filtramos el nodo que ya eligió como origen para evitar duplicados */}
                                    {listaDestinos
                                        .filter(n => n.idNodo !== origenDespacho)
                                        .map(nodo => (
                                            <option key={nodo.idNodo} value={nodo.idNodo}>
                                                {nodo.nombreCliente}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* RESUMEN VISUAL de la operación seleccionada */}
                            {origenDespacho && destinoDespacho && (
                                <div className="bg-white rounded border border-blue-200 p-2 text-xs text-blue-800 font-bold text-center">
                                    {nodosGrafo[origenDespacho]?.nombreCliente} 
                                    <span className="text-orange-500 mx-2">→</span>
                                    {nodosGrafo[destinoDespacho]?.nombreCliente}
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-white text-[10px] ${tipoTraslado === 'entrega' ? 'bg-green-500' : 'bg-purple-500'}`}>
                                        {tipoTraslado === 'entrega' ? 'Entrega' : 'Interno'}
                                    </span>
                                </div>
                            )}

                            <hr className="border-blue-200 border-dashed" />

                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1 uppercase tracking-wide">Cajas a Extraer (FIFO):</label>
                                <input
                                    type="number"
                                    value={cantidadDespacho}
                                    onChange={e => setCantidadDespacho(e.target.value)}
                                    className="w-full border border-blue-300 rounded-md p-3 text-xl font-black text-center text-blue-800 focus:border-blue-500 outline-none"
                                    min="1"
                                    max={stockRenderizado.length || 1}
                                    disabled={stockRenderizado.length === 0}
                                />
                            </div>

                            {stockRenderizado.length > 0 ? (
                                <p className="text-[10px] text-blue-700 text-center font-bold">
                                    Extraerá: {stockRenderizado[0].getNombre()} (Cod: {stockRenderizado[0].getCodigo()})
                                </p>
                            ) : (
                                <p className="text-[10px] text-gray-500 text-center italic">Bodega vacía.</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleDespachar}
                        disabled={stockRenderizado.length === 0}
                        className={`w-full font-bold py-4 rounded-md transition text-lg shadow-md flex justify-center items-center gap-2
              ${stockRenderizado.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                    >
                        {stockRenderizado.length === 0 ? 'Sin Stock' : ' Extraer Cajas y Rutar'}
                    </button>
                </div>
            </div>

            {/* --- DIRECTORIO DE PRODUCTOS --- */}
            {catalogoHash.length > 0 && (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Directorio de Productos</h3>
                        <span className="text-xs text-gray-400">{catalogoHash.length} producto(s)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b">
                                    <th className="pb-2 font-bold">Código</th>
                                    <th className="pb-2 font-bold">Nombre</th>
                                    <th className="pb-2 font-bold">Categoría</th>
                                    <th className="pb-2 font-bold text-right">Precio (Gs.)</th>
                                    <th className="pb-2 font-bold text-center">En Cola</th>
                                </tr>
                            </thead>
                            <tbody>
                                {catalogoHash.map(prod => (
                                    <tr
                                        key={prod.getCodigo()}
                                        className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${productoEncontrado?.getCodigo() === prod.getCodigo() ? 'bg-blue-50' : ''}`}
                                        onClick={() => { setBuscarCodigo(prod.getCodigo()); setProductoEncontrado(prod); setBusquedaSinResultado(false); }}
                                    >
                                        <td className="py-2 font-mono text-gray-600">{prod.getCodigo()}</td>
                                        <td className="py-2 font-medium">{prod.getNombre()}</td>
                                        <td className="py-2 capitalize">{prod.getCategoria()}</td>
                                        <td className="py-2 text-right">{prod.getPrecio().toLocaleString('es-PY')}</td>
                                        <td className="py-2 text-center font-bold">{tablaProductos.contarUnidadesEnCola(prod.getCodigo(), stockRenderizado)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- RENDERIZADO VISUAL DEL VECTOR (COLA) --- */}
            {/* Omitimos comentarios extensos en esta parte visual ya que es la misma de la versión anterior */}
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
                                                <span title="Alerta: Quedan pocas unidades en la bodega" className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
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