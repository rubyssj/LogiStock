
export type EstadoCliente = "activo" | "inactivo"; // identifica el estado del cliente
export class Cliente {
    private id: number; //identificador unico del cliente
    private nombre: string; //nombre o razon social del cliente
    private documento: string; // RUC o CI del cliente
    private email: string; // correo electronico 
    private telefono: string; // numero telefonico del cliente
    private direccion: string; // direccion actual o donde opera el cliente
    private estado: EstadoCliente; // estado de actividad del cliente
    private fechaRegistro: Date; // fecha de registro del cliente
    private ultimoPedidoFecha: Date | null; // fecha del ultimo pedido

    constructor(
        id: number,
        nombre: string,
        email: string,
        telefono: string,
        documento: string,
        direccion: string
    ) { // si el relleno del cliente esta vacio o solo tiene espacios, lanza error
        if (!nombre.trim()) throw new Error("El nombre del cliente no puede estar vacío."); //error de nombre
        if (!documento.trim()) throw new Error("El documento (RUC/Cédula) es obligatorio."); //error de documento
        if (!email.trim()) throw new Error("El correo electrónico es obligatorio."); //error de correo
        if (!telefono.trim()) throw new Error("El número de teléfono es obligatorio."); //error de telefono
        if (!direccion.trim()) throw new Error("La dirección es obligatoria."); //error de direccion
        // este objeto en particular
        this.id = id;
        this.nombre = nombre;
        this.documento = documento;
        this.email = email;
        this.telefono = telefono;
        this.direccion = direccion;
        this.estado = "activo";
        this.fechaRegistro = new Date();
        this.ultimoPedidoFecha = null;

    }
    // metodos get que solo devuelven el valor del atributo
    public getId(): number { return this.id; } //devuelve el id del cliente
    public getNombre(): string { return this.nombre; } //devuelve el nombre del cliente
    public getDocumento(): string { return this.documento; } //devuelve el documento del cliente
    public getEmail(): string { return this.email; } //devuelve el correo electronico del cliente
    public getTelefono(): string { return this.telefono; } //devuelve el numero telefonico del cliente
    public getDireccion(): string { return this.direccion; } //devuelve la direccion del cliente
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



