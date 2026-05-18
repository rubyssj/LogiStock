import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GrafoLogistica } from '../lib/dataStructures/grafoLogistica';
import { Producto } from '../models';
import { Truck, MapPin } from 'lucide-react';

/**
 * COMPONENTE: Rutas (Módulo de Grafos y Caminos Mínimos)
 * ---------------------------------------------------------------------------
 * Este componente es la interfaz visual para la estructura de datos de Grafo.
 * Permite al usuario interactuar con el algoritmo de Dijkstra para encontrar
 * la ruta óptima entre dos puntos (nodos) de nuestra red logística.
 * 
 * ¿Cómo se conecta React con la Estructura de Datos (Grafo)?
 * - El Grafo se mantiene persistente en la memoria de la App usando useRef o 
 *   como prop, evitando que React lo destruya en cada re-renderizado.
 * - Al presionar "Optimizar Ruta", React simplemente invoca el método 
 *   calcularRutaOptima(origen, destino) del objeto Grafo.
 * - El resultado (la ruta en string[] y la distancia) se guarda en un Estado
 *   de React (useState), lo que fuerza a la interfaz a dibujarse nuevamente,
 *   mostrando la polilínea en el mapa y el cuadro de resultados.
 */

interface RutasProps {
    grafo: GrafoLogistica; // Recibimos la instancia de la clase Grafo (Lógica de Datos)
    pedidosEnTransito: Producto[]; // Recibimos los items que salieron de la Cola FIFO
}

