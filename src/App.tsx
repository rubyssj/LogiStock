import React, { useState, useRef, FormEvent, useEffect } from "react";
import { Cola, ColaInventario } from "./lib/dataStructures/colaInventario";
import { TablaHashInventario } from "./lib/dataStructures/tablaHashInventario";
import Inventario from './pages/Inventario';
import { TablaHash } from "./lib/dataStructures/tablaHash";
import { GrafoLogistica } from "./lib/dataStructures/grafoLogistica";
import { Cliente, Pedido, Producto } from "./models";
import { generador } from "./utils/generadorIds";
import { PackageOpen, Map as MapIcon, Truck, Search, PlusCircle, CheckCircle, Package, LayoutDashboard, Users, MapPin, User, Building } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Rutas from './pages/Rutas';
import { LinkedList } from "./lib/dataStructures/listaEnlazada";
import sidebarLogo from "./assets/logotransparente.png";

// Fix leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type TabType = 'dashboard' | 'inventario' | 'rutas' | 'clientes';

function LocationPicker({ position, setPosition }: { position: { lat: number, lng: number }, setPosition: (pos: { lat: number, lng: number }) => void }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return (
    <Marker position={[position.lat, position.lng]}>
      <Popup>Ubicación exacta del depósito</Popup>
    </Marker>
  );
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  const colaPedidosRef = useRef(new Cola<Pedido>());
  const colaInventarioRef = useRef(new ColaInventario());
  const tablaProductosRef = useRef(new TablaHashInventario());
  const tablaClientesRef = useRef(new TablaHash<Cliente>());
  const grafoRutasRef = useRef(new GrafoLogistica());
  const historialRef = useRef(new LinkedList<{
    operacion: string;
    producto: string;
    cantidad: number;
    costo: number;
    estado: string;
    hora: string;
  }>());

  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(tick => tick + 1);

  // Inventario Form
  const [productoNombre, setProductoNombre] = useState("");
  const [productoPrecio, setProductoPrecio] = useState("");
  const [productoCantidad, setProductoCantidad] = useState("1");
  const [buscarProductoId, setBuscarProductoId] = useState("");
  const [productoError, setProductoError] = useState<string | null>(null);

  // Cliente Form
  const [clienteId, setClienteId] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [modalidadNegocio, setModalidadNegocio] = useState<"MicroEmpresa" | "Emprendedor">("Emprendedor");
  const [cantidadEmpleados, setCantidadEmpleados] = useState("1");
  const [depositosCliente, setDepositosCliente] = useState<{ nombre: string, direccion: string, ciudad: string, barrio: string, coordenadas: { lat: number, lng: number } }[]>([]);
  const [depositoTemp, setDepositoTemp] = useState({ nombre: "", direccion: "", ciudad: "", barrio: "", coordenadas: { lat: -25.2637, lng: -57.5759 } });
  const [clienteError, setClienteError] = useState<string | null>(null);

  const [buscarClienteId, setBuscarClienteId] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null);

  // Cola de Despacho y Rutas Sugeridas
  const [pedidosEnTransito, setPedidosEnTransito] = useState<Producto[]>([]);
  const [rutaSugerida, setRutaSugerida] = useState<{ origen: string, destino: string } | null>(null);

  useEffect(() => {
    // Inicializar Grafo
    const grafo = grafoRutasRef.current;

    // Coordenadas aproximadas Asunción / Central, Paraguay
    grafo.agregarPuntoEntrega("deposito_central", "Depósito Central", { lat: -25.2968, lng: -57.6256 });
    grafo.agregarPuntoEntrega("cliente_lambare", "Cliente Lambaré", { lat: -25.3375, lng: -57.6272 });
    grafo.agregarPuntoEntrega("cliente_san_lorenzo", "Cliente San Lorenzo", { lat: -25.3392, lng: -57.5113 });
    grafo.agregarPuntoEntrega("cliente_fernando", "Cliente Fernando", { lat: -25.3217, lng: -57.5502 });

    grafo.conectarPuntos("deposito_central", "cliente_lambare", 8);
    grafo.conectarPuntos("deposito_central", "cliente_fernando", 10);
    grafo.conectarPuntos("cliente_fernando", "cliente_san_lorenzo", 5);
    grafo.conectarPuntos("cliente_lambare", "cliente_fernando", 6);

    // Inicializar algunos clientes (Tabla Hash)
    const cliente1 = new Cliente("Juan Pérez", "juan@ejemplo.com", "0981234567", "4123456", "Calle Lambaré 123", "Emprendedor", "1", []);
    tablaClientesRef.current.insertar("4123456", cliente1);

    // Poblado inicial del Historial (Lista Enlazada de Nilda)
    historialRef.current.prepend({
      operacion: 'Entrada Stock',
      producto: "Yerba Mate 'El Campesino' (Lote Inicial)",
      cantidad: 50,
      costo: 1250000,
      estado: 'COMPLETADO',
      hora: 'Hace 2h'
    });
    historialRef.current.prepend({
      operacion: 'Entrada Stock',
      producto: "Aceite de Soja 'Soja Linda' (Lote Inicial)",
      cantidad: 20,
      costo: 300000,
      estado: 'COMPLETADO',
      hora: 'Hace 4h'
    });
  }, []);

  const handleIngresarLote = (e: FormEvent) => {
    e.preventDefault();
    if (!productoNombre || !productoPrecio || !productoCantidad) return;

    try {
      setProductoError(null);
      const prod = new Producto(productoNombre, "otros", parseFloat(productoPrecio), 1);
      colaInventarioRef.current.ingresarLote(prod, parseInt(productoCantidad));
      tablaProductosRef.current.registrar(prod);

      // Registrar en Historial (Lista Enlazada)
      historialRef.current.prepend({
        operacion: 'Entrada Stock',
        producto: `${productoNombre} (Código #${prod.getCodigo()})`,
        cantidad: parseInt(productoCantidad),
        costo: parseFloat(productoPrecio) * parseInt(productoCantidad),
        estado: 'COMPLETADO',
        hora: new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
      });

      setProductoNombre(""); setProductoPrecio(""); setProductoCantidad("1");
      forceUpdate();
    } catch (error: any) {
      setProductoError(error.message);
    }
  };

  const handleRegistrarCliente = (e: FormEvent) => {
    e.preventDefault();
    if (!clienteId || !nombre || !direccion) return;

    const depositosFormales = depositosCliente.map((dep, index) => ({
      idNodo: generador.nuevoIdNodo(),
      nombre: dep.nombre,
      direccion: dep.direccion + ", " + dep.barrio + ", " + dep.ciudad,
      coordenadas: dep.coordenadas // ¡Ahora usa las coordenadas reales del mapa interactivo!
    }));

    try {
      setClienteError(null);
      const cliente = new Cliente(
        nombre + " " + apellido,
        email || "sin@email.com",
        telefono || "000000",
        clienteId,
        direccion,
        modalidadNegocio,
        cantidadEmpleados,
        depositosFormales
      );
      tablaClientesRef.current.insertar(clienteId, cliente);

      depositosFormales.forEach(dep => {
        grafoRutasRef.current.agregarPuntoEntrega(dep.idNodo, `${cliente.getNombre()} - ${dep.nombre}`, dep.coordenadas);
        grafoRutasRef.current.conectarPuntos("deposito_central", dep.idNodo, 5);
      });

      // Registrar en Historial (Lista Enlazada)
      historialRef.current.prepend({
        operacion: 'Nuevo Cliente',
        producto: `${nombre} ${apellido} (RUC: ${clienteId})`,
        cantidad: depositosFormales.length,
        costo: 0,
        estado: 'COMPLETADO',
        hora: new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
      });

      setClienteId(""); setNombre(""); setApellido(""); setEmail(""); setTelefono(""); setDireccion("");
      setDepositosCliente([]);
      forceUpdate();
    } catch (error: any) {
      setClienteError(error.message);
    }
  };

  const handleBuscarCliente = () => {
    if (!buscarClienteId) return;
    const c = tablaClientesRef.current.buscar(buscarClienteId);
    setClienteEncontrado(c);
  };



  const renderDashboard = () => (
    <div className="max-w-container-max mx-auto space-y-6 animate-fade-in">
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-150">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Panel Principal</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Bienvenido de vuelta. Aquí está el resumen de operaciones para hoy.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar Reporte
          </button>
          <button className="flex items-center gap-2 bg-primary text-white hover:bg-primary/95 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer">
            <span className="material-symbols-outlined text-lg">calendar_today</span>
            Ver Historial
          </button>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Cajas en Bodega */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center mb-2">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">inventory</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              Lote Activo
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cajas en Bodega (FIFO)</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{colaInventarioRef.current.mapearStockActual().length}</h3>
            </div>
            <div className="w-24 h-10 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path
                  d="M 0 25 C 20 10, 40 28, 60 12 C 80 5, 90 22, 100 18"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Pedidos en Tránsito */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center mb-2">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">pending_actions</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
              <span className="material-symbols-outlined text-xs">local_shipping</span>
              En camino
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cajas en Tránsito</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{pedidosEnTransito.length}</h3>
            </div>
            <div className="w-24 h-10 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path
                  d="M 0 15 C 20 28, 40 10, 60 25 C 80 30, 90 15, 100 20"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Nodos de Ruta */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center mb-2">
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
              <span className="material-symbols-outlined text-xs">route</span>
              Red de Grafos
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nodos del Grafo</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{Object.keys(grafoRutasRef.current.getPuntosDeEntrega()).length}</h3>
            </div>
            <div className="w-24 h-10 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path
                  d="M 0 20 C 25 30, 40 5, 60 15 C 80 25, 90 10, 100 10"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Clientes Hash Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center mb-2">
            <div className="w-10 h-10 bg-fuchsia-50 text-fuchsia-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">groups</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-fuchsia-50 text-fuchsia-700 rounded-full border border-fuchsia-100">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              Tabla Hash
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clientes (Hash)</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{tablaClientesRef.current.obtenerClaves().length}</h3>
            </div>
            <div className="w-24 h-10 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path
                  d="M 0 22 C 20 12, 40 28, 60 10 C 80 5, 90 25, 100 15"
                  fill="none"
                  stroke="#d01c8b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Central Section - Rutas Activas */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Despachos y Rutas Activas</h3>
              <p className="text-xs text-slate-400 mt-1">Seguimiento de entregas optimizadas con Dijkstra</p>
            </div>
            <button 
              onClick={() => setCurrentTab('rutas')} 
              className="text-xs font-bold text-primary hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Ver mapa de entregas
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          {rutaSugerida ? (
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors duration-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">local_shipping</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Envío en Tránsito: {grafoRutasRef.current.getPuntosDeEntrega()[rutaSugerida.origen]?.nombreCliente.split(" - ")[0]}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Recorrido: <span className="font-semibold text-slate-700">{grafoRutasRef.current.getPuntosDeEntrega()[rutaSugerida.origen]?.nombreCliente}</span> ➔ <span className="font-semibold text-slate-700">{grafoRutasRef.current.getPuntosDeEntrega()[rutaSugerida.destino]?.nombreCliente}</span>
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 animate-pulse">
                  EN CAMINO
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Distancia (Dijkstra): {grafoRutasRef.current.calcularMejorRuta(rutaSugerida.origen, rutaSugerida.destino)?.distanciaTotal} km</span>
                <span>Carga: {pedidosEnTransito.length} cajas</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 font-medium text-sm">
              <p>No hay despachos en curso en este momento.</p>
              <button 
                onClick={() => setCurrentTab('inventario')} 
                className="mt-2 text-xs text-primary font-bold hover:underline"
              >
                Preparar un despacho en el Inventario ➔
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - Activity Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Actividad Reciente del Almacén</h3>
            <p className="text-xs text-slate-400 mt-1">Registro detallado (Lista Enlazada - Nilda Romira)</p>
          </div>
          <div className="relative">
            <select className="appearance-none bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2 pr-8 focus:outline-none hover:bg-slate-100 transition-colors cursor-pointer">
              <option>Todos los eventos</option>
            </select>
            <span className="material-symbols-outlined text-slate-400 text-sm absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              keyboard_arrow_down
            </span>
          </div>
        </div>

        {/* Structured Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-4">Operación</th>
                <th className="pb-3">Detalle / Registro</th>
                <th className="pb-3">Cantidad</th>
                <th className="pb-3">Costo / Valor</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3 pr-4 text-right">Hora / Tiempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {historialRef.current.toArray().length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    No hay operaciones registradas en el historial.
                  </td>
                </tr>
              ) : (
                historialRef.current.toArray().map((act, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-4 font-bold text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          act.operacion.includes('Entrada') ? 'bg-emerald-50 text-emerald-600' :
                          act.operacion.includes('Salida') ? 'bg-blue-50 text-blue-600' :
                          'bg-purple-50 text-purple-600'
                        }`}>
                          <span className="material-symbols-outlined text-base">
                            {act.operacion.includes('Entrada') ? 'login' :
                             act.operacion.includes('Salida') ? 'logout' :
                             'person_add'}
                          </span>
                        </span>
                        {act.operacion}
                      </span>
                    </td>
                    <td className="py-4 text-slate-600 font-medium">{act.producto}</td>
                    <td className="py-4 text-slate-500 font-semibold">
                      {act.cantidad > 0 ? `${act.cantidad} unidades` : '-'}
                    </td>
                    <td className={`py-4 font-black ${act.costo > 0 ? (act.operacion.includes('Entrada') ? 'text-emerald-700' : 'text-blue-700') : 'text-slate-400'}`}>
                      {act.costo > 0 ? `₲ ${act.costo.toLocaleString('es-PY')}` : 'Gs. 0'}
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        act.estado === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        act.estado === 'EN CAMINO' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-purple-50 text-purple-700 border-purple-100'
                      }`}>
                        {act.estado}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right text-xs text-slate-400 font-bold">{act.hora}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const handleDespachoRuta = (extraidos: Producto[], idOrigen: string, idDestino: string) => {
    // 1. Cargamos los productos extraídos de la Cola en la "furgoneta virtual"
    setPedidosEnTransito([...pedidosEnTransito, ...extraidos]);
    
    // 2. Guardamos la ruta sugerida usando el ORIGEN real elegido por el usuario
    //    (ya no asumimos 'deposito_central', el usuario elige desde qué depósito sale)
    setRutaSugerida({ origen: idOrigen, destino: idDestino });
    
    // 3. Registrar en Historial (Lista Enlazada)
    const totalCosto = extraidos.reduce((sum, p) => sum + p.getPrecio(), 0);
    const primerProd = extraidos.length > 0 ? extraidos[0].getNombre() : 'Productos varios';
    const cod = extraidos.length > 0 ? extraidos[0].getCodigo() : '';
    historialRef.current.prepend({
      operacion: 'Salida Stock',
      producto: `${primerProd} (Cod: ${cod})`,
      cantidad: extraidos.length,
      costo: totalCosto,
      estado: 'EN CAMINO',
      hora: new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
    });

    // 4. Salto automático a la pestaña Rutas para ver el mapa
    setCurrentTab('rutas');
  };

  const renderInventario = () => {
    return <Inventario
      colaFisica={colaInventarioRef.current}
      tablaProductos={tablaProductosRef.current}
      nodosGrafo={grafoRutasRef.current.getPuntosDeEntrega()}
      onDespacharRuta={handleDespachoRuta}
    />;
  };

  const agregarDepositoTemp = () => {
    if (depositoTemp.nombre && depositoTemp.direccion) {
      setDepositosCliente([...depositosCliente, depositoTemp]);
      setDepositoTemp({ nombre: "", direccion: "", ciudad: "", barrio: "", coordenadas: { lat: -25.2637, lng: -57.5759 } });
    }
  };

  const renderClientes = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><User className="text-primary" /> Añadir Cliente</h2>
        {clienteError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm font-medium border border-red-200">
            {clienteError}
          </div>
        )}
        <form onSubmit={handleRegistrarCliente} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">Cédula / RUC</label>
              <input required value={clienteId} onChange={e => setClienteId(e.target.value)} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium">Teléfono</label>
              <input required value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full border p-2 rounded" /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">Nombre</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border p-2 rounded" /></div>
            <div><label className="block text-sm font-medium">Apellido</label>
              <input value={apellido} onChange={e => setApellido(e.target.value)} className="w-full border p-2 rounded" /></div>
          </div>

          <div><label className="block text-sm font-medium">Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" /></div>

          <div><label className="block text-sm font-medium">Dirección Principal</label>
            <input required value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full border p-2 rounded" /></div>

          {/* PARAMETRIZACIÓN: Modalidad de Negocio */}
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2">Clasificación de Negocio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600">Modalidad</label>
                <select
                  value={modalidadNegocio}
                  onChange={e => setModalidadNegocio(e.target.value as any)}
                  className="w-full border p-2 rounded bg-white"
                >
                  <option value="Emprendedor">Emprendedor</option>
                  <option value="MicroEmpresa">MicroEmpresa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Cant. Empleados</label>
                <select
                  value={modalidadNegocio === "Emprendedor" ? "1" : cantidadEmpleados}
                  onChange={e => setCantidadEmpleados(e.target.value)}
                  disabled={modalidadNegocio === "Emprendedor"}
                  className={`w-full border p-2 rounded bg-white ${modalidadNegocio === "Emprendedor" ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="1">1 (Solo)</option>
                  <option value="2-5">2 a 5</option>
                  <option value="6-10">6 a 10</option>
                  <option value="+10">Más de 10</option>
                </select>
              </div>
            </div>
          </div>

          {/* SUB-FORMULARIO: Múltiples Depósitos */}
          <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
            <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><Building className="w-4 h-4" /> Sucursales / Depósitos ({depositosCliente.length})</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input placeholder="Nombre (ej. Local Centro)" value={depositoTemp.nombre} onChange={e => setDepositoTemp({ ...depositoTemp, nombre: e.target.value })} className="border p-2 rounded text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              <input placeholder="Dirección exacta" value={depositoTemp.direccion} onChange={e => setDepositoTemp({ ...depositoTemp, direccion: e.target.value })} className="border p-2 rounded text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              <input placeholder="Ciudad" value={depositoTemp.ciudad} onChange={e => setDepositoTemp({ ...depositoTemp, ciudad: e.target.value })} className="border p-2 rounded text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              <input placeholder="Barrio" value={depositoTemp.barrio} onChange={e => setDepositoTemp({ ...depositoTemp, barrio: e.target.value })} className="border p-2 rounded text-sm outline-none focus:ring-1 focus:ring-orange-500" />
            </div>

            {/* MAPA INTERACTIVO ESTILO UBER */}
            <div className="mb-3">
              <label className="block text-sm font-bold text-orange-900 mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-orange-600" /> Ubicación exacta en el Mapa (Haz Clic)
              </label>
              <div className="h-48 rounded overflow-hidden border-2 border-orange-200 z-0 relative shadow-inner cursor-crosshair">
                <MapContainer center={[-25.2637, -57.5759]} zoom={12} className="w-full h-full z-0">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker
                    position={depositoTemp.coordenadas}
                    setPosition={(coords) => setDepositoTemp({ ...depositoTemp, coordenadas: coords })}
                  />
                </MapContainer>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-[10px] text-orange-600 italic">
                  Lat: {depositoTemp.coordenadas.lat.toFixed(5)}, Lng: {depositoTemp.coordenadas.lng.toFixed(5)}
                </p>
                <p className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded font-bold uppercase">Pin Actualizado</p>
              </div>
            </div>
            <button type="button" onClick={agregarDepositoTemp} className="bg-orange-200 text-orange-800 px-3 py-1 text-sm font-bold rounded hover:bg-orange-300 w-full mb-3">
              + Añadir Depósito al Cliente
            </button>

            {/* Lista temporal de depósitos */}
            {depositosCliente.length > 0 && (
              <ul className="text-xs space-y-1">
                {depositosCliente.map((d, i) => (
                  <li key={i} className="bg-white p-1 rounded border border-orange-100 font-mono text-orange-900">
                    • {d.nombre} ({d.ciudad} - {d.barrio})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button className="w-full bg-[#2E7D32] text-white py-3 rounded-lg font-bold hover:bg-green-800 shadow-md transition-transform active:scale-95">
            Guardar Cliente Oficial
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2"><Search className="w-5 h-5" /> Buscar Rápido (O(1))</h2>
          <div className="flex gap-2">
            <input value={buscarClienteId} onChange={e => setBuscarClienteId(e.target.value)} placeholder="Cédula/RUC" className="flex-1 border p-2 rounded" />
            <button onClick={handleBuscarCliente} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">Buscar</button>
          </div>
          {clienteEncontrado && (
            <div className="mt-4 bg-green-50 p-4 rounded border border-green-200 text-sm">
              <p><strong>ID Interno:</strong> <span className="font-mono text-green-700">{clienteEncontrado.getId()}</span></p>
              <p><strong>Nombre:</strong> {clienteEncontrado.getNombre()}</p>
              <p><strong>Dirección:</strong> {clienteEncontrado.getDireccion()}</p>
              <p><strong>Modalidad:</strong> {clienteEncontrado.getModalidadNegocio()} ({clienteEncontrado.getCantidadEmpleados()} emp.)</p>
              <p><strong>Depósitos:</strong> {clienteEncontrado.getDepositos().length} registrados</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96 overflow-y-auto">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Directorio Actual</h3>
          <div className="space-y-2">
            {tablaClientesRef.current.obtenerValores().map(c => (
              <div key={c.getId()} className="p-3 border rounded-lg text-sm bg-slate-50 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800">{c.getDocumento()}</span> - {c.getNombre()}
                  <div className="text-xs text-slate-500">{c.getModalidadNegocio()}</div>
                </div>
                <div className="text-xs font-mono bg-slate-200 px-2 py-1 rounded text-slate-700">
                  {c.getId()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRutas = () => {
    return <Rutas
      grafo={grafoRutasRef.current}
      pedidosEnTransito={pedidosEnTransito}
      rutaSugerida={rutaSugerida}
    />;
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex">
      {/* SideNavBar Component */}
      <aside className="fixed left-0 top-0 h-screen w-60 border-r border-slate-200 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.05)] font-['Inter'] antialiased z-50">
        <div className="flex flex-col h-full py-6">
          <div className="px-6 mb-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <img
                src={sidebarLogo}
                alt="Logistock"
                className="h-20 w-20 object-contain"
              />
            </div>
          </div>
          <div className="px-4 mb-6">
            <button onClick={() => setCurrentTab('inventario')} className="w-full bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors duration-200 py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <span className="material-symbols-outlined text-sm">add</span>
              Registrar Entrada
            </button>
          </div>
          <nav className="flex-1 flex flex-col gap-1 px-2">
            <button onClick={() => setCurrentTab('dashboard')} className={`flex w-full items-center gap-3 font-medium px-4 py-3 transition-all duration-200 rounded-lg ${currentTab === 'dashboard' ? 'text-primary font-bold border-r-4 border-primary bg-primary-container/25 rounded-l-lg rounded-r-none' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`}>
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </button>
            <button onClick={() => setCurrentTab('inventario')} className={`flex w-full items-center gap-3 font-medium px-4 py-3 transition-all duration-200 rounded-lg ${currentTab === 'inventario' ? 'text-primary font-bold border-r-4 border-primary bg-primary-container/25 rounded-l-lg rounded-r-none' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`}>
              <span className="material-symbols-outlined">inventory_2</span>
              <span>Inventario</span>
            </button>
            <button onClick={() => setCurrentTab('rutas')} className={`flex w-full items-center gap-3 font-medium px-4 py-3 transition-all duration-200 rounded-lg ${currentTab === 'rutas' ? 'text-primary font-bold border-r-4 border-primary bg-primary-container/25 rounded-l-lg rounded-r-none' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`}>
              <span className="material-symbols-outlined">local_shipping</span>
              <span>Rutas</span>
            </button>
            <button onClick={() => setCurrentTab('clientes')} className={`flex w-full items-center gap-3 font-medium px-4 py-3 transition-all duration-200 rounded-lg ${currentTab === 'clientes' ? 'text-primary font-bold border-r-4 border-primary bg-primary-container/25 rounded-l-lg rounded-r-none' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`}>
              <span className="material-symbols-outlined">groups</span>
              <span>Clientes</span>
            </button>
          </nav>
          <div className="mt-auto px-2 flex flex-col gap-1 pt-6 border-t border-slate-200 mx-4">
            <button className="flex w-full items-center gap-3 text-slate-600 font-medium px-4 py-3 hover:text-primary hover:bg-slate-50 transition-all duration-200 rounded-lg">
              <span className="material-symbols-outlined">settings</span>
              <span>Configuración</span>
            </button>
            <button className="flex w-full items-center gap-3 text-slate-600 font-medium px-4 py-3 hover:text-primary hover:bg-slate-50 transition-all duration-200 rounded-lg">
              <span className="material-symbols-outlined">logout</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* TopNavBar Component */}
        <header className="sticky top-0 right-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 font-['Inter'] text-sm font-medium">
          <div className="flex justify-between items-center h-16 px-8">
            <div className="flex items-center gap-4">
              <span className="text-h2 font-h2 text-on-surface capitalize">{currentTab}</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-slate-500 hover:bg-slate-100 rounded-full p-2 transition-colors active:opacity-70">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="text-slate-500 hover:bg-slate-100 rounded-full p-2 transition-colors active:opacity-70">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
              <button className="text-slate-500 hover:bg-slate-100 rounded-full p-2 transition-colors active:opacity-70 ml-2">
                <User className="w-5 h-5" aria-label="Usuario" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-xl">
          {currentTab === 'dashboard' && renderDashboard()}
          {currentTab === 'inventario' && renderInventario()}
          {currentTab === 'rutas' && renderRutas()}
          {currentTab === 'clientes' && renderClientes()}
        </main>
      </div>
    </div>
  );
}
