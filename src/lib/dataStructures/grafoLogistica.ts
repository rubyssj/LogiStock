/**
 * Módulo 2: Grafo Logístico (Graph) - Motor de Optimización
 * ---------------------------------------------------------------------------
 * Esta clase implementa un Grafo No Dirigido y Ponderado usando una Lista de Adyacencia.
 * 
 * Enfoque de Negocio (Logística Local):
 * - Vértices (Nodos): Son los "Puntos de Entrega" (el Depósito y las sucursales de los clientes).
 * - Aristas (Conexiones): Son los "Tramos" transitable entre dos puntos.
 * - Pesos: Representan la "Distancia en Kilómetros" entre dos ubicaciones.
 */

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface PuntoDeEntrega {
  idNodo: string;
  nombreCliente: string;
  coordenadas: Coordenadas;
}

// Representa un tramo que conecta un punto con otro.
export interface TramoLogistico {
  idDestino: string;
  distanciaEnKilometros: number;
}

export class GrafoLogistica {
  // Diccionario para acceder rápido O(1) a la metadata de las sucursales/depósitos.
  private puntosDeEntrega: { [idNodo: string]: PuntoDeEntrega };
  
  // Lista de Adyacencia: Estructura central del Grafo.
  // Nos dice desde un punto X hacia qué otros puntos Y podemos ir, y a qué distancia.
  private listaAdyacencia: { [idNodo: string]: TramoLogistico[] };

  constructor() {
    this.puntosDeEntrega = {};
    this.listaAdyacencia = {};
  }

  /**
   * Registra una nueva sucursal o depósito en nuestro mapa logístico.
   */
  public agregarPuntoEntrega(idNodo: string, nombreCliente: string, coordenadas: Coordenadas): void {
    if (!this.listaAdyacencia[idNodo]) {
      this.listaAdyacencia[idNodo] = [];
      this.puntosDeEntrega[idNodo] = { idNodo, nombreCliente, coordenadas };
    }
  }

  /**
   * Define que existe un camino de doble vía entre dos ubicaciones y cuántos kilómetros los separan.
   */
  public conectarPuntos(idOrigen: string, idDestino: string, distanciaEnKilometros: number): void {
    if (this.listaAdyacencia[idOrigen] && this.listaAdyacencia[idDestino]) {
      // Como es un grafo no dirigido, si puedo ir de A->B, también puedo volver de B->A.
      this.listaAdyacencia[idOrigen].push({ idDestino, distanciaEnKilometros });
      this.listaAdyacencia[idDestino].push({ idDestino: idOrigen, distanciaEnKilometros });
    }
  }

  /**
   * Devuelve el diccionario completo de puntos. Útil para que la UI (React) pinte los marcadores.
   */
  public getPuntosDeEntrega() {
    return this.puntosDeEntrega;
  }

