/** Divisões com que toda conta nova começa. O usuário ajusta depois em Configurações > Distribuição. */
export const DEFAULT_BUCKETS = [
  { id: 'uso-diario', label: 'Uso diário', percentage: 50 },
  { id: 'reserva-emergencia', label: 'Reserva de emergência', percentage: 30 },
  { id: 'planos-futuros', label: 'Planos futuros', percentage: 20 },
];

export const DEFAULT_BASE_INCOME = 0;
