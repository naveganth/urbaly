declare module 'piexifjs' {
  type ExifDict = Record<string, Record<string | number, unknown>>;
  const piexif: {
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
    GPSIFD: Record<string, number>;
    TAGS: Record<string, Record<string, { name: string; type: string }>>;
    load(dataUrl: string): ExifDict;
    dump(exifDict: ExifDict): string;
    insert(exifBytes: string, jpegDataUrl: string): string;
    remove(jpegDataUrl: string): string;
  };
  export default piexif;
}
