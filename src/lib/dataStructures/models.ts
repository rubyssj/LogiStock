/**
 * Módulo 1: Programación Orientada a Objetos (POO)
 * 
 * Aquí aplicamos los principios de Abstracción, Encapsulamiento, y Herencia.
 * Evitamos exponer las propiedades directamente usando 'private' o 'protected',
 * y utilizamos métodos getters/setters para interactuar con los objetos.
 */

// Clase Base (Superclase) para demostrar herencia
export class Persona {
  protected id: string;
  protected nombre: string;

  constructor(id: string, nombre: string) {
    this.id = id;
    this.nombre = nombre;
  }

  public getId(): string {
    return this.id;
  }

  public getNombre(): string {
    return this.nombre;
  }
}

// Subclase: Emprendedor
export class Emprendedor extends Persona {
  private empresa: string;

  constructor(id: string, nombre: string, empresa: string) {
    super(id, nombre); // Llama al constructor de Persona
    this.empresa = empresa;
  }

  public getEmpresa(): string {
    return this.empresa;
  }
}

// Subclase: Cliente
export class Cliente extends Persona {
  private direccion: string;
  private latitud: number;
  private longitud: number;

  constructor(id: string, nombre: string, direccion: string, latitud: number, longitud: number) {
    super(id, nombre);
    this.direccion = direccion;
    this.latitud = latitud;
    this.longitud = longitud;
  }

  public getDireccion(): string {
    return this.direccion;
  }

  public getCoordenadas(): { lat: number, lng: number } {
    return { lat: this.latitud, lng: this.longitud };
  }
}

// Clase Producto
export class Producto {
  private id: string;
  private nombre: string;
  private precio: number;
  private peso: number; // Útil para la logística más adelante

  constructor(id: string, nombre: string, precio: number, peso: number) {
    this.id = id;
    this.nombre = nombre;
    this.precio = precio;
    this.peso = peso;
  }

  public getId(): string { return this.id; }
  public getNombre(): string { return this.nombre; }
  public getPrecio(): number { return this.precio; }
  public getPeso(): number { return this.peso; }
}

// Clase Pedido
export class Pedido {
  private id: string;
  private cliente: Cliente;
  private productos: Producto[];
  private despachado: boolean;

  constructor(id: string, cliente: Cliente) {
    this.id = id;
    this.cliente = cliente;
    this.productos = [];
    this.despachado = false;
  }

  public agregarProducto(producto: Producto): void {
    this.productos.push(producto);
  }

  public calcularTotal(): number {
    // Usamos el paradigma POO para delegar cálculos
    return this.productos.reduce((total, prod) => total + prod.getPrecio(), 0);
  }

  public despachar(): void {
    this.despachado = true;
  }

  public getId(): string { return this.id; }
  public getCliente(): Cliente { return this.cliente; }
  public getProductos(): Producto[] { return this.productos; }
  public isDespachado(): boolean { return this.despachado; }
}

// Clase Ruta
export class Ruta {
  private id: string;
  private repartidorId: string;
  private pedidos: Pedido[];

  constructor(id: string, repartidorId: string) {
    this.id = id;
    this.repartidorId = repartidorId;
    this.pedidos = [];
  }

  public agregarPedido(pedido: Pedido): void {
    this.pedidos.push(pedido);
  }

  public getPedidos(): Pedido[] {
    return this.pedidos;
  }
}
