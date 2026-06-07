import { Producto } from '../../models';
import { TablaHash } from './tablaHash';

/**
 * Especialización: Tabla Hash Inventario
 *
 * Índice de acceso directo O(1) promedio por código de producto.
 * Complementa la ColaInventario (FIFO): la cola ordena la salida física;
 * la tabla hash permite localizar un producto por su ID sin recorrer la cola.
 */
export class TablaHashInventario {
  private tabla: TablaHash<Producto>;

  constructor(capacidadBuckets: number = 53) {
    this.tabla = new TablaHash<Producto>(capacidadBuckets);
  }

  /**
   * Registra o actualiza un producto en el índice (clave = código único).
   */
  public registrar(producto: Producto): void {
    this.tabla.insertar(producto.getCodigo(), producto);
  }

  /**
   * Búsqueda instantánea por código de producto.
   */
  public buscarPorCodigo(codigo: string): Producto | null {
    const clave = codigo.trim();
    if (!clave) return null;
    return this.tabla.buscar(clave);
  }

  /**
   * Elimina un producto del índice (no afecta la cola física).
   */
  public eliminar(codigo: string): boolean {
    return this.tabla.eliminar(codigo.trim());
  }

  /**
   * Lista todos los productos registrados en el catálogo hash.
   */
  public listarCatalogo(): Producto[] {
    return this.tabla.obtenerValores();
  }

  public cantidadRegistrados(): number {
    return this.tabla.obtenerClaves().length;
  }

  /**
   * Cuenta cuántas cajas de un código dado hay en la cola física.
   * Operación O(n) sobre la cola; la búsqueda del producto en sí es O(1).
   */
  public contarUnidadesEnCola(codigo: string, cola: Producto[]): number {
    const clave = codigo.trim();
    return cola.filter(p => p.getCodigo() === clave).length;
  }
}
