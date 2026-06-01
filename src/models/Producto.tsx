import { generador } from '../utils/generadorIds';

export type CategoriaProducto = "electronica" | "alimentos" | "ropa" | "hogar" | "otros"; //categorizacion de productos 

export class Producto { // se encarga de manejar los productos
    private codigo: string; //codigo del producto
    private nombre: string; //nombre del producto
    private categoria: CategoriaProducto; //categoria del producto
    private precio: number; //precio del producto
    private stockActual: number; //stock actual del producto
    private stockMinimo: number; //stock minimo del producto
    private fechaIngreso: Date; //fecha de ingreso del producto

    constructor(
        nombre: string,
        categoria: CategoriaProducto,
        precio: number,
        stockActual: number,
        stockMinimo: number = 5
    ) { 
        if (!nombre.trim()) throw new Error("El nombre del producto no puede estar vacío."); //error de nombre
        if (!categoria.trim()) throw new Error("La categoria del producto no puede estar vacía."); //error de categoria
        // este objeto en particular
        this.codigo = generador.nuevoIdProducto();
        this.nombre = nombre;
        this.categoria = categoria; //inicializa la categoria del producto
        this.precio = precio; //inicializa el precio del producto
        this.stockActual = stockActual; //inicializa el stock actual del producto
        this.stockMinimo = stockMinimo; // valor por defecto es 5
        this.fechaIngreso = new Date(); // se encarga de registrar la fecha de ingreso del producto
    }
    // lectura desde afuera, getters para obtener los valores de los atributos
    public getCodigo(): string { return this.codigo; } //devuelve el codigo del producto
    public getNombre(): string { return this.nombre; } //devuelve el nombre del producto
    public getCategoria(): CategoriaProducto { return this.categoria; } //devuelve la categoria del producto
    public getPrecio(): number { return this.precio; } //devuelve el precio del producto
    public getStockActual(): number { return this.stockActual; } //devuelve el stock actual del producto
    public getStockMinimo(): number { return this.stockMinimo; } //devuelve el stock minimo del producto
    public getFechaIngreso(): Date { return this.fechaIngreso; } //devuelve la fecha de ingreso del producto
    // Métodos de comportamiento
    public actualizarPrecio(nuevoPrecio: number): void { //actualiza el precio del producto
        if (nuevoPrecio < 0) throw new Error("El precio no puede ser negativo."); // si el precio es negativo, lanza error
        this.precio = nuevoPrecio; // actualiza el precio del producto
    }

    public agregarStock(cantidad: number): void { // agrega stock al producto
        if (cantidad <= 0) throw new Error("La cantidad a agregar debe ser mayor a cero.");
        this.stockActual += cantidad; // actualiza el stock actual del producto
    }

    public reducirStock(cantidad: number): void { // reduce el stock del producto
        if (cantidad <= 0) throw new Error("La cantidad debe ser mayor a cero.");
        if (cantidad > this.stockActual) throw new Error(`Stock insuficiente. Disponible: ${this.stockActual}`);
        this.stockActual -= cantidad; // reduce el stock actual del producto
    }

    public necesitaReabastecimiento(): boolean { // verifica si el producto necesita reabastecimiento
        return this.stockActual <= this.stockMinimo; // devuelve true si el stock actual es menor o igual al stock minimo
    }

    public hayStock(cantidadRequerida: number = 1): boolean { // verifica si hay stock suficiente
        return this.stockActual >= cantidadRequerida; // devuelve true si el stock actual es mayor o igual a la cantidad requerida
    }
}







