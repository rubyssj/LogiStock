import React, { useState, useRef, FormEvent, useEffect } from "react";
import { Cola, ColaInventario } from "./lib/dataStructures/colaInventario";
import Inventario from './pages/Inventario';
import { TablaHash } from "./lib/dataStructures/tablaHash";
import { GrafoLogistica } from "./lib/dataStructures/grafoLogistica";
import { Cliente, Pedido, Producto } from "./models";
import { generador } from "./utils/generadorIds";
import { PackageOpen, Map as MapIcon, Truck, Search, PlusCircle, CheckCircle, Package, LayoutDashboard, Users, MapPin, User, Building } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Rutas from './pages/Rutas';
import sidebarLogo from "./assets/logotransparente.png";

// Fix leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type TabType = 'dashboard' | 'inventario' | 'rutas' | 'clientes';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  const colaPedidosRef = useRef(new Cola<Pedido>());
  const colaInventarioRef = useRef(new ColaInventario());
  const tablaClientesRef = useRef(new TablaHash<Cliente>());
  const grafoRutasRef = useRef(new GrafoLogistica());

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
  const [depositosCliente, setDepositosCliente] = useState<{ nombre: string, direccion: string, ciudad: string, barrio: string }[]>([]);
  const [depositoTemp, setDepositoTemp] = useState({ nombre: "", direccion: "", ciudad: "", barrio: "" });
  const [clienteError, setClienteError] = useState<string | null>(null);

  const [buscarClienteId, setBuscarClienteId] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null);

  // Cola de Despacho
  const [pedidosEnTransito, setPedidosEnTransito] = useState<Producto[]>([]);

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
  }, []);

  const handleIngresarLote = (e: FormEvent) => {
    e.preventDefault();
    if (!productoNombre || !productoPrecio || !productoCantidad) return;

    try {
      setProductoError(null);
      const prod = new Producto(productoNombre, "otros", parseFloat(productoPrecio), 1);
      colaInventarioRef.current.ingresarLote(prod, parseInt(productoCantidad));
      setProductoNombre(""); setProductoPrecio(""); setProductoCantidad("1");
      forceUpdate();
    } catch (error: any) {
      setProductoError(error.message);
    }
  };

  const handleRegistrarCliente = (e: FormEvent) => {
    e.preventDefault();
    if (!clienteId || !nombre || !direccion) return;

    const depositosFormales = depositosCliente.map(d => ({
      idNodo: generador.nuevoIdNodo(),
      nombre: d.nombre,
      direccion: d.direccion,
      ciudad: d.ciudad,
      barrio: d.barrio,
      coordenadas: { lat: -25.3 + (Math.random() * 0.1 - 0.05), lng: -57.6 + (Math.random() * 0.1 - 0.05) }
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
        grafoRutasRef.current.conectarPuntos("deposito_central", dep.idNodo, Math.floor(Math.random() * 20) + 1);
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
    <div className="max-w-container-max mx-auto">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
        {/* Card 1 */}
        <div className="bg-surface-container-lowest p-lg rounded-lg border border-outline-variant shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Total Productos</p>
              <h3 className="text-h1 font-h1 text-on-surface mt-1">{colaInventarioRef.current.mapearStockActual().length}</h3>
            </div>
            <div className="p-2 bg-primary-container/10 rounded-full text-primary">
              <span className="material-symbols-outlined">inventory</span>
            </div>
          </div>
          <div className="flex items-center text-sm text-primary font-medium mt-2">
            <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
            <span>+12% esta semana</span>
          </div>
        </div>
        {/* Card 2 */}
        <div className="bg-surface-container-lowest p-lg rounded-lg border border-outline-variant shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Pedidos Pendientes</p>
              <h3 className="text-h1 font-h1 text-on-surface mt-1">15</h3>
            </div>
            <div className="p-2 bg-tertiary-container/10 rounded-full text-tertiary">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
          </div>
          <div className="flex items-center text-sm text-outline font-medium mt-2">
            <span className="material-symbols-outlined text-sm mr-1">schedule</span>
            <span>Requiere atención</span>
          </div>
        </div>
        {/* Card 3 */}
        <div className="bg-surface-container-lowest p-lg rounded-lg border border-outline-variant shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Nodos de Ruta</p>
              <h3 className="text-h1 font-h1 text-on-surface mt-1">{Object.keys((grafoRutasRef.current as any).puntos).length}</h3>
            </div>
            <div className="p-2 bg-primary-container/10 rounded-full text-primary">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
          </div>
          <div className="flex items-center text-sm text-outline font-medium mt-2">
            <span className="material-symbols-outlined text-sm mr-1">route</span>
            <span>Nodos mapeados en el grafo</span>
          </div>
        </div>
        {/* Card 4 */}
        <div className="bg-surface-container-lowest p-lg rounded-lg border border-outline-variant shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Clientes Hash Table</p>
              <h3 className="text-h1 font-h1 text-on-surface mt-1">{tablaClientesRef.current.obtenerClaves().length}</h3>
            </div>
            <div className="p-2 bg-primary-container/10 rounded-full text-primary">
              <span className="material-symbols-outlined">groups</span>
            </div>
          </div>
          <div className="flex items-center text-sm text-primary font-medium mt-2">
            <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
            <span>+3 este mes</span>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Actividad Reciente (Bento Grid Style) */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-h3 font-h3 text-on-surface">Actividad Reciente</h3>
            <button className="text-sm font-medium text-primary hover:text-primary transition-colors">Ver todo</button>
          </div>
          <div className="space-y-4">
            {/* Log Entry 1 */}
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-surface-container-low transition-colors duration-200 border border-transparent hover:border-surface-variant">
              <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-md">add_box</span>
              </div>
              <div className="flex-1">
                <h4 className="text-body-lg font-body-lg text-on-surface font-medium">Entrada de Mercadería - Código #A102</h4>
                <p className="text-body-md font-body-md text-on-surface-variant mt-1">Se recibieron 50 unidades de Yerba Mate 'El Campesino'.</p>
              </div>
              <div className="text-label-sm font-label-sm text-outline text-right">
                <span>Hace 2h</span>
              </div>
            </div>
            {/* Log Entry 2 */}
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-surface-container-low transition-colors duration-200 border border-transparent hover:border-surface-variant">
              <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-md">route</span>
              </div>
              <div className="flex-1">
                <h4 className="text-body-lg font-body-lg text-on-surface font-medium">Ruta a Asunción Iniciada</h4>
                <p className="text-body-md font-body-md text-on-surface-variant mt-1">Vehículo PY-104 en camino con 12 pedidos.</p>
              </div>
              <div className="text-label-sm font-label-sm text-outline text-right">
                <span>Hace 4h</span>
              </div>
            </div>
            {/* Log Entry 3 */}
            <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-surface-container-low transition-colors duration-200 border border-transparent hover:border-surface-variant">
              <div className="w-10 h-10 rounded-full bg-tertiary-container/10 flex items-center justify-center text-tertiary flex-shrink-0">
                <span className="material-symbols-outlined text-md">warning</span>
              </div>
              <div className="flex-1">
                <h4 className="text-body-lg font-body-lg text-on-surface font-medium">Stock Bajo Detectado</h4>
                <p className="text-body-md font-body-md text-on-surface-variant mt-1">Aceite de Soja 'Soja Linda' por debajo del mínimo (5 unidades).</p>
              </div>
              <div className="text-label-sm font-label-sm text-outline text-right">
                <span>Ayer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions / Status */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
          <h3 className="text-h3 font-h3 text-on-surface mb-6">Estado del Sistema</h3>
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-body-md font-body-md text-on-surface">Capacidad del Depósito</span>
              <span className="text-body-md font-body-md text-on-surface font-medium">78%</span>
            </div>
            <div className="w-full bg-surface-variant rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Acciones Rápidas</h4>
            <button className="w-full flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:border-primary-container hover:bg-surface-container-low transition-colors text-left group">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">qr_code_scanner</span>
                <span className="text-body-md font-body-md text-on-surface font-medium">Escanear Código</span>
              </div>
              <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-sm">chevron_right</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 border border-outline-variant rounded-lg hover:border-primary-container hover:bg-surface-container-low transition-colors text-left group">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">description</span>
                <span className="text-body-md font-body-md text-on-surface font-medium">Generar Reporte</span>
              </div>
              <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInventario = () => {
    return <Inventario colaFisica={colaInventarioRef.current} />;
  };

  const agregarDepositoTemp = (e: FormEvent) => {
    e.preventDefault();
    if (!depositoTemp.nombre || !depositoTemp.direccion) return;
    setDepositosCliente([...depositosCliente, depositoTemp]);
    setDepositoTemp({ nombre: "", direccion: "", ciudad: "", barrio: "" });
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
              <input placeholder="Nombre (ej. Local Centro)" value={depositoTemp.nombre} onChange={e => setDepositoTemp({ ...depositoTemp, nombre: e.target.value })} className="border p-2 rounded text-sm" />
              <input placeholder="Dirección exacta" value={depositoTemp.direccion} onChange={e => setDepositoTemp({ ...depositoTemp, direccion: e.target.value })} className="border p-2 rounded text-sm" />
              <input placeholder="Ciudad" value={depositoTemp.ciudad} onChange={e => setDepositoTemp({ ...depositoTemp, ciudad: e.target.value })} className="border p-2 rounded text-sm" />
              <input placeholder="Barrio" value={depositoTemp.barrio} onChange={e => setDepositoTemp({ ...depositoTemp, barrio: e.target.value })} className="border p-2 rounded text-sm" />
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
          {currentTab === 'rutas' && <Rutas grafo={grafoRutasRef.current} pedidosEnTransito={pedidosEnTransito} />}
          {currentTab === 'clientes' && renderClientes()}
        </main>
      </div>
    </div>
  );
}
