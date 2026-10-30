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

/** HU-09: estado de publicación derivado de los canales y de si está activo. */
export type PublicationStatus = 'PUBLICADO' | 'SOLO_MOSTRADOR' | 'SOLO_TIENDA' | 'OCULTO' | 'DESCONTINUADO';

export const PUBLICATION_LABELS: Readonly<Record<PublicationStatus, { label: string; tone: 'ok' | 'info' | 'warn' | 'neutral' | 'bad' }>> = {
  PUBLICADO: { label: 'Publicado', tone: 'ok' },
  SOLO_MOSTRADOR: { label: 'Exclusivo de mostrador', tone: 'info' },
  SOLO_TIENDA: { label: 'Solo tienda en línea', tone: 'info' },
  OCULTO: { label: 'Sin canal de venta', tone: 'warn' },
  DESCONTINUADO: { label: 'Descontinuado', tone: 'neutral' },
};

export function publicationStatus(
  product: Partial<Pick<CatalogProduct, ChannelKey>> & Pick<CatalogProduct, 'activo'>,
): PublicationStatus {
  if (!product.activo) return 'DESCONTINUADO';
  const pos = isChannelOn(product, 'disponiblePos');
  const tienda = isChannelOn(product, 'disponibleTienda');
  if (pos && tienda) return 'PUBLICADO';
  if (pos) return 'SOLO_MOSTRADOR';
  if (tienda) return 'SOLO_TIENDA';
  return 'OCULTO';
}
