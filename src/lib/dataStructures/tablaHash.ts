/**
 * Módulo 1: Tabla Hash (Hash Table / Diccionario)
 * 
 * Implementamos una Tabla Hash desde cero **SIN** usar las estructuras 
 * integradas de ES6+ como `Map` o `Set`, o objetos literales `{}` planos
 * como diccionario primitivo.
 * 
 * Política de Resolución de Colisiones: Chaining (Arreglo de Arreglos)
 * En lugar de usar probing (exploración secuencial), si dos claves caen 
 * en el mismo índice, se anidan en un sub-arreglo (Bucket).
 * 
 * Contexto de negocio: Usado para búsquedas en tiempo O(1) (en promedio) 
 * de Clientes o Productos específicos mediante un ID, ideal para validaciones
 * ultra-sincrónicas durante el armado del carrito.
 */

// Tupla para representar [Clave, Valor]
type ParClaveValor<T> = [string, T];

export class TablaHash<T> {
  // El arreglo de buckets. Cada index contendrá un arreglo de Pares (Clave-Valor)
  private buckets: Array<Array<ParClaveValor<T>>>;
  private numBuckets: number;
  private elementosActuales: number;

  /**
   * @param numBuckets Tamaño del vector subyacente. Para fines académicos,
   * se inicializa con un tamaño fijo (ej. 53 que es número primo y reduce colisiones).
   */
  constructor(numBuckets: number = 53) {
    this.numBuckets = numBuckets;
    this.elementosActuales = 0;
    
    // Inicializar cada "balde" con un arreglo vacío
    this.buckets = new Array(numBuckets);
    for (let i = 0; i < this.numBuckets; i++) {
        this.buckets[i] = [];
    }
  }

  /**
   * Función Hash: Convierte una clave (string) en un índice numérico válido
   * dentro del rango [0, numBuckets - 1]
   */
  private hash(key: string): number {
    let total = 0;
    // Ponderación básica usando código ASCII y un número primo
    const primo_impar = 31; 
    
    for (let i = 0; i < Math.min(key.length, 100); i++) {
      let charCode = key.charCodeAt(i);
      total = (total * primo_impar + charCode) % this.numBuckets;
    }
    
    return total;
  }

  /**
   * Inserta o Actualiza un elemento en la tabla
   */
  public insertar(key: string, value: T): void {
    const index = this.hash(key);
    const bucket = this.buckets[index];

    // Verificar si la clave ya existe para actualizarla (Colisión resuelta por chaining)
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === key) {
        // La clave ya existe, sobrescribimos el valor
        bucket[i][1] = value;
        return;
      }
    }

    // Si no existía, agregamos el nuevo par al final del bucket
    bucket.push([key, value]);
    this.elementosActuales++;
  }

  /**
   * Búsqueda en la tabla por la clave
   * O(1) promedio, O(N) peor caso (si todos los elementos caen en el mismo bucket)
   */
  public buscar(key: string): T | null {
    const index = this.hash(key);
    const bucket = this.buckets[index];

    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === key) {
        return bucket[i][1]; // Retorna el valor encontrado
      }
    }

    return null; // No encontrado
  }

  /**
   * Remueve una clave de la tabla
   */
  public eliminar(key: string): boolean {
    const index = this.hash(key);
    const bucket = this.buckets[index];

    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === key) {
        // Remover del arreglo usando splice
        bucket.splice(i, 1);
        this.elementosActuales--;
        return true;
      }
    }

    return false; // No existía la clave a borrar
  }

  /**
   * Retorna todas las claves (Útil para listar todos los clientes/productos)
   */
  public obtenerClaves(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.buckets.length; i++) {
      for (let j = 0; j < this.buckets[i].length; j++) {
        keys.push(this.buckets[i][j][0]);
      }
    }
    return keys;
  }

  public obtenerValores(): T[] {
    const values: T[] = [];
    for (let i = 0; i < this.buckets.length; i++) {
      for (let j = 0; j < this.buckets[i].length; j++) {
        values.push(this.buckets[i][j][1]);
      }
    }
    return values;
  }
}
