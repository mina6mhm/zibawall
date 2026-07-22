// components/business-form/imageUtils.ts

export const compressImage = (file: File): Promise<File> => {
  const SIZE_THRESHOLD = 2 * 1024 * 1024;
  const MAX_DIMENSION = 2048;
  const QUALITY = 0.85;

  if (file.size <= SIZE_THRESHOLD) return Promise.resolve(file);

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const result = blob.size < file.size
            ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
            : file;
          resolve(result);
        },
        'image/jpeg',
        QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
};

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

export const validateAndCompress = async (file: File): Promise<File | null> => {
  if (file.size > MAX_UPLOAD_SIZE) {
    alert(`فایل "${file.name}" بیش از ۵۰ مگابایت است و قابل آپلود نیست.`);
    return null;
  }
  return await compressImage(file);
};
