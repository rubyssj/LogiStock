/**
 * Módulo 2: Grafo (Graph)
 * 
 * Implementación de un Grafo No Dirigido y Ponderado usando Lista de Adyacencia.
 * Se usará para representar las rutas logísticas entre los diferentes puntos de entrega (clientes).
 * Los pesos representan la distancia o tiempo de entrega entre dos puntos.
 */

// Interfaz para representar una arista (conexión entre dos nodos) con su peso
export interface Arista {
  nodoDestino: string;
  peso: number;
}

export class GrafoRutas {
  // Utilizamos nuestra propia Tabla Hash internamente para mapear un nodo (ID Cliente) 
  // a su lista de aristas (conexiones). Alternativamente, se usa un objeto simple por simplicidad de sintaxis de array,
  // pero manteniéndolo como un diccionario.
  private listaAdyacencia: { [nodo: string]: Arista[] };

  constructor() {
    this.listaAdyacencia = {};
  }

  /**
   * Agrega un nuevo vértice (punto de entrega/cliente) al grafo.
   */
  public agregarVertice(nodo: string): void {
    if (!this.listaAdyacencia[nodo]) {
      this.listaAdyacencia[nodo] = [];
    }
  }

  /**
   * Agrega una arista no dirigida entre dos vértices con un peso específico (distancia).
   */
  public agregarArista(nodo1: string, nodo2: string, peso: number): void {
    // Asegurarse de que ambos nodos existan
    this.agregarVertice(nodo1);
    this.agregarVertice(nodo2);

    // Como es un grafo no dirigido, agregamos la conexión en ambas direcciones
    this.listaAdyacencia[nodo1].push({ nodoDestino: nodo2, peso });
    this.listaAdyacencia[nodo2].push({ nodoDestino: nodo1, peso });
  }

  /**
   * Obtiene todos los vértices del grafo.
   */
  public obtenerVertices(): string[] {
    return Object.keys(this.listaAdyacencia);
  }

  /**
   * Obtiene las conexiones (aristas) de un vértice específico.
   */
  public obtenerConexiones(nodo: string): Arista[] {
    return this.listaAdyacencia[nodo] || [];
  }

  /**
   * Algoritmo de Dijkstra para encontrar la ruta más corta (Simplificado).
   * Nos sirve para demostrar el uso del grafo en optimización de rutas.
   */
  public encontrarRutaMasCorta(nodoInicio: string, nodoDestino: string): { distancia: number; ruta: string[] } | null {
    const distancias: { [nodo: string]: number } = {};
    const nodosPrevios: { [nodo: string]: string | null } = {};
    const noVisitados = new Set(this.obtenerVertices());

    // Inicializar distancias al infinito
    for (let vertice of this.obtenerVertices()) {
      distancias[vertice] = Infinity;
      nodosPrevios[vertice] = null;
    }
    distancias[nodoInicio] = 0;

    while (noVisitados.size > 0) {
      // Encontrar el nodo no visitado con la menor distancia
      let nodoMinimo: string | null = null;
      for (let nodo of noVisitados) {
        if (nodoMinimo === null || distancias[nodo] < distancias[nodoMinimo]) {
          nodoMinimo = nodo;
        }
      }

      if (nodoMinimo === null || distancias[nodoMinimo] === Infinity) {
        break; // Todos los nodos alcanzables han sido visitados
      }

      if (nodoMinimo === nodoDestino) {
        break; // Hemos llegado al destino
      }

      noVisitados.delete(nodoMinimo);

      // Actualizar las distancias de los vecinos
      for (let vecino of this.obtenerConexiones(nodoMinimo)) {
        if (!noVisitados.has(vecino.nodoDestino)) continue;

        const nuevaDistancia = distancias[nodoMinimo] + vecino.peso;
        if (nuevaDistancia < distancias[vecino.nodoDestino]) {
          distancias[vecino.nodoDestino] = nuevaDistancia;
          nodosPrevios[vecino.nodoDestino] = nodoMinimo;
        }
      }
    }

    // Construir la ruta hacia atrás
    if (distancias[nodoDestino] === Infinity) {
      return null; // No hay ruta
    }

    const ruta: string[] = [];
    let actual: string | null = nodoDestino;
    while (actual !== null) {
      ruta.unshift(actual);
      actual = nodosPrevios[actual];
    }

    return { distancia: distancias[nodoDestino], ruta };
  }
}
