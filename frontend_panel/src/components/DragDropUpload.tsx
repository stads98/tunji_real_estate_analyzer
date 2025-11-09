import { useState, useCallback, ReactNode } from 'react';
import { Upload } from 'lucide-react';

interface DragDropUploadProps {
  onFilesSelected: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  dropZoneClassName?: string;
  showDropIndicator?: boolean;
}

export function DragDropUpload({
  onFilesSelected,
  accept = 'image/*',
  multiple = false,
  disabled = false,
  children,
  className = '',
  dropZoneClassName = '',
  showDropIndicator = true,
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  }, [disabled, onFilesSelected]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${className}`}
    >
      {isDragging && showDropIndicator && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center bg-primary/20 border-2 border-primary border-dashed rounded-lg pointer-events-none ${dropZoneClassName}`}>
          <div className="text-center bg-background/90 p-4 rounded-lg shadow-lg">
            <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-primary">Drop {multiple ? 'photos' : 'photo'} here</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
