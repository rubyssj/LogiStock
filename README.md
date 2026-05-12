# PRD: Sistema de Gestión de Inventario y Logística (Logística Py)

## 1. Resumen del Proyecto
**LogiStock** es una plataforma web diseñada para pequeños emprendedores en Paraguay, enfocada en simplificar la gestión de inventarios y la planificación de rutas de entrega. El sistema busca profesionalizar la operativa logística con una interfaz intuitiva, moderna y eficiente.

---

## 2. Objetivos del Producto
*   **Centralización:** Gestionar stock, clientes y rutas en un solo lugar.
*   **Eficiencia Operativa:** Implementar lógica de búsqueda rápida (Hash Table) y gestión de inventario FIFO.
*   **Optimización de Entregas:** Visualizar y organizar rutas de distribución de manera lógica (Estructura de Grafo).
*   **Accesibilidad:** Interfaz simple para usuarios con poca experiencia técnica.

---

## 3. Público Objetivo
Emprendedores y pequeñas empresas paraguayas (pymes) que manejan productos físicos y realizan entregas locales o regionales.

---

## 4. Definición de Pantallas y Funcionalidades

### 4.1. Dashboard (Panel Principal)
*   **KPIs:** Visualización de Total de Productos, Pedidos Pendientes, Rutas Activas y Clientes Registrados.
*   **Actividad Reciente:** Historial de entradas de mercadería, inicio de rutas y alertas de stock bajo.
*   **Estado del Sistema:** Indicador de capacidad del depósito y acceso rápido a escaneo de códigos.

### 4.2. Gestión de Inventario
*   **Directorio de Productos:** Lista con Nombre, Stock, Categoría y Fecha de Entrada.
*   **Búsqueda Instantánea:** Filtrado por código único simulando una estructura de Hash Table.
*   **Gestión FIFO:** Badge informativo sobre el estado de la cola de productos en espera para salida.
*   **Acciones:** Botón para "Registrar Entrada" y alertas visuales para reabastecimiento urgente.

### 4.3. Planificador de Rutas
*   **Vista Visual:** Secuencia de entregas representada mediante nodos conectados (Grafo).
*   **Detalle de Parada:** Información del cliente, dirección exacta y estado de entrega (Pendiente/Entregado).
*   **Mapa Interactivo:** Integración visual para ubicación geográfica en el área metropolitana (Asunción/Central).
*   **Optimización:** Botón para recalcular la ruta más eficiente.

### 4.4. Directorio de Clientes
*   **Gestión de Cartera:** Listado de clientes con RUC/Cédula, Ciudad y Último Pedido.
*   **Estados:** Etiquetas visuales para clientes Activos e Inactivos.
*   **Exportación:** Funcionalidad para descargar el listado de clientes.

---

## 5. Diseño y Estética
*   **Paleta de Colores:** Verde (#2E7D32) como color primario, blanco para fondos y grises sutiles para superficies.
*   **Tipografía:** Inter (Sans-serif moderna) para máxima legibilidad.
*   **Layout:** Basado en tarjetas (cards) con sombras suaves y bordes redondeados.
*   **Idioma:** Español (Contexto Paraguay).

---

## 6. Requerimientos Técnicos (Simulados)
*   **Estructuras de Datos:** 
    *   Hash Table para búsquedas de códigos de producto (O(1)).
    *   Queue (Cola) para la gestión de inventario FIFO.
    *   Graph (Grafo) para la representación de nodos de entrega en rutas.
