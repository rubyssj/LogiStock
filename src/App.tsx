import React, { useState, useRef, FormEvent, useEffect } from "react";
import { Cola, ColaInventario } from "./lib/dataStructures/colaInventario";
import { TablaHashInventario } from "./lib/dataStructures/tablaHashInventario";
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

type TabType = 'dashboard' | 'inventario' | 'rutas' | 'clientes' | 'pedidos';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  const colaPedidosRef = useRef(new Cola<Pedido>());
  const colaInventarioRef = useRef(new ColaInventario());
  const tablaProductosRef = useRef(new TablaHashInventario());
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

  // Estados del Formulario de Pedidos (Mockup Multi-producto)
  const [pedidosEnTransito, setPedidosEnTransito] = useState<Producto[]>([]);
  const [pedidoClienteId, setPedidoClienteId] = useState("");
  const [pedidoLineas, setPedidoLineas] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [pedidoTelefono, setPedidoTelefono] = useState("");
  const [pedidoDireccion, setPedidoDireccion] = useState("");
  const [pedidoObservaciones, setPedidoObservaciones] = useState("");
  const [pedidoFecha, setPedidoFecha] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [pedidoCreadoPor] = useState("Admin");
  const [pedidosTabActiveSection, setPedidosTabActiveSection] = useState<'crear' | 'historial'>('crear');
  const [listaPedidos, setListaPedidos] = useState<any[]>([]);

  // Estados auxiliares para los buscadores de la pestaña Pedidos
  const [clienteBusquedaQuery, setClienteBusquedaQuery] = useState("");
  const [clienteDropdownAbierto, setClienteDropdownAbierto] = useState(false);
  const [productoBusquedaQuery, setProductoBusquedaQuery] = useState("");
  const [productoDropdownAbierto, setProductoDropdownAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1);


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
      tablaProductosRef.current.registrar(prod);
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

  const handleRegistrarPedido = (e: FormEvent) => {
    e.preventDefault();

    if (!pedidoClienteId) {
      alert("⚠️ Error: Debe seleccionar un cliente.");
      return;
    }

    const client = tablaClientesRef.current.buscar(pedidoClienteId);
    if (!client) {
      alert("⚠️ Error: Cliente no encontrado.");
      return;
    }

    if (pedidoLineas.length === 0) {
      alert("⚠️ Error: Debe agregar al menos un producto al pedido.");
      return;
    }

    // Validar stock de todos los productos en el pedido
    const stockActual = colaInventarioRef.current.mapearStockActual();
    const stockPorCodigo: { [codigo: string]: number } = {};
    for (const prod of stockActual) {
      stockPorCodigo[prod.getCodigo()] = (stockPorCodigo[prod.getCodigo()] || 0) + 1;
    }

    for (const linea of pedidoLineas) {
      const disponible = stockPorCodigo[linea.producto.getCodigo()] || 0;
      if (linea.cantidad > disponible) {
        alert(`⚠️ Error: Stock insuficiente para "${linea.producto.getNombre()}". Requerido: ${linea.cantidad}, Disponible: ${disponible}`);
        return;
      }
    }

    // Dar de baja del stock en la cola física (FIFO por producto)
    for (const linea of pedidoLineas) {
      colaInventarioRef.current.despacharProductoEspecifico(linea.producto.getCodigo(), linea.cantidad);
    }

    // Calcular totales
    const subtotal = pedidoLineas.reduce((sum, item) => sum + item.producto.getPrecio() * item.cantidad, 0);
    const iva = Math.round(subtotal * 0.10);
    const total = subtotal + iva;

    // Registrar el pedido
    const nuevoPedido = {
      id: `PED-${Date.now()}`,
      cliente: {
        id: client.getId(),
        nombre: client.getNombre(),
        documento: client.getDocumento(),
        telefono: pedidoTelefono || client.getTelefono(),
        direccion: pedidoDireccion || client.getDireccion(),
      },
      lineas: pedidoLineas.map(linea => ({
        productoCodigo: linea.producto.getCodigo(),
        nombre: linea.producto.getNombre(),
        precio: linea.producto.getPrecio(),
        cantidad: linea.cantidad,
      })),
      subtotal,
      iva,
      total,
      observaciones: pedidoObservaciones,
      fecha: pedidoFecha.replace('T', ' '),
      estado: "Pendiente",
      creadoPor: pedidoCreadoPor,
    };

    setListaPedidos([...listaPedidos, nuevoPedido]);

    // Limpiar el formulario
    setPedidoClienteId("");
    setPedidoLineas([]);
    setPedidoTelefono("");
    setPedidoDireccion("");
    setPedidoObservaciones("");
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setPedidoFecha(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);

    alert("✅ Pedido registrado con éxito y stock actualizado.");
    forceUpdate();
  };


  const renderDashboard = () => (
    <div className="max-w-container-max mx-auto space-y-6">
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
        {/* Card 1: Total Productos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          {/* Fila Superior */}
          <div className="flex justify-between items-center mb-2">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">inventory</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +12% esta semana
            </span>
          </div>
          {/* Fila Media e Inferior */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Productos</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{colaInventarioRef.current.mapearStockActual().length}</h3>
            </div>
            {/* Sparkline (Green) */}
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

        {/* Card 2: Pedidos Pendientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          {/* Fila Superior */}
          <div className="flex justify-between items-center mb-2">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">pending_actions</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
              <span className="material-symbols-outlined text-xs">schedule</span>
              Requiere atención
            </span>
          </div>
          {/* Fila Media e Inferior */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pedidos Pendientes</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">
                {listaPedidos.filter(p => p.estado.toLowerCase() === 'pendiente').length}
              </h3>

            </div>
            {/* Sparkline (Orange) */}
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
          {/* Fila Superior */}
          <div className="flex justify-between items-center mb-2">
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
              <span className="material-symbols-outlined text-xs">route</span>
              Pedidos en ruta
            </span>
          </div>
          {/* Fila Media e Inferior */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nodos de Ruta</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{Object.keys((grafoRutasRef.current as any).puntos).length}</h3>
            </div>
            {/* Sparkline (Blue) */}
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
          {/* Fila Superior */}
          <div className="flex justify-between items-center mb-2">
            <div className="w-10 h-10 bg-fuchsia-50 text-fuchsia-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">groups</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-fuchsia-50 text-fuchsia-700 rounded-full border border-fuchsia-100">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +3 este mes
            </span>
          </div>
          {/* Fila Media e Inferior */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clientes Hash Table</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{tablaClientesRef.current.obtenerClaves().length}</h3>
            </div>
            {/* Sparkline (Purple/Pink) */}
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

      {/* Central Section - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Capacidad del Depósito */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Capacidad del Depósito</h3>
            <p className="text-xs text-slate-400 mt-1">Uso de espacio físico total</p>
          </div>

          {/* Donut Chart */}
          <div className="flex justify-center items-center my-6 relative w-44 h-44 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
              {/* Background circle */}
              <circle
                cx="90"
                cy="90"
                r="74"
                stroke="#f1f5f9"
                strokeWidth="16"
                fill="transparent"
              />
              {/* Foreground circle */}
              <circle
                cx="90"
                cy="90"
                r="74"
                stroke="#16a34a"
                strokeWidth="16"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 74}
                strokeDashoffset={2 * Math.PI * 74 * (1 - 0.78)}
                strokeLinecap="round"
              />
            </svg>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800 leading-none">78%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ocupado</span>
            </div>
          </div>

          {/* Available / Total Labels */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 text-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disponible</p>
              <p className="text-base font-black text-slate-700 mt-1">1.100 m²</p>
            </div>
            <div className="border-l border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
              <p className="text-base font-black text-slate-700 mt-1">5.000 m²</p>
            </div>
          </div>
        </div>

        {/* Column 2: Rutas Críticas en Progreso */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Rutas Críticas en Progreso</h3>
              <p className="text-xs text-slate-400 mt-1">Seguimiento de flota en tiempo real</p>
            </div>
            <button
              onClick={() => setCurrentTab('rutas')}
              className="text-xs font-bold text-primary hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Ver mapa de flota
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          {/* Route Cards */}
          <div className="space-y-4">
            {/* Route Card 1 */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors duration-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">local_shipping</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Camión #402 - Ruta Asunción/CDE</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Conductor: Carlos Martínez</p>
                  </div>
                </div>
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                  En Tiempo
                </span>
              </div>
              {/* Progress Line */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '70%' }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Partida: 06:00 AM</span>
                <span>Llegada Est.: 02:30 PM</span>
              </div>
            </div>

            {/* Route Card 2 */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors duration-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">local_shipping</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Camión #115 - Distribución Urbana</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Conductor: Luis Ferreira</p>
                  </div>
                </div>
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                  Demorado (15m)
                </span>
              </div>
              {/* Progress Line */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Partida: 08:00 AM</span>
                <span>Llegada Est.: 11:45 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Activity Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Actividad Reciente del Almacén</h3>
            <p className="text-xs text-slate-400 mt-1">Registro detallado de las últimas operaciones físicas</p>
          </div>
          {/* Dropdown Selector */}
          <div className="relative">
            <select className="appearance-none bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2 pr-8 focus:outline-none hover:bg-slate-100 transition-colors cursor-pointer">
              <option>Todos los eventos</option>
              <option>Entradas</option>
              <option>Salidas</option>
              <option>Alertas</option>
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
                <th className="pb-3">Producto</th>
                <th className="pb-3">Cantidad</th>
                <th className="pb-3">Costo / Valor</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3 pr-4 text-right">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {/* Row 1 */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 pl-4 font-bold text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">login</span>
                    </span>
                    Entrada Stock
                  </span>
                </td>
                <td className="py-4 text-slate-600 font-medium">Yerba Mate 'El Campesino' (Código #A102)</td>
                <td className="py-4 text-slate-500 font-semibold">50 unidades</td>
                <td className="py-4 text-emerald-700 font-black">₲ 1.250.000</td>
                <td className="py-4">
                  <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    COMPLETADO
                  </span>
                </td>
                <td className="py-4 pr-4 text-right text-xs text-slate-400 font-bold">Hace 2h</td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 pl-4 font-bold text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">logout</span>
                    </span>
                    Salida Stock
                  </span>
                </td>
                <td className="py-4 text-slate-600 font-medium">Yerba Mate 'El Campesino' (Código #A102)</td>
                <td className="py-4 text-slate-500 font-semibold">12 unidades</td>
                <td className="py-4 text-rose-700 font-black">₲ 300.000</td>
                <td className="py-4">
                  <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                    EN PROCESO
                  </span>
                </td>
                <td className="py-4 pr-4 text-right text-xs text-slate-400 font-bold">Hace 4h</td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 pl-4 font-bold text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">warning</span>
                    </span>
                    Alerta Stock
                  </span>
                </td>
                <td className="py-4 text-slate-600 font-medium">Aceite de Soja 'Soja Linda' (Código #S302)</td>
                <td className="py-4 text-slate-500 font-semibold">5 unidades</td>
                <td className="py-4 text-slate-500 font-black">₲ 75.000</td>
                <td className="py-4">
                  <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-100">
                    ALERTA
                  </span>
                </td>
                <td className="py-4 pr-4 text-right text-xs text-slate-400 font-bold">Ayer</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventario = () => {
    return <Inventario colaFisica={colaInventarioRef.current} tablaProductos={tablaProductosRef.current} />;
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

  const renderPedidos = () => {
    // List of all clients
    const clientes = tablaClientesRef.current.obtenerValores();
    // List of all catalog products
    const productosCatalogo = tablaProductosRef.current.listarCatalogo();
    // Physical stock list
    const stockFisico = colaInventarioRef.current.mapearStockActual();

    // Group stock by product code for real-time inventory checking
    const stockPorCodigo: { [codigo: string]: number } = {};
    for (const prod of stockFisico) {
      stockPorCodigo[prod.getCodigo()] = (stockPorCodigo[prod.getCodigo()] || 0) + 1;
    }

    // Filter clients for searchable dropdown
    const clientesFiltrados = clientes.filter(c =>
      c.getNombre().toLowerCase().includes(clienteBusquedaQuery.toLowerCase()) ||
      c.getDocumento().includes(clienteBusquedaQuery)
    );

    // Filter products for searchable dropdown
    const productosFiltrados = productosCatalogo.filter(p =>
      p.getNombre().toLowerCase().includes(productoBusquedaQuery.toLowerCase()) ||
      p.getCodigo().toLowerCase().includes(productoBusquedaQuery.toLowerCase())
    );

    // Check if stock is sufficient for all lines in the order
    const stockSuficienteParaTodo = pedidoLineas.every(linea => {
      const disponible = stockPorCodigo[linea.producto.getCodigo()] || 0;
      return linea.cantidad <= disponible;
    });

    // Subtotal, IVA, Total calculations
    const subtotal = pedidoLineas.reduce((sum, item) => sum + item.producto.getPrecio() * item.cantidad, 0);
    const iva = Math.round(subtotal * 0.10);
    const total = subtotal + iva;

    // Helper to add a product to the line items
    const handleAgregarProducto = () => {
      if (!productoSeleccionado) {
        alert("⚠️ Seleccione un producto para agregar.");
        return;
      }
      if (cantidadSeleccionada <= 0) {
        alert("⚠️ La cantidad debe ser mayor a cero.");
        return;
      }

      // Check if product already added
      const indiceExistente = pedidoLineas.findIndex(item => item.producto.getCodigo() === productoSeleccionado.getCodigo());
      if (indiceExistente !== -1) {
        const nuevasLineas = [...pedidoLineas];
        nuevasLineas[indiceExistente].cantidad += cantidadSeleccionada;
        setPedidoLineas(nuevasLineas);
      } else {
        setPedidoLineas([...pedidoLineas, { producto: productoSeleccionado, cantidad: cantidadSeleccionada }]);
      }

      // Reset selection
      setProductoSeleccionado(null);
      setProductoBusquedaQuery("");
      setCantidadSeleccionada(1);
    };

    // Helper to increment/decrement quantity in the table
    const handleActualizarCantidadLinea = (codigo: string, delta: number) => {
      const nuevasLineas = pedidoLineas.map(linea => {
        if (linea.producto.getCodigo() === codigo) {
          const nuevaCantidad = linea.cantidad + delta;
          return { ...linea, cantidad: nuevaCantidad > 0 ? nuevaCantidad : 1 };
        }
        return linea;
      });
      setPedidoLineas(nuevasLineas);
    };

    // Helper to remove an item from the table
    const handleEliminarLinea = (codigo: string) => {
      setPedidoLineas(pedidoLineas.filter(linea => linea.producto.getCodigo() !== codigo));
    };

    // Clear form helper
    const handleCancelarForm = () => {
      setPedidoClienteId("");
      setPedidoLineas([]);
      setPedidoTelefono("");
      setPedidoDireccion("");
      setPedidoObservaciones("");
      setClienteBusquedaQuery("");
      setProductoBusquedaQuery("");
      setProductoSeleccionado(null);
      setCantidadSeleccionada(1);
      alert("Formulario cancelado y limpiado.");
    };

    return (
      <div className="max-w-[1280px] mx-auto space-y-6">
        {/* Toggle sub-pestañas */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPedidosTabActiveSection('crear')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${pedidosTabActiveSection === 'crear' ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              Crear Nuevo Pedido
            </button>
            <button
              onClick={() => setPedidosTabActiveSection('historial')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${pedidosTabActiveSection === 'historial' ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              Historial de Pedidos ({listaPedidos.length})
            </button>
          </div>
        </div>

        {pedidosTabActiveSection === 'crear' ? (
          <div className="space-y-6">
            {/* Cabecera del formulario */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-2xl">shopping_cart</span>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Crear Nuevo Pedido</h1>
              </div>
            </div>

            {/* Layout dos columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Columna Izquierda (2/3 de ancho) */}
              <div className="lg:col-span-2 space-y-6">

                {/* 1. Información del Cliente */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-50 pb-2">
                    <span className="material-symbols-outlined text-emerald-600">person</span>
                    <span>1. Información del Cliente</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cliente dropdown search */}
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Cliente <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-1">
                        <div className="relative flex-1">
                          <button
                            type="button"
                            onClick={() => setClienteDropdownAbierto(!clienteDropdownAbierto)}
                            className="w-full text-left border border-slate-200 text-sm rounded-xl px-4 py-2.5 bg-white text-slate-700 hover:border-slate-300 transition-colors flex justify-between items-center cursor-pointer"
                          >
                            <span className="truncate">
                              {pedidoClienteId
                                ? (clientes.find(c => c.getId() === pedidoClienteId)?.getNombre() || "Seleccione un cliente")
                                : "Seleccione un cliente"}
                            </span>
                            <span className="material-symbols-outlined text-slate-400 text-sm">keyboard_arrow_down</span>
                          </button>

                          {clienteDropdownAbierto && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 space-y-2 max-h-60 overflow-y-auto">
                              <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={clienteBusquedaQuery}
                                onChange={(e) => setClienteBusquedaQuery(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                              />
                              <div className="divide-y divide-slate-50">
                                {clientesFiltrados.length === 0 ? (
                                  <div className="p-2 text-xs text-slate-400 italic text-center">No se encontraron clientes</div>
                                ) : (
                                  clientesFiltrados.map(c => (
                                    <button
                                      key={c.getId()}
                                      type="button"
                                      onClick={() => {
                                        setPedidoClienteId(c.getId());
                                        setPedidoTelefono(c.getTelefono());
                                        setPedidoDireccion(c.getDireccion());
                                        setClienteDropdownAbierto(false);
                                        setClienteBusquedaQuery("");
                                      }}
                                      className="w-full text-left p-2 text-xs hover:bg-slate-50 rounded-lg transition-colors flex justify-between items-center"
                                    >
                                      <div>
                                        <div className="font-bold text-slate-700">{c.getNombre()}</div>
                                        <div className="text-[10px] text-slate-400">RUC/CI: {c.getDocumento()}</div>
                                      </div>
                                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{c.getId()}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setClienteDropdownAbierto(true);
                          }}
                          className="shrink-0 flex items-center justify-center w-10 border border-emerald-600 rounded-xl bg-white hover:bg-emerald-50 text-emerald-600 transition cursor-pointer"
                          title="Buscar cliente"
                        >
                          <span className="material-symbols-outlined text-lg">search</span>
                        </button>
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teléfono</label>
                      <input
                        type="text"
                        value={pedidoTelefono}
                        onChange={(e) => setPedidoTelefono(e.target.value)}
                        placeholder="Ej: 0981 123 456"
                        className="w-full border border-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Dirección */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dirección</label>
                      <input
                        type="text"
                        value={pedidoDireccion}
                        onChange={(e) => setPedidoDireccion(e.target.value)}
                        placeholder="Ej: Asunción, Barrio Villa Morra"
                        className="w-full border border-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Productos del Pedido */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-50 pb-2">
                    <span className="material-symbols-outlined text-emerald-600">package</span>
                    <span>2. Productos del Pedido</span>
                  </div>

                  {/* Fila agregador */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                    {/* Producto Select Buscable */}
                    <div className="md:col-span-7 relative">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Producto</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setProductoDropdownAbierto(!productoDropdownAbierto)}
                          className="w-full text-left border border-slate-200 text-sm rounded-xl px-4 py-2.5 bg-white text-slate-700 hover:border-slate-300 transition-colors flex justify-between items-center cursor-pointer"
                        >
                          <span className="truncate text-slate-600 text-left">
                            {productoSeleccionado
                              ? `${productoSeleccionado.getNombre()} (${productoSeleccionado.getCodigo()})`
                              : "Buscar producto por nombre o código..."}
                          </span>
                          <span className="material-symbols-outlined text-slate-400 text-sm">keyboard_arrow_down</span>
                        </button>

                        {productoDropdownAbierto && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 space-y-2 max-h-60 overflow-y-auto">
                            <input
                              type="text"
                              placeholder="Buscar producto por nombre o código..."
                              value={productoBusquedaQuery}
                              onChange={(e) => setProductoBusquedaQuery(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                            />
                            <div className="divide-y divide-slate-50">
                              {productosFiltrados.length === 0 ? (
                                <div className="p-2 text-xs text-slate-400 italic text-center">No se encontraron productos</div>
                              ) : (
                                productosFiltrados.map(p => {
                                  const enCola = stockPorCodigo[p.getCodigo()] || 0;
                                  return (
                                    <button
                                      key={p.getCodigo()}
                                      type="button"
                                      onClick={() => {
                                        setProductoSeleccionado(p);
                                        setProductoDropdownAbierto(false);
                                        setProductoBusquedaQuery("");
                                      }}
                                      className="w-full text-left p-2 text-xs hover:bg-slate-50 rounded-lg transition-colors flex justify-between items-center"
                                    >
                                      <div>
                                        <div className="font-bold text-slate-700">{p.getNombre()}</div>
                                        <div className="text-[10px] text-slate-400">Cod: {p.getCodigo()} | Precio: Gs. {p.getPrecio().toLocaleString('es-PY')}</div>
                                      </div>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${enCola > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                        Stock: {enCola}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selector de cantidad */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cantidad</label>
                      <div className="flex items-center border border-slate-200 rounded-xl bg-white h-[42px] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setCantidadSeleccionada(c => Math.max(1, c - 1))}
                          className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">remove</span>
                        </button>
                        <input
                          type="number"
                          value={cantidadSeleccionada}
                          onChange={(e) => setCantidadSeleccionada(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 text-center font-bold text-slate-800 border-none outline-none focus:ring-0 text-sm h-full w-full"
                          min="1"
                        />
                        <button
                          type="button"
                          onClick={() => setCantidadSeleccionada(c => c + 1)}
                          className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">add</span>
                        </button>
                      </div>
                    </div>

                    {/* Botón Agregar */}
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleAgregarProducto}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl px-4 py-2.5 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer h-[42px]"
                      >
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>

                  {/* Tabla de productos agregados */}
                  {pedidoLineas.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50 mt-4">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="p-3 pl-4 text-center">#</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3">Código</th>
                            <th className="p-3 text-right">Precio Unit.</th>
                            <th className="p-3 text-center">Cantidad</th>
                            <th className="p-3 text-right">Subtotal</th>
                            <th className="p-3 pr-4 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-slate-700 bg-white">
                          {pedidoLineas.map((linea, index) => {
                            const cod = linea.producto.getCodigo();
                            const disp = stockPorCodigo[cod] || 0;
                            const stockInsuficiente = linea.cantidad > disp;
                            return (
                              <tr
                                key={cod}
                                className={`hover:bg-slate-50/50 transition-colors ${stockInsuficiente ? 'bg-red-50/40 hover:bg-red-50/60' : ''}`}
                              >
                                <td className="p-3 pl-4 text-center font-semibold text-slate-400">{index + 1}</td>
                                <td className="p-3 font-semibold text-slate-800">
                                  <div>{linea.producto.getNombre()}</div>
                                  {stockInsuficiente && (
                                    <div className="text-[10px] text-red-500 font-medium mt-0.5">⚠️ Stock en bodega: {disp} cajas</div>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-slate-500">{cod}</td>
                                <td className="p-3 text-right font-medium">Gs. {linea.producto.getPrecio().toLocaleString('es-PY')}</td>
                                <td className="p-3 text-center">
                                  <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() => handleActualizarCantidadLinea(cod, -1)}
                                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 text-slate-500"
                                    >
                                      <span className="material-symbols-outlined text-[10px] font-bold">remove</span>
                                    </button>
                                    <span className="w-8 text-center font-bold text-slate-800 text-xs">{linea.cantidad}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleActualizarCantidadLinea(cod, 1)}
                                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-50 text-slate-500"
                                    >
                                      <span className="material-symbols-outlined text-[10px] font-bold">add</span>
                                    </button>
                                  </div>
                                </td>
                                <td className="p-3 text-right font-black text-slate-800">
                                  Gs. {(linea.producto.getPrecio() * linea.cantidad).toLocaleString('es-PY')}
                                </td>
                                <td className="p-3 pr-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarLinea(cod)}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Quitar"
                                  >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-xs">
                      No hay productos agregados a la lista.
                    </div>
                  )}

                  {/* Banner de estado de stock */}
                  {pedidoLineas.length > 0 && (
                    <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${stockSuficienteParaTodo
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-150'
                        : 'bg-red-50 text-red-800 border-red-150'
                      }`}>
                      <span className="material-symbols-outlined text-lg">
                        {stockSuficienteParaTodo ? 'check_circle' : 'warning'}
                      </span>
                      <span>
                        {stockSuficienteParaTodo
                          ? 'Stock disponible para todos los productos.'
                          : 'Hay productos en la lista que superan el stock disponible en bodega.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Observaciones (Opcional) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-50 pb-2">
                    <span className="material-symbols-outlined text-emerald-600">chat</span>
                    <span>3. Observaciones (Opcional)</span>
                  </div>

                  <div className="relative">
                    <textarea
                      value={pedidoObservaciones}
                      onChange={(e) => setPedidoObservaciones(e.target.value.slice(0, 300))}
                      placeholder="Ingrese observaciones adicionales sobre el pedido..."
                      className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500 h-28 resize-none"
                      maxLength={300}
                    />
                    <div className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">
                      {pedidoObservaciones.length}/300
                    </div>
                  </div>
                </div>

              </div>

              {/* Columna Derecha (Sidebar 1/3) */}
              <div className="space-y-6">

                {/* Resumen del Pedido */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-lg">assignment</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Resumen del Pedido</h3>
                  </div>

                  <div className="space-y-3.5 border-t border-slate-50 pt-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Subtotal</span>
                      <span className="font-black text-slate-700">Gs. {subtotal.toLocaleString('es-PY')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">IVA (10%)</span>
                      <span className="font-black text-slate-700">Gs. {iva.toLocaleString('es-PY')}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-4 bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50">
                      <span className="text-emerald-800 font-bold text-sm uppercase tracking-wider">Total</span>
                      <span className="font-black text-xl text-emerald-700">Gs. {total.toLocaleString('es-PY')}</span>
                    </div>
                  </div>
                </div>

                {/* Box de Información */}
                <div className="bg-blue-50 border border-blue-150 p-4 rounded-2xl flex items-start gap-3 shadow-[0_2px_6px_rgba(37,99,235,0.02)]">
                  <span className="material-symbols-outlined text-blue-600 text-lg mt-0.5">info</span>
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    El pedido se registrará como <strong className="text-blue-700 font-bold">PENDIENTE</strong> y actualizará el inventario automáticamente.
                  </p>
                </div>

                {/* Información Adicional */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-lg">calendar_today</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Información Adicional</h3>
                  </div>

                  <div className="space-y-4 border-t border-slate-50 pt-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold uppercase tracking-wider mb-2">Fecha del Pedido</label>
                      <input
                        type="datetime-local"
                        value={pedidoFecha}
                        onChange={(e) => setPedidoFecha(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 bg-white"
                      />
                    </div>
                    <div className="pt-2">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Creado por</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="material-symbols-outlined text-slate-400 text-base">person</span>
                        <span className="font-bold text-slate-700">{pedidoCreadoPor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelarForm}
                    className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 py-3 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <span className="material-symbols-outlined text-lg font-bold">close</span>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRegistrarPedido}
                    disabled={!stockSuficienteParaTodo || pedidoLineas.length === 0}
                    className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 text-sm text-white cursor-pointer
                      ${(!stockSuficienteParaTodo || pedidoLineas.length === 0)
                        ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                        : 'bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99]'}`}
                  >
                    <span className="material-symbols-outlined text-lg">save</span>
                    Confirmar Pedido
                  </button>
                </div>

              </div>

            </div>
          </div>
        ) : (
          /* Historial de Pedidos */
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
              <span className="material-symbols-outlined text-emerald-600">assignment</span>
              <span>Historial de Pedidos Registrados</span>
            </h2>

            {listaPedidos.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic font-mono text-sm bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                No hay pedidos registrados en el sistema.
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {listaPedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="border border-slate-150 rounded-xl p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 border-b border-slate-100 pb-3 mb-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Código del Pedido</span>
                        <div className="text-base font-black text-slate-800">{pedido.id}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <div className="font-bold text-slate-500">Fecha: {pedido.fecha}</div>
                          <div className="text-[10px] text-slate-400">Creado por: {pedido.creadoPor}</div>
                        </div>
                        <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 uppercase">
                          {pedido.estado}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cliente */}
                      <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Información de Facturación/Cliente</span>
                        <div className="font-bold text-slate-800">{pedido.cliente.nombre}</div>
                        <div><span className="text-slate-400">RUC/CI:</span> {pedido.cliente.documento}</div>
                        <div><span className="text-slate-400">Teléfono:</span> {pedido.cliente.telefono}</div>
                        <div className="truncate"><span className="text-slate-400">Dirección:</span> {pedido.cliente.direccion}</div>
                      </div>

                      {/* Productos y Observaciones */}
                      <div className="space-y-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detalle de Productos</span>
                          <div className="divide-y divide-slate-50 max-h-24 overflow-y-auto">
                            {pedido.lineas.map((linea: any, idx: number) => (
                              <div key={idx} className="flex justify-between py-1 font-medium">
                                <span className="text-slate-600">{linea.nombre} (x{linea.cantidad})</span>
                                <span className="font-bold text-slate-800">Gs. {(linea.precio * linea.cantidad).toLocaleString('es-PY')}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {pedido.observaciones && (
                          <div className="bg-amber-50/50 border border-amber-100/50 p-2.5 rounded-lg text-slate-600 italic">
                            <span className="font-bold text-[9px] text-amber-800 uppercase not-italic block mb-0.5">Observaciones:</span>
                            "{pedido.observaciones}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Totales del pedido */}
                    <div className="flex justify-end gap-6 border-t border-slate-100 pt-3 mt-4 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 uppercase tracking-wider">Subtotal:</span>
                        <span className="text-slate-700">Gs. {pedido.subtotal.toLocaleString('es-PY')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 uppercase tracking-wider">IVA (10%):</span>
                        <span className="text-slate-700">Gs. {pedido.iva.toLocaleString('es-PY')}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                        <span className="text-emerald-800 uppercase tracking-wider">Total:</span>
                        <span className="text-emerald-700 text-sm font-black">Gs. {pedido.total.toLocaleString('es-PY')}</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
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
            <button
              onClick={() => setCurrentTab('pedidos')}
              className={`flex w-full items-center gap-3 font-medium px-4 py-3 transition-all duration-200 rounded-lg ${currentTab === 'pedidos'
                  ? 'text-primary font-bold border-r-4 border-primary bg-primary-container/25 rounded-l-lg rounded-r-none'
                  : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                }`}
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              <span>Pedidos</span>
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
          {currentTab === 'pedidos' && renderPedidos()}
        </main>
      </div>
    </div>
  );
}
