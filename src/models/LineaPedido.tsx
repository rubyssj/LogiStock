import { Producto } from "./Producto"; // importa la clase producto

export class LineaPedido {
    private producto: Producto; // se encarga de manejar los productos
    private cantidad: number; // se encarga de manejar la cantidad
    private precioUnitario: number; // precio al momento del pedido

    constructor( //constructor de la clase LineaPedido
        producto: Producto,
        cantidad: number
    ) {
        if (cantidad <= 0) throw new Error("La cantidad debe ser mayor a cero."); // error de cantidad
        if (!producto.hayStock(cantidad)) {
            throw new Error(`Stock insuficiente para "${producto.getNombre()}".`);
        }
        this.producto = producto; // se encarga de manejar los productos
        this.cantidad = cantidad; // se encarga de manejar la cantidad
        this.precioUnitario = producto.getPrecio(); // se encarga de manejar el precio unitario
    }
    public getProducto(): Producto { return this.producto; } //devuelve el producto
    public getCantidad(): number { return this.cantidad; } //devuelve la cantidad
    public getPrecioUnitario(): number { return this.precioUnitario; } //devuelve el precio unitario

    public subtotal(): number { //subtotal del pedido
        return this.cantidad * this.precioUnitario; // subtotal = cantidad * precio unitario
    }
}
