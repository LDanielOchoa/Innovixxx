/**
 * Utilidad para formatear las URLs de las imágenes provenientes del backend Django.
 */

const MEDIA_BASE_URL = '/media/';

/**
 * Retorna la URL completa para una imagen.
 * @param ruta - La ruta de la imagen guardada en la base de datos.
 * @returns La URL formateada o una imagen por defecto.
 */
export const obtenerUrlImagen = (ruta: string | null | undefined): string => {
  if (!ruta) return 'https://i.pravatar.cc/150?img=11';

  // Si ya es una URL completa o un data URI, la retornamos tal cual
  if (ruta.startsWith('http') || ruta.startsWith('data:')) {
    return ruta;
  }

  // Si la ruta ya contiene /media/, nos aseguramos de que empiece con /
  if (ruta.includes('/media/')) {
    return ruta.startsWith('/') ? ruta : `/${ruta}`;
  }

  // Si no contiene /media/, se lo agregamos
  const rutaLimpia = ruta.startsWith('/') ? ruta.substring(1) : ruta;
  return `${MEDIA_BASE_URL}${rutaLimpia}`;
};