export default function Rutas({ grafo, pedidosEnTransito }: RutasProps) {
    // ESTADOS LOCALES DE LA VISTA
    const [rutaInicio, setRutaInicio] = useState("");
    const [rutaFin, setRutaFin] = useState("");
    const [rutaOptima, setRutaOptima] = useState<{ ruta: string[], distanciaTotal: number } | null>(null);

    /**
     * Extraemos los nodos disponibles del grafo directamente de su diccionario interno.
     * Esto permite pintar dinámicamente los "options" de los Selects y los Markers del mapa.
     */
    const nodos = (grafo as any).puntos; 
    const arrayNodos = Object.values(nodos) as any[];

    /**
     * MANEJADOR DEL EVENTO DE CÁLCULO
     * -----------------------------------------------------------------------
     * Complejidad Teórica del Algoritmo de Dijkstra:
     * - Utilizando una Cola de Prioridad estándar: O(E * log(V)) donde E son 
     *   las aristas (rutas) y V los vértices (puntos de entrega).
     * - En implementaciones con arreglos (matrices de adyacencia sin cola de min-priority),
     *   la complejidad sería O(V^2). Para nuestra red logística de tamaño pequeño/mediano,
     *   este tiempo de ejecución es instantáneo (O(1) a nivel práctico).
     */
    const handleCalcularRuta = () => {
        if (!rutaInicio || !rutaFin) return;
        
        // Delegamos el procesamiento algorítmico a la clase Grafo
        const resultadoDijkstra = grafo.calcularRutaOptima(rutaInicio, rutaFin);
        
        // Guardamos el resultado en el estado para que React actualice la UI
        setRutaOptima(resultadoDijkstra);
    };

    // Preparamos las coordenadas para la polilínea (la línea naranja en el mapa)
    let rutaCoords: [number, number][] = [];
    if (rutaOptima) {
        rutaCoords = rutaOptima.ruta.map(nodoId => {
            const p = nodos[nodoId].coordenadas;
            return [p.lat, p.lng];
        });
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* PANEL LATERAL IZQUIERDO: CONTROLES Y RESULTADOS */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* WIDGET 1: PANEL DE ALGORITMO DE DIJKSTRA */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
                        <MapPin className="text-primary" />
                        Algoritmo de Dijkstra
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-700">Origen (Nodo Inicial)</label>
                            <select 
                                value={rutaInicio} 
                                onChange={e => setRutaInicio(e.target.value)} 
                                className="w-full border border-gray-300 p-2 mt-1 rounded-md bg-white focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Seleccione...</option>
                                {arrayNodos.map(n => <option key={`orig-${n.idNodo}`} value={n.idNodo}>{n.nombreCliente}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700">Destino (Nodo Final)</label>
                            <select 
                                value={rutaFin} 
                                onChange={e => setRutaFin(e.target.value)} 
                                className="w-full border border-gray-300 p-2 mt-1 rounded-md bg-white focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="">Seleccione...</option>
                                {arrayNodos.map(n => <option key={`dest-${n.idNodo}`} value={n.idNodo}>{n.nombreCliente}</option>)}
                            </select>
                        </div>
                        
                        <button 
                            onClick={handleCalcularRuta} 
                            className="w-full bg-orange-600 text-white font-bold py-2 rounded-md hover:bg-orange-700 transition-colors shadow-md active:scale-95"
                        >
                            Optimizar Ruta (Calcular)
                        </button>
                    </div>
                </div>

                {/* WIDGET 2: WIDGET DE RESULTADO ÓPTIMO */}
                {rutaOptima && (
                    <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm animate-fade-in">
                        <h3 className="font-bold text-orange-800 text-lg flex items-center gap-2 mb-3">
                            <Truck className="w-5 h-5" /> 
                            Resultado Óptimo
                        </h3>
                        <p className="text-sm text-gray-800 mb-2">
                            Distancia total (Costo mínimo): <strong className="text-lg text-orange-600">{rutaOptima.distanciaTotal} km</strong>
                        </p>
                        
                        <div className="text-sm text-gray-700 font-mono bg-white p-3 rounded border border-orange-100 overflow-x-auto">
                            <span className="font-bold block mb-1 text-xs text-gray-500 uppercase">Recorrido Detallado:</span>
                            {rutaOptima.ruta.map((r, i) => (
                                <span key={i} className="inline-flex items-center">
                                    {i > 0 && <span className="text-orange-400 mx-1">➜</span>}
                                    <span className="bg-orange-100 px-2 py-1 rounded text-orange-800 font-semibold text-xs">
                                        {nodos[r].nombreCliente}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* WIDGET 3: ÍTEMS EN CAMINO (Conectado con la Cola FIFO) */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3 border-b pb-2">
                        <Truck className="text-slate-500 w-5 h-5" />
                        Pedidos en Tránsito
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {pedidosEnTransito.length === 0 ? (
                            <p className="text-xs text-gray-500 italic text-center py-4">No hay despachos activos desde la Cola.</p>
                        ) : (
                            pedidosEnTransito.map((prod, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 text-sm">
                                    <div>
                                        <span className="font-bold text-slate-700 block">{prod.getNombre()}</span>
                                        <span className="text-xs text-slate-500">Cod: {prod.getCodigo()}</span>
                                    </div>
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                        Despachado
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: MAPA DE VISUALIZACIÓN */}
            <div className="lg:col-span-3 bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm h-[600px] relative">
                {/* 
                    Librería react-leaflet: Integración directa del mapa.
                    El estado de React se sincroniza con los marcadores. 
                */}
                <MapContainer center={[-25.32, -57.57]} zoom={12} className="w-full h-full z-0">
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Renderizamos los Nodos (Vértices) del Grafo como Marcadores */}
                    {arrayNodos.map(n => (
                        <Marker key={n.idNodo} position={[n.coordenadas.lat, n.coordenadas.lng]}>
                            <Popup>
                                <div className="text-center">
                                    <strong className="block text-sm">{n.nombreCliente}</strong>
                                    <span className="text-xs text-gray-500">ID: {n.idNodo}</span>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                    
                    {/* Renderizamos el Camino Mínimo (Aristas resultantes) */}
                    {rutaCoords.length > 0 && (
                        <Polyline 
                            positions={rutaCoords} 
                            color="#ea580c" /* Naranja 600 de Tailwind */
                            weight={5} 
                            opacity={0.8}
                            dashArray="10, 10" 
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
