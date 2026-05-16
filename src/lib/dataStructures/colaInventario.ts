import { Producto } from '../../models';

/**
 * Módulo 1: Cola (Queue - Estructura FIFO)
 * 
 * Implementación de una Cola manual usando un arreglo nativo subyacente.
 * Se prohíbe el acceso a índices que no sean los de inserción (push al final)
 * o eliminación (shift al principio), demostrando la política FIFO 
 * (First In, First Out).
 */
export class Cola<T> {
  // Encapsulamiento: El arreglo interno es privado para forzar el uso de la interfaz FIFO.
  private items: T[];

  constructor() {
    this.items = [];
  }

  /**
   * Agrega un elemento al final de la cola (Enqueue)
   */
  public encolar(elemento: T): void {
    this.items.push(elemento);
  }

  /**
   * Remueve y retorna el elemento al frente de la cola (Dequeue).
   * Primer elemento en entrar, primer elemento en salir.
   */
  public desencolar(): T | null {
    if (this.estaVacia()) {
      return null;
    }
    // shift() remueve el elemento en el índice 0 de la estructura interna
    return this.items.shift() || null;
  }

  /**
   * Observa el elemento que está próximo a salir, sin removerlo de la cola (Peek)
   */
  public verFrente(): T | null {
    if (this.estaVacia()) {
      return null;
    }
    return this.items[0];
  }

  /**
   * Verifica si la cola está vacía
   */
  public estaVacia(): boolean {
    return this.items.length === 0;
  }

  /**
   * Retorna la cantidad de elementos actuales en la cola
   */
  public tamanio(): number {
    return this.items.length;
  }
  
  /**
   * Convierte la cola temporalmente a arreglo solo para visualización
   * en la UI (Rompe levemente el paradigma puro para ayudar con React)
   */
  public toArrayVisualizacion(): T[] {
    return [...this.items];
  }
}

/**
 * Especialización: Cola Inventario
 * Aplica la lógica FIFO estrictamente para la gestión de productos, utilizando un arreglo nativo
 * pero restringiendo sus accesos a los extremos.
 */
export class ColaInventario {
  // Arreglo nativo privado. Nadie fuera de la clase puede acceder a índices como this.items[2].
  // Esto asegura que el comportamiento sea 100% el de una Cola Pura (FIFO).
  private items: Producto[];

  constructor() {
    this.items = [];
  }

  /**
   * Operación de Encolado básico privado
   * Inserta exclusivamente al FINAL del arreglo para respetar el orden de llegada.
   */
  private encolar(producto: Producto): void {
    // Array.push() añade al final. Es O(1) amortizado.
    this.items.push(producto);
  }

  /**
   * Operación de Desencolado básico privado
   * Extrae exclusivamente desde el FRENTE del arreglo.
   */
  private desencolar(): Producto | null {
    if (this.estaVacia()) {
      return null;
    }
    // Array.shift() remueve y retorna el elemento en la posición 0.
    // Esto asegura que el que más tiempo ha estado esperando sea el primero en salir (FIFO).
    return this.items.shift() || null;
  }

  /**
   * Verifica si el arreglo subyacente está vacío.
   */
  private estaVacia(): boolean {
    return this.items.length === 0;
  }

  /**
   * Añade elementos al final de la cola (simulando un encolado).
   * @param producto - Objeto a ingresar
   * @param cantidad - Número de unidades que ingresan en este lote.
   */
  public ingresarLote(producto: Producto, cantidad: number): void {
    for (let i = 0; i < cantidad; i++) {
        // Encolamos 1 por 1 para simular que cada producto toma su lugar en la fila.
        // Al clonar la referencia (o usar el mismo modelo temporalmente)
        // en el mundo real instanciaríamos objetos diferentes si requerimos tracking individual.
        this.encolar(producto);
    }
  }

  /**
   * Extrae y retorna los productos estrictamente desde el frente de la cola.
   * Si un cliente pide 3 unidades, el método hace 3 desencolados individuales
   * para asegurar que salen los más antiguos respetando la regla FIFO.
   * 
   * @param cantidadRequerida - Unidades solicitadas en el pedido.
   * @returns Arreglo de los productos extraídos del frente de la cola.
   */
  public despacharPedido(cantidadRequerida: number): Producto[] {
    const productosDespachados: Producto[] = [];
    let despachados = 0;

    // Condición de seguridad: extraer mientras no cumplamos la cantidad y haya stock.
    while (despachados < cantidadRequerida && !this.estaVacia()) {
        const productoFrente = this.desencolar();
        if (productoFrente !== null) {
            productosDespachados.push(productoFrente);
            despachados++;
        }
    }

    return productosDespachados;
  }

  /**
   * Retorna un estado actual de la cola (sin modificarla) para poder mapear y 
   * renderizar visualmente el orden de los productos en la interfaz de React.
   * 
   * Nota: Formalmente una Cola no permite iterar sus elementos interiores,
   * pero para propósitos de UI en un entorno moderno web o React, creamos 
   * una copia superficial permitiendo visualización sin romper el encapsulamiento.
   */
  public mapearStockActual(): Producto[] {
    return [...this.items];
  }
}

