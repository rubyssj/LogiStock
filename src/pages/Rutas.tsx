import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GrafoLogistica } from '../lib/dataStructures/grafoLogistica';
import { Producto } from '../models';
import { Truck, MapPin, CheckCircle, Zap } from 'lucide-react';

/**
 * COMPONENTE: Rutas (Optimizador de Entregas)
 * ---------------------------------------------------------------------------
 * Componente principal para visualizar el Algoritmo de Dijkstra en acción.
 * Se conecta a la API de OSRM para dibujar el recorrido exacto por las calles
 * (Google Maps Style).
 */

interface RutasProps {
    grafo: GrafoLogistica;
    pedidosEnTransito: Producto[];
    rutaSugerida?: { origen: string, destino: string } | null;
}

export default function Rutas({ grafo, pedidosEnTransito, rutaSugerida }: RutasProps) {
    // ESTADOS LOCALES DE LA VISTA
    const [rutaInicio, setRutaInicio] = useState("");
    const [rutaFin, setRutaFin] = useState("");
    const [rutaOptima, setRutaOptima] = useState<{ ruta: string[], distanciaTotal: number } | null>(null);

    // Estado para guardar las coordenadas geométricas exactas de las calles devueltas por OSRM
    const [rutaCalles, setRutaCalles] = useState<[number, number][]>([]);
    const [cargandoRuta, setCargandoRuta] = useState(false);

    const nodos = grafo.getPuntosDeEntrega();
    const arrayNodos = Object.values(nodos);

    /**
     * Integración con OSRM para Trazado por Calles Reales
     */
    const obtenerGeometriaCalles = async (secuenciaNodos: string[]) => {
        try {
            setCargandoRuta(true);

            // 1. Extraer Solo Origen y Destino para que OSRM trace la calle directa.
            // Aclaración: Dijkstra evalúa la red lógica, pero físicamente el camión no está
            // obligado a detenerse en depósitos intermedios (No es TSP).
            const origenCoords = nodos[secuenciaNodos[0]].coordenadas;
            const destinoCoords = nodos[secuenciaNodos[secuenciaNodos.length - 1]].coordenadas;
            const coordenadasParams = `${origenCoords.lng},${origenCoords.lat};${destinoCoords.lng},${destinoCoords.lat}`;

            // 2. Hacer la petición a la API pública de OSRM
            const url = `https://router.project-osrm.org/route/v1/driving/${coordenadasParams}?geometries=geojson&overview=full`;
            const respuesta = await fetch(url);
            const data = await respuesta.json();

            // 3. Extraer la polilínea y convertirla a formato de Leaflet [Lat, Lng]
            if (data && data.routes && data.routes.length > 0) {
                const coordinatesLngLat = data.routes[0].geometry.coordinates;
                const coordinatesLatLgn = coordinatesLngLat.map((coord: [number, number]) => [coord[1], coord[0]]);
                setRutaCalles(coordinatesLatLgn);
            }
        } catch (error) {
            console.error("Error al obtener la ruta geométrica de OSRM:", error);
            // Si falla OSRM (ej. sin internet), caemos al trazado de líneas rectas (vuelo de pájaro)
            const fallbackCoords = secuenciaNodos.map(id => [nodos[id].coordenadas.lat, nodos[id].coordenadas.lng] as [number, number]);
            setRutaCalles(fallbackCoords);
        } finally {
            setCargandoRuta(false);
        }
    };

    const handleCalcularRuta = () => {
        if (!rutaInicio || !rutaFin) return;

        // Ejecutamos el algoritmo puro (Dijkstra) que armamos en la clase
        const resultadoDijkstra = grafo.calcularMejorRuta(rutaInicio, rutaFin);

        setRutaOptima(resultadoDijkstra);

        // Si encontramos una ruta, pedimos la geometría de las calles
        if (resultadoDijkstra) {
            obtenerGeometriaCalles(resultadoDijkstra.ruta);
        } else {
            setRutaCalles([]);
        }
    };

    /**
     * EFECTO "GOLAZO": Auto-ejecuta la ruta si venimos de la pestaña Inventario
     */
    useEffect(() => {
        if (rutaSugerida && rutaSugerida.origen && rutaSugerida.destino) {
            setRutaInicio(rutaSugerida.origen);
            setRutaFin(rutaSugerida.destino);
            
            // Forzamos el cálculo directamente sin esperar el clic del botón
            const resultado = grafo.calcularMejorRuta(rutaSugerida.origen, rutaSugerida.destino);
            setRutaOptima(resultado);
            if (resultado) {
                obtenerGeometriaCalles(resultado.ruta);
            }
        }
    }, [rutaSugerida, grafo]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* PANEL LATERAL IZQUIERDO */}
            <div className="lg:col-span-1 space-y-6">

                {/* WIDGET 1: FORMULARIO */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
                        <MapPin className="text-primary w-6 h-6" />
                        Optimizador de Entregas
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700">Punto de Partida</label>
                            <select
                                value={rutaInicio}
                                onChange={e => setRutaInicio(e.target.value)}
                                className="w-full border border-slate-300 p-2 mt-1 rounded-md bg-white focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Seleccione Origen...</option>
                                {arrayNodos.map(n => <option key={`orig-${n.idNodo}`} value={n.idNodo}>{n.nombreCliente}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">Destino de Entrega</label>
                            <select
                                value={rutaFin}
                                onChange={e => setRutaFin(e.target.value)}
                                className="w-full border border-slate-300 p-2 mt-1 rounded-md bg-white focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Seleccione Destino...</option>
                                {arrayNodos.map(n => <option key={`dest-${n.idNodo}`} value={n.idNodo}>{n.nombreCliente}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={handleCalcularRuta}
                            disabled={cargandoRuta}
                            className="w-full bg-[#ea580c] text-white font-bold py-3 rounded-md hover:bg-orange-700 transition-colors shadow-md active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {cargandoRuta ? "Calculando calles..." : "Optimizar Mi Entrega"}
                        </button>
                    </div>
                </div>

                {/* WIDGET 2: RESULTADOS COMERCIALES */}
                {rutaOptima && (
                    <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm animate-fade-in relative overflow-hidden">

                        {/* SELLO DE AHORRO LOGÍSTICO */}
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Logística Optimizada
                        </div>

                        <h3 className="font-bold text-orange-800 text-lg flex items-center gap-2 mb-2 mt-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Ruta más rápida encontrada
                        </h3>

                        <div className="bg-white p-3 rounded-lg border border-orange-100 mb-3 text-center shadow-inner relative group">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total de kilómetros a recorrer</p>
                            <p className="text-3xl font-black text-[#ea580c]">{rutaOptima.distanciaTotal} <span className="text-base text-slate-600 font-medium">km</span></p>
                            
                            {/* Documentación UI para la defensa */}
                            <p className="text-[10px] text-slate-400 mt-2 italic bg-slate-50 p-1 rounded">
                                Nota: Ruta directa A ➔ B en calle. Los nodos intermedios son referenciales (No es TSP).
                            </p>
                        </div>

                        <div className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-100">
                            <span className="font-bold block mb-2 text-xs text-slate-500 uppercase">Itinerario:</span>
                            <div className="flex flex-col gap-2">
                                {rutaOptima.ruta.map((r, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-blue-500' : i === rutaOptima.ruta.length - 1 ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                                        <span className={`font-semibold ${i === 0 || i === rutaOptima.ruta.length - 1 ? 'text-slate-800' : 'text-slate-600'}`}>
                                            {nodos[r].nombreCliente}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* WIDGET 3: ÍTEMS EN CAMINO (Cola FIFO) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                        <Truck className="text-slate-500 w-5 h-5" />
                        Pedidos en Tránsito
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {pedidosEnTransito.length === 0 ? (
                            <p className="text-xs text-slate-500 italic text-center py-4">No hay despachos activos en tu furgoneta.</p>
                        ) : (
                            pedidosEnTransito.map((prod, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 text-sm">
                                    <div>
                                        <span className="font-bold text-slate-700 block">{prod.getNombre()}</span>
                                        <span className="text-xs text-slate-500">Cod: {prod.getCodigo()}</span>
                                    </div>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                        En camino
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: MAPA VISUAL */}
            <div className="lg:col-span-3 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm h-[600px] relative z-0">
                <MapContainer center={[-25.32, -57.57]} zoom={12} className="w-full h-full z-0">
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Renderizamos las sucursales disponibles */}
                    {arrayNodos.map(n => (
                        <Marker key={n.idNodo} position={[n.coordenadas.lat, n.coordenadas.lng]}>
                            <Popup>
                                <div className="text-center font-sans">
                                    <strong className="block text-sm text-slate-800">{n.nombreCliente}</strong>
                                    <span className="text-xs text-slate-500">ID: {n.idNodo}</span>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Renderizamos el Camino Geométrico de las Calles (OSRM) */}
                    {rutaCalles.length > 0 && (
                        <Polyline
                            positions={rutaCalles}
                            color="#16a34a" /* Verde para representar el ahorro (green-600) */
                            weight={6}
                            opacity={0.8}
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
