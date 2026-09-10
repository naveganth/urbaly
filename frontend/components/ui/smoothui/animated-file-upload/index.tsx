'use client';

import * as React from 'react';
import { CloudUpload, ImagePlus, X } from 'lucide-react';
import { cn } from 'cn';

interface AnimatedFileUploadProps {
  accept?: string;
  multiple?: boolean;
  className?: string;
  onFilesSelected: (files: File[]) => void;
}

export function AnimatedFileUpload({
  accept = 'image/*',
  multiple = true,
  className,
  onFilesSelected,
}: AnimatedFileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'group relative flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/70 px-4 py-4 text-center transition-all duration-200 hover:border-primary/60 hover:bg-primary/5',
        isDragging && 'border-primary bg-primary/5 shadow-sm',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mb-3 flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 p-3 text-primary transition-transform duration-200 group-hover:scale-105">
        <CloudUpload className="size-5" />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground">Adicionar fotos da ocorrência</p>
        <p className="text-[11px] text-muted-foreground">Arraste e solte ou clique para selecionar arquivos</p>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-1">
          <ImagePlus className="size-3" />
          JPG / PNG
        </span>
        <span className="rounded-full border border-border bg-muted/40 px-2 py-1">
          {multiple ? 'Múltiplas' : 'Única'}
        </span>
      </div>
    </div>
  );
}

export default AnimatedFileUpload;
