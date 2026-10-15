const LADO_MAXIMO = 2000;
const CALIDAD_JPEG = 0.85;
/** Por debajo de esto no vale la pena recomprimir. */
const UMBRAL_BYTES = 1024 * 1024;

/**
 * Reduce una foto antes de subirla. Las fotos de teléfono pesan varios MB y
 * el servidor rechaza archivos grandes; a 2000 px un resultado de laboratorio
 * sigue leyéndose bien. Lo que no es imagen, o ya es liviano, vuelve intacto.
 */
export async function reducirImagen(archivo: File): Promise<File> {
  if (!archivo.type.startsWith('image/') || archivo.size <= UMBRAL_BYTES) return archivo;

  try {
    const mapa = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(mapa.width * escala);
    lienzo.height = Math.round(mapa.height * escala);
    lienzo.getContext('2d')?.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
    mapa.close();

    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, 'image/jpeg', CALIDAD_JPEG),
    );
    if (!blob || blob.size >= archivo.size) return archivo;

    return new File([blob], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // Formato que el navegador no decodifica: se envía tal cual y decide el servidor.
    return archivo;
  }
}

export const formatearTamano = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