  /**
   * ALGORITMO DE DIJKSTRA: calcula la ruta óptima de un punto a otro.
   * Complejidad: O(V^2) en esta versión con Set, ideal para mapas medianos.
   * 
   * IMPORTANTE PARA LA EXPOSICIÓN (Dijkstra vs Viajante de Comercio - TSP):
   * -----------------------------------------------------------------------
   * Este algoritmo encuentra la conexión más corta entre UN punto A y UN punto B.
   * NO es el problema del "Viajante de Comercio" (TSP) donde el camión debe 
   * hacer paradas en todos los depósitos (C, D, E). 
   * Si la mejor ruta de A a B pasa cerca del depósito C, el camión solo transita 
   * por la calle, pero NO está obligado a hacer una parada logística en C, a menos 
   * que el usuario explícitamente haya agregado a C como un destino.
   * 
   * @param idDeposito El nodo donde arranca el chofer.
   * @param idCliente El nodo donde está el cliente final.
   * @returns Un objeto con el recorrido detallado y la distancia total, o null si no se puede llegar.
   */
  public calcularMejorRuta(idDeposito: string, idCliente: string): { ruta: string[], distanciaTotal: number } | null {
    // 1. PREPARACIÓN (Setup)
    // 'distancias' guardará la distancia más corta CONOCIDA desde el depósito hasta cada nodo.
    const distancias: { [idNodo: string]: number } = {};
    
    // 'nodosPrevios' nos sirve como "migas de pan". Guarda de qué nodo veníamos para trazar el mapa al revés.
    const nodosPrevios: { [idNodo: string]: string | null } = {};
    
    // Lista de nodos que aún no hemos analizado (al principio son todos).
    const noVisitados: Set<string> = new Set(Object.keys(this.listaAdyacencia));

    // Inicializamos todo en "Infinito" (inalcanzable), excepto nuestro punto de partida que está a 0 km.
    for (let nodo of noVisitados) {
      distancias[nodo] = Infinity;
      nodosPrevios[nodo] = null;
    }
    distancias[idDeposito] = 0;

    // 2. EXPLORACIÓN (El núcleo de Dijkstra)
    while (noVisitados.size > 0) {
      
      // Paso A: Encontrar el nodo más cercano que aún no hayamos visitado.
      let nodoMasCercano: string | null = null;
      let distanciaMinima = Infinity;
      
      for (let nodo of noVisitados) {
        if (distancias[nodo] < distanciaMinima) {
          distanciaMinima = distancias[nodo];
          nodoMasCercano = nodo;
        }
      }

      // Si el nodo más cercano está a distancia "Infinito", significa que los nodos restantes
      // están desconectados (son islas sin caminos). Terminamos la exploración.
      if (nodoMasCercano === null || distancias[nodoMasCercano] === Infinity) {
        break;
      }
      
      // Si el nodo más cercano es justamente a donde queríamos llegar, ¡ya terminamos!
      // No hace falta explorar el resto del mapa.
      if (nodoMasCercano === idCliente) {
        break; 
      }

      // Lo quitamos de la lista porque ya lo estamos analizando.
      noVisitados.delete(nodoMasCercano);

      // Paso B: "Relajación" de aristas.
      // Miramos todos los vecinos conectados a nuestro nodo actual.
      for (let tramo of this.listaAdyacencia[nodoMasCercano]) {
        if (noVisitados.has(tramo.idDestino)) {
          // ¿Cuánto nos costaría llegar a este vecino si pasamos por donde estamos ahora?
          const nuevaDistanciaCalculada = distancias[nodoMasCercano] + tramo.distanciaEnKilometros;
          
          // Si este nuevo camino es MÁS CORTO que el camino que conocíamos antes...
          if (nuevaDistanciaCalculada < distancias[tramo.idDestino]) {
            // ¡Lo actualizamos! Hemos encontrado una ruta mejor ("Logística Optimizada").
            distancias[tramo.idDestino] = nuevaDistanciaCalculada;
            // Dejamos la "miga de pan" apuntando hacia atrás.
            nodosPrevios[tramo.idDestino] = nodoMasCercano;
          }
        }
      }
    }

    // 3. RECONSTRUCCIÓN DE LA RUTA (Backtracking)
    // Si la distancia al cliente sigue siendo infinito, es porque no hay calles que lleven ahí.
    if (distancias[idCliente] === Infinity) {
      return null; 
    }

    // Armamos la lista de pasos leyendo las "migas de pan" desde el final hacia el principio.
    const secuenciaNodos: string[] = [];
    let nodoActual: string | null = idCliente;

    while (nodoActual !== null) {
      secuenciaNodos.unshift(nodoActual); // unshift() lo mete al inicio, así queda: Origen -> Medio -> Destino
      nodoActual = nodosPrevios[nodoActual];
    }

    return {
      ruta: secuenciaNodos,
      distanciaTotal: distancias[idCliente] // Kilómetros a recorrer
    };
  }
}
