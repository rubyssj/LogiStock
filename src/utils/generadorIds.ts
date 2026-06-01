/**
 * Singleton/Closure para generación de IDs secuenciales
 * Cumple con el requisito de tener IDs limpios en lugar de timestamps o hashes.
 */
class GeneradorIds {
    private clienteCount: number = 0;
    private productoCount: number = 0;
    private nodoCount: number = 0;

    /**
     * Devuelve "C-001", "C-002", etc.
     */
    public nuevoIdCliente(): string {
        this.clienteCount++;
        return `C-${this.clienteCount.toString().padStart(3, '0')}`;
    }

    /**
     * Devuelve "P-001", "P-002", etc.
     */
    public nuevoIdProducto(): string {
        this.productoCount++;
        return `P-${this.productoCount.toString().padStart(3, '0')}`;
    }

    /**
     * Devuelve "N-001", "N-002", etc.
     */
    public nuevoIdNodo(): string {
        this.nodoCount++;
        return `N-${this.nodoCount.toString().padStart(3, '0')}`;
    }
}

// Exportamos una única instancia global para todo el ciclo de vida de la aplicación React
export const generador = new GeneradorIds();
