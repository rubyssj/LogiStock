import { generador } from '../utils/generadorIds';

export type EstadoCliente = "activo" | "inactivo"; // identifica el estado del cliente
export interface Deposito {
    idNodo: string;
    nombre: string;
    direccion: string;
    ciudad: string;
    barrio: string;
    coordenadas: { lat: number; lng: number };
}

export class Cliente {
    private id: string; //identificador unico del cliente "C-00X"
    private nombre: string; //nombre o razon social del cliente
    private documento: string; // RUC o CI del cliente
    private email: string; // correo electronico 
    private telefono: string; // numero telefonico del cliente
    private direccion: string; // direccion principal
    private modalidadNegocio: "MicroEmpresa" | "Emprendedor"; // Parametrizacion
    private cantidadEmpleados: string; // "1", "1-5", "6-10", etc
    private depositos: Deposito[]; // multiples ubicaciones para el mapa
    private estado: EstadoCliente; // estado de actividad del cliente
    private fechaRegistro: Date; // fecha de registro del cliente
    private ultimoPedidoFecha: Date | null; // fecha del ultimo pedido

    constructor(
        nombre: string,
        email: string,
        telefono: string,
        documento: string,
        direccion: string,
        modalidadNegocio: "MicroEmpresa" | "Emprendedor",
        cantidadEmpleados: string,
        depositos: Deposito[] = []
    ) { 
        if (!nombre.trim()) throw new Error("El nombre del cliente no puede estar vacío."); 
        
        // Validación de Documento (RUC o Cédula) - Ej: "1234567-8", "1234567" o "1.234.567"
        if (!documento.trim()) throw new Error("El documento (RUC/Cédula) es obligatorio.");
        const rucRegex = /^[\d\.\-A-Za-z]+$/;
        if (!rucRegex.test(documento)) throw new Error("El RUC/CI tiene formato inválido. Use números, letras, puntos o guiones.");

        // Validación de Email
        if (!email.trim()) throw new Error("El correo electrónico es obligatorio.");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) throw new Error("El formato del correo electrónico no es válido.");

        // Validación de Teléfono
        if (!telefono.trim()) throw new Error("El número de teléfono es obligatorio.");
        const telefonoRegex = /^\+?[0-9\s\-]{6,15}$/;
        if (!telefonoRegex.test(telefono)) throw new Error("El formato del teléfono no es válido.");

        if (!direccion.trim()) throw new Error("La dirección es obligatoria.");
        // este objeto en particular
        this.id = generador.nuevoIdCliente(); // Generación automática
        this.nombre = nombre;
        this.documento = documento;
        this.email = email;
        this.telefono = telefono;
        this.direccion = direccion;
        this.modalidadNegocio = modalidadNegocio;
        this.cantidadEmpleados = modalidadNegocio === "Emprendedor" ? "1" : cantidadEmpleados;
        this.depositos = depositos;
        this.estado = "activo";
        this.fechaRegistro = new Date();
        this.ultimoPedidoFecha = null;

    }
    // metodos get que solo devuelven el valor del atributo
    public getId(): string { return this.id; } //devuelve el id del cliente
    public getNombre(): string { return this.nombre; } //devuelve el nombre del cliente
    public getDocumento(): string { return this.documento; } //devuelve el documento del cliente
    public getEmail(): string { return this.email; } //devuelve el correo electronico del cliente
    public getTelefono(): string { return this.telefono; } //devuelve el numero telefonico del cliente
    public getDireccion(): string { return this.direccion; } //devuelve la direccion principal
    public getModalidadNegocio(): string { return this.modalidadNegocio; }
    public getCantidadEmpleados(): string { return this.cantidadEmpleados; }
    public getDepositos(): Deposito[] { return this.depositos; }
    public getEstado(): EstadoCliente { return this.estado; } //devuelve el estado del cliente
    public getFechaRegistro(): Date { return this.fechaRegistro; } //devuelve la fecha de registro del cliente
    public getUltimoPedidoFecha(): Date | null { return this.ultimoPedidoFecha; } //devuelve la fecha del ultimo pedido

    desactivar(): void { // metodo que cambia el estado del cliente a inactivo
        this.estado = "inactivo";
    }

    activar(): void { // metodo que cambia el estado del cliente a activo
        this.estado = "activo";
    }

    registrarPedido(): void { // metodo que registra un nuevo pedido
        this.ultimoPedidoFecha = new Date(); // actualiza la fecha del ultimo pedido
        this.estado = "activo"; // asegura que el cliente este activo
    }

    estaActivo(): boolean { // metodo que verifica si el cliente esta activo
        return this.estado === "activo"; // compara el valor y el tipo de dato de estado
    }

}



