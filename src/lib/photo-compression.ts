// Compresión de fotos en cliente para reducir tamaño de IndexedDB y POST
// Lado mayor ~1600px, JPEG quality ~0.7

export async function compressPhoto(
  file: File,
  maxDimension = 1600,
  quality = 0.7
): Promise<{ name: string; mime: string; dataBase64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calcular dimensiones manteniendo aspect ratio
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        // Crear canvas y dibujar imagen redimensionada
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto 2D'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como JPEG con compresión
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];

        resolve({
          name: file.name.replace(/\..+$/, '.jpg'),
          mime: 'image/jpeg',
          dataBase64: base64,
        });
      };

      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

export async function compressPhotos(
  files: File[],
  maxPhotos = 10
): Promise<{ name: string; mime: string; dataBase64: string }[]> {
  const limited = files.slice(0, maxPhotos);
  return Promise.all(limited.map((file) => compressPhoto(file)));
}
