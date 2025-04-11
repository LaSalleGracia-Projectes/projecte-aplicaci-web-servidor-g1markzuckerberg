interface Notificacion {
  mensaje: string;
  id: number;
  created_at: string;
  usuario_id: number;
  is_global: boolean;
}

export default Notificacion;