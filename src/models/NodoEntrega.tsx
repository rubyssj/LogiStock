
export type EstadoEntrega = "pendiente" | "entregado"; //tipo de estado de entrega

export class NodoEntrega { // clase que representa un nodo de entrega
  private id: string; // identificador unico del nodo
  private direccion: string; // direccion del nodo
  private ciudad: string; // ciudad del nodo
  private latitud: number; // latitud del nodo
  private longitud: number; // longitud del nodo
  private clienteNombre: string; // nombre del cliente
  private pedidoId: string; // identificador del pedido
  private estado: EstadoEntrega; // estado del nodo

  constructor(
    id: string, // identificador unico del nodo
    direccion: string, // direccion del nodo
    ciudad: string, // ciudad del nodo
    latitud: number, // latitud del nodo
    longitud: number, // longitud del nodo
    clienteNombre: string, // nombre del cliente
    pedidoId: string // identificador del pedido
  ) {
    this.id = id; // se encarga de manejar el id
    this.direccion = direccion; // se encarga de manejar la direccion
    this.ciudad = ciudad; // se encarga de manejar la ciudad
    this.latitud = latitud; // se encarga de manejar la latitud
    this.longitud = longitud; // se encarga de manejar la longitud
    this.clienteNombre = clienteNombre; // se encarga de manejar el nombre del cliente
    this.pedidoId = pedidoId; // se encarga de manejar el identificador del pedido
    this.estado = "pendiente"; // estado inicial del nodo
  }

  // Getters
  public getId(): string { return this.id; } //devuelve el identificador unico del nodo
  public getDireccion(): string { return this.direccion; } //devuelve la direccion
  public getCiudad(): string { return this.ciudad; } //devuelve la ciudad
  public getLatitud(): number { return this.latitud; } //devuelve la latitud
  public getLongitud(): number { return this.longitud; } //devuelve la longitud
  public getClienteNombre(): string { return this.clienteNombre; } //devuelve el nombre del cliente
  public getPedidoId(): string { return this.pedidoId; } //devuelve el identificador del pedido
  public getEstado(): EstadoEntrega { return this.estado; } //devuelve el estado


  public marcarEntregado(): void { //marca el nodo como entregado
    this.estado = "entregado";
  }

  public estaEntregado(): boolean { // verifica si el nodo esta entregado
    return this.estado === "entregado"; //compara el estado del nodo 
  }
}