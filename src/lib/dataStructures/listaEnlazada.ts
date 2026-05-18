/**
 * Módulo: Historial y Actividad del Sistema
 * Responsable: Nilda Romira Pereira Florentin
 * 
 * Objetivo: Registrar de forma ordenada todos los eventos importantes del sistema.
 * Se utiliza una estructura de datos de tipo Lista Enlazada.
 */

// Clase Node: Representa cada evento individual en el historial
export class Node<T> {
  value: T;
  next: Node<T> | null;

  constructor(value: T) {
    this.value = value; // Información del evento
    this.next = null;   // Puntero o referencia al siguiente nodo
  }
}

// Clase LinkedList: Maneja la colección de eventos
export class LinkedList<T> {
  head: Node<T> | null;
  size: number;

  constructor() {
    this.head = null;
    this.size = 0;
  }

  /**
   * prepend()
   * Agrega un nuevo evento al inicio del historial.
   * Complejidad: O(1) - Ideal para mantener los eventos más recientes primero.
   */
  prepend(value: T): void {
    const newNode = new Node(value);
    newNode.next = this.head;
    this.head = newNode;
    this.size++;
  }

  /**
   * append()
   * Agrega un evento al final de la lista.
   * Complejidad: O(n)
   */
  append(value: T): void {
    const newNode = new Node(value);

    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = newNode;
    }
    this.size++;
  }

  /**
   * toArray()
   * Convierte la lista enlazada en un arreglo.
   * Esto es necesario para poder renderizar la lista fácilmente en React usando .map()
   */
  toArray(): T[] {
    const elements: T[] = [];
    let current = this.head;

    while (current) {
      elements.push(current.value);
      current = current.next;
    }

    return elements;
  }
}
