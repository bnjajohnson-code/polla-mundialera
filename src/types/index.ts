import type { FasePartido, EstadoPartido, Role } from "@prisma/client";

export type { FasePartido, EstadoPartido, Role };

export interface PartidoConPredicciones {
  id: string;
  externalId: number | null;
  fase: FasePartido;
  grupo: string | null;
  jornada: number | null;
  equipoLocal: string;
  equipoVisitante: string;
  codigoLocal: string | null;
  codigoVisitante: string | null;
  fechaHoraUtc: Date;
  estado: EstadoPartido;
  golesLocal: number | null;
  golesVisitante: number | null;
  golesLocalReg: number | null;
  golesVisitanteReg: number | null;
  miPrediccion?: PrediccionBasica | null;
  predicciones?: PrediccionConUsuario[];
}

export interface PrediccionBasica {
  id: string;
  golesLocal: number;
  golesVisitante: number;
  puntos: number | null;
  updatedAt: Date;
}

export interface PrediccionConUsuario extends PrediccionBasica {
  user: {
    id: string;
    nombre: string;
  };
}

export interface PosicionTabla {
  userId: string;
  nombre: string;
  puntosTotales: number;
  plenos: number;
  aciertosResultado: number;
  partidosConPronostico: number;
  createdAt: Date;
  posicion: number;
  cambio: number; // positivo = subió, negativo = bajó, 0 = igual
}

export interface ResultadoPuntuacion {
  puntos: number;
  aciertoResultado: boolean;
  aciertoLocal: boolean;
  aciertoVisitante: boolean;
  aciertoDiferencia: boolean;
  pleno: boolean;
}

export type TipoNotificacion = "faltante_24h" | "faltante_2h" | "inicio_partido";
export type CanalNotificacion = "email" | "push" | "in_app";

export interface NotificacionIn {
  id: string;
  tipo: TipoNotificacion;
  partidoId: string | null;
  titulo: string;
  mensaje: string;
  leido: boolean;
  createdAt: Date;
}
