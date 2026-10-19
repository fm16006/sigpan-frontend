import { CatalogProduct } from '../../core/models/catalog.model';

/** Los dos canales por los que se vende un producto; cada uno es un interruptor manual. */
export type ChannelKey = 'disponiblePos' | 'disponibleTienda';

export const CHANNEL_KEYS: readonly ChannelKey[] = ['disponiblePos', 'disponibleTienda'];

export const CHANNEL_LABELS: Readonly<Record<ChannelKey, { label: string; short: string }>> = {
  disponiblePos: { label: 'Punto de venta', short: 'POS' },
  disponibleTienda: { label: 'Tienda en línea', short: 'Tienda' },
};

/** Cuerpo del PATCH /productos/:id/canales: al menos un canal. */
export type ProductChannelsChange = Partial<Record<ChannelKey, boolean>>;

/** Una respuesta sin el campo (backend viejo) se trata como habilitada, igual que el valor por defecto. */
export function isChannelOn(
  product: Pick<CatalogProduct, ChannelKey> | Partial<Pick<CatalogProduct, ChannelKey>>,
  channel: ChannelKey,
): boolean {
  return product[channel] !== false;
}

/** Filtro de la lista: vacío = todos; POS/TIENDA = habilitados en ese canal; APAGADO = en alguno no. */
export type ChannelFilter = '' | 'POS' | 'TIENDA' | 'APAGADO';

export const CHANNEL_FILTERS: readonly { readonly value: Exclude<ChannelFilter, ''>; readonly label: string }[] = [
  { value: 'POS', label: 'Habilitados en punto de venta' },
  { value: 'TIENDA', label: 'Habilitados en tienda en línea' },
  { value: 'APAGADO', label: 'Con algún canal deshabilitado' },
];

export function matchesChannel(
  product: Partial<Pick<CatalogProduct, ChannelKey>>,
  filter: ChannelFilter | undefined,
): boolean {
  switch (filter) {
    case 'POS':
      return isChannelOn(product, 'disponiblePos');
    case 'TIENDA':
      return isChannelOn(product, 'disponibleTienda');
    case 'APAGADO':
      return !isChannelOn(product, 'disponiblePos') || !isChannelOn(product, 'disponibleTienda');
    default:
      return true;
  }
}
