import { Cliente } from "./Cliente"; // importa la clase cliente
import { LineaPedido } from "./LineaPedido"; // importa la clase LineaPedido

export type EstadoPedido = "pendiente" | "en_ruta" | "entregado" | "cancelado"; // identifica el estado del pedido

export class Pedido { // se encarga de manejar los pedidos
    private id: string; // identificador unico del pedido
    private cliente: Cliente; // se encarga de manejar los clientes
    private lineas: LineaPedido[]; // se encarga de manejar las lineas de pedido
    private estado: EstadoPedido; // se encarga de manejar el estado del pedido
    private fechaCreacion: Date; // se encarga de manejar la fecha de creacion del pedido
    private fechaEntrega: Date | null; // se encarga de manejar la fecha de entrega del pedido

    constructor(id: string, cliente: Cliente) { //constructor de la clase Pedido
        this.id = id; // se encarga de manejar el id
        this.cliente = cliente; // se encarga de manejar el cliente
        this.lineas = []; // se encarga de manejar las lineas de pedido
        this.estado = "pendiente"; // estado inicial del pedido
        this.fechaCreacion = new Date(); // se encarga de manejar la fecha de creacion
        this.fechaEntrega = null; // se encarga de manejar la fecha de entrega
    }

    // lectura desde afuera, getters para obtener los valores de los atributos
    public getId(): string { return this.id; } //devuelve el identificador unico del pedido
    public getCliente(): Cliente { return this.cliente; } //devuelve el cliente
    public getLineas(): LineaPedido[] { return [...this.lineas]; } // copia defensiva
    public getEstado(): EstadoPedido { return this.estado; } //devuelve el estado
    public getFechaCreacion(): Date { return this.fechaCreacion; } //devuelve la fecha de creacion
    public getFechaEntrega(): Date | null { return this.fechaEntrega; } //devuelve la fecha de entrega

    // Métodos de comportamiento
    public agregarLinea(linea: LineaPedido): void { // agrega linea al pedido
        if (this.estado !== "pendiente") { // si el estado no es pendiente, lanza error
            throw new Error("No se pueden agregar líneas a un pedido que ya no está pendiente.");
        }
        this.lineas.push(linea); // agrega la linea al pedido
    }

    public total(): number { //total del pedido
        return this.lineas.reduce((suma, linea) => suma + linea.subtotal(), 0); // suma total de las lineas del pedido
    }

    public cantidadItems(): number { //cantidad de items del pedido
        return this.lineas.reduce((suma, linea) => suma + linea.getCantidad(), 0); // suma total de las cantidades de los items del pedido
    }

    public marcarEnRuta(): void {
        if (this.estado !== "pendiente") throw new Error("El pedido debe estar pendiente para salir a ruta.");
        this.estado = "en_ruta"; // cambia el estado a en ruta
        this.cliente.registrarPedido(); // registra el pedido
    }

    public marcarEntregado(): void {
        if (this.estado !== "en_ruta") throw new Error("El pedido debe estar en ruta para ser entregado.");
        this.estado = "entregado"; // cambia el estado a entregado
        this.fechaEntrega = new Date(); // registra la fecha de entrega
    }

    public cancelar(): void {
        if (this.estado === "entregado") throw new Error("No se puede cancelar un pedido ya entregado.");
        this.estado = "cancelado"; // cambia el estado a cancelado
    }

    public estaActivo(): boolean {
        return this.estado === "pendiente" || this.estado === "en_ruta"; // devuelve true si el estado es pendiente o en ruta
    }
}