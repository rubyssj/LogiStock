/**
 * Módulo 2: Grafo Logístico (Graph)
 * 
 * Implementación de un Grafo No Dirigido y Ponderado usando una Lista de Adyacencia.
 * En un escenario logístico real:
 * - Los **Vértices (Nodos)** representan ubicaciones físicas, como el depósito
 *   central o los domicilios de los clientes. Contienen metadatos visuales como coordenadas.
 * - Las **Aristas (Conexiones)** representan las rutas transitables entre dos
 *   puntos (e.g., calles, carreteras).
 * - Los **Pesos** de las aristas representan el costo de la ruta, típicamente medido
 *   en kilómetros de distancia o minutos de tiempo de viaje.
 */

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface PuntoEntrega {
  idNodo: string;
  nombreCliente: string;
  coordenadas: Coordenadas;
}

// Representa una conexión directa desde un punto hacia otro.
export interface AristaLogistica {
  idDestino: string;
  distanciaKm: number;
}

export class GrafoLogistica {
  // Almacena la información (metadatos) de cada nodo. Útil para visualización UI.
  private puntos: { [idNodo: string]: PuntoEntrega };
  
  // Lista de Adyacencia: El núcleo estructural del Grafo.
  // Mapea el ID de un nodo a su lista de aristas (conexiones hacia otros nodos).
  private listaAdyacencia: { [idNodo: string]: AristaLogistica[] };

  constructor() {
    this.puntos = {};
    this.listaAdyacencia = {};
  }

  /**
   * Añade un vértice al grafo.
   * Modelando el problema logístico: Registra un nuevo punto físico en nuestro mapa,
   * almacenando su latitud y longitud para integraciones (ej. Leaflet/OpenStreetMap).
   * 
   * @param idNodo Identificador único del punto (ej. "deposito_1", "cliente_A")
   * @param nombreCliente Nombre del cliente o establecimiento
   * @param coordenadas Objeto con latitud y longitud
   */
  public agregarPuntoEntrega(idNodo: string, nombreCliente: string, coordenadas: Coordenadas): void {
    if (!this.listaAdyacencia[idNodo]) {
      this.listaAdyacencia[idNodo] = [];
      this.puntos[idNodo] = { idNodo, nombreCliente, coordenadas };
    }
  }

  /**
   * Añade una arista bidireccional (grafo no dirigido) ponderada.
   * Modelando el problema logístico: Habilita un camino transitable de doble mano
   * entre dos puntos, registrando su distancia en Km para cálculos de costo.
   * 
   * @param idOrigen ID del nodo de partida
   * @param idDestino ID del nodo de llegada
   * @param distanciaKm El costo o distancia de la ruta
   */
  public conectarPuntos(idOrigen: string, idDestino: string, distanciaKm: number): void {
    // Verificamos que ambos vértices existan antes de conectarlos asumiendo que
    // el consumidor de la API ya los creó mediante agregarPuntoEntrega().
    if (this.listaAdyacencia[idOrigen] && this.listaAdyacencia[idDestino]) {
      // Grafo No Dirigido: A -> B es equivalente a B -> A
      this.listaAdyacencia[idOrigen].push({ idDestino, distanciaKm });
      this.listaAdyacencia[idDestino].push({ idDestino: idOrigen, distanciaKm });
    }
  }

  /**
   * Obtiene la información de un punto de entrega. Útil para rendering de UI.
   */
  public obtenerPuntoEntrega(idNodo: string): PuntoEntrega | null {
    return this.puntos[idNodo] || null;
  }

  /**
   * Implementa el Algoritmo de Dijkstra desde cero para encontrar el camino más corto.
   * Modelando el problema logístico: El conductor parte del depósito y necesita 
   * saber secuencialmente cuáles puntos intermedios visitar para llegar a su 
   * entrega recorriendo la mínima distancia posible.
   * 
   * @param idDeposito El nodo de partida
   * @param idCliente El nodo destino a alcanzar
   * @returns Un objeto con la secuencia de puntos (ruta) y la distancia total, o null si no hay ruta.
   */
  public calcularRutaOptima(idDeposito: string, idCliente: string): { ruta: string[], distanciaTotal: number } | null {
    // 1. Inicialización de estructuras
    const distancias: { [idNodo: string]: number } = {};
    const nodosPrevios: { [idNodo: string]: string | null } = {};
    const noVisitados: Set<string> = new Set(Object.keys(this.listaAdyacencia));

    // Establecemos la distancia a todos los nodos como Infinito, excepto el origen.
    for (let nodo of noVisitados) {
      distancias[nodo] = Infinity;
      nodosPrevios[nodo] = null;
    }
    distancias[idDeposito] = 0;

    // 2. Iteración: Explotar el nodo no visitado más cercano
    while (noVisitados.size > 0) {
      // 2a. Buscar el nodo con menor distancia tentativamente calculada
      let nodoMinimo: string | null = null;
      let minDis = Infinity;
      for (let nodo of noVisitados) {
        if (distancias[nodo] < minDis) {
          minDis = distancias[nodo];
          nodoMinimo = nodo;
        }
      }

      // Si el mínimo es infinito, significa que los restantes son inalcanzables (islas).
      // Si el mínimo es nuestro destino de entrega, podemos salir tempranamente.
      if (nodoMinimo === null || distancias[nodoMinimo] === Infinity) {
        break;
      }
      
      if (nodoMinimo === idCliente) {
        break; // Llegamos al objetivo visualizado óptimamente.
      }

      // Marcamos el nodo actual como visitado definitivamente
      noVisitados.delete(nodoMinimo);

      // 2b. Relajación de aristas: Evaluamos los vecinos del nodo actual
      for (let arista of this.listaAdyacencia[nodoMinimo]) {
        if (noVisitados.has(arista.idDestino)) {
          // El costo de llegar al vecino pasando por 'nodoMinimo'
          const nuevaDistanciaCalculada = distancias[nodoMinimo] + arista.distanciaKm;
          
          if (nuevaDistanciaCalculada < distancias[arista.idDestino]) {
            // Encontramos un camino más corto, actualizamos la tabla de distancias
            distancias[arista.idDestino] = nuevaDistanciaCalculada;
            // Y registramos el 'paso' anterior para reconstruir la ruta luego
            nodosPrevios[arista.idDestino] = nodoMinimo;
          }
        }
      }
    }

    // 3. Reconstrucción de la ruta hacia atrás (backtracking desde el destino)
    if (distancias[idCliente] === Infinity) {
      // El cliente es inalcanzable (no hay ruta que lo conecte)
      return null; 
    }

    const secuenciaNodos: string[] = [];
    let nodoActual: string | null = idCliente;

    while (nodoActual !== null) {
      secuenciaNodos.unshift(nodoActual); // Agregamos al principio para que quede Origen -> Destino
      nodoActual = nodosPrevios[nodoActual];
    }

    return {
      ruta: secuenciaNodos,
      distanciaTotal: distancias[idCliente]
    };
  }
}
