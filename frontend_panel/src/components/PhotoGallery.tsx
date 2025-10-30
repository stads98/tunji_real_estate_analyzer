// v254_change: Multi-photo gallery component with drag-to-reorder and carousel preview
import React, { useState, useCallback, useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Upload,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { dashboardService } from "../services/dashboard.service";

const MAX_PHOTOS = 20; // Increased limit for VPS storage
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (matches backend)

interface Photo {
  id: string;
  url: string;
  isPrimary?: boolean;
  fileName?: string;
  originalName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadFailed?: boolean;
  uploading?: boolean;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
}

export function PhotoGallery({ photos, onChange }: PhotoGalleryProps) {
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false); // Start collapsed by default
  const [uploading, setUploading] = useState(false);

  // Memoize to prevent re-render loops
  const photoList = useMemo(() => photos || [], [photos]);

  const uploadFileToVPS = async (file: File): Promise<Photo> => {
    try {
      const result = await dashboardService.uploadFile(file);
      console.log("File uploaded ulr:",result.fileUrl);
      return {
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: result.fileUrl, // VPS file URL
        fileName: result.fileName,
        originalName: result.originalName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        isPrimary: false,
      };
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error(`Failed to upload: ${file.name}`);
    }
  };

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      // Ensure we have a properly typed File[] so 'file' is not unknown
      const filesArray = Array.from(files) as File[];

      const currentCount = photoList.length;
      const availableSlots = MAX_PHOTOS - currentCount;

      if (availableSlots <= 0) {
        toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
        event.target.value = ""; // Reset input
        return;
      }

      const filesToProcess = filesArray.slice(0, availableSlots);

      setUploading(true);

      // Show loading toast for multiple files
      if (filesToProcess.length > 1) {
        toast.info(`Uploading ${filesToProcess.length} photos...`);
      }

      try {
        // Create temporary preview photos first
        const previewPhotos: Photo[] = [];

        for (const file of filesToProcess) {
          if (!file.type.startsWith("image/")) {
            toast.error(`Invalid file type: ${file.name}`);
            continue;
          }

          if (file.size > MAX_FILE_SIZE) {
            toast.error(`File too large: ${file.name} (max 10MB)`);
            continue;
          }

          // Create preview with uploading state
          const previewUrl = URL.createObjectURL(file);
          const previewPhoto: Photo = {
            id: `preview-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            url: previewUrl,
            fileName: file.name,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            isPrimary: false,
            uploading: true,
          };
          previewPhotos.push(previewPhoto);
        }

        // Add preview photos immediately for better UX
        const updatedPhotos = [...photoList, ...previewPhotos];
        onChange(updatedPhotos);

        // Upload files to VPS
        const uploadPromises = filesToProcess.map((file, index) =>
          uploadFileToVPS(file).catch((error) => {
            // Mark this specific photo as failed
            const failedPhotoIndex = photoList.length + index;
            const failedPhotos = [...updatedPhotos];
            if (failedPhotos[failedPhotoIndex]) {
              failedPhotos[failedPhotoIndex].uploadFailed = true;
              failedPhotos[failedPhotoIndex].uploading = false;
            }
            onChange(failedPhotos);
            throw error;
          })
        );

        const uploadResults = await Promise.allSettled(uploadPromises);

        // Replace preview photos with uploaded results
        const finalPhotos = [...photoList];

        uploadResults.forEach((result) => {
          if (result.status === "fulfilled") {
            finalPhotos.push(result.value);
          }
          // Failed uploads are already handled in the catch above
        });

        // Clean up preview blob URLs
        previewPhotos.forEach((photo) => {
          if (photo.url.startsWith("blob:")) {
            URL.revokeObjectURL(photo.url);
          }
        });

        // Set first photo as primary if no primary exists
        if (finalPhotos.length > 0 && !finalPhotos.some((p) => p.isPrimary)) {
          finalPhotos[0].isPrimary = true;
        }

        onChange(finalPhotos);

        // Show success summary
        const successfulUploads = uploadResults.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const failedUploads = uploadResults.filter(
          (r) => r.status === "rejected"
        ).length;

        if (successfulUploads > 0) {
          toast.success(
            `Uploaded ${successfulUploads} photo${
              successfulUploads > 1 ? "s" : ""
            } to server`
          );
        }
        if (failedUploads > 0) {
          toast.error(
            `${failedUploads} photo${
              failedUploads > 1 ? "s" : ""
            } failed to upload`
          );
        }
      } catch (error) {
        console.error("Error processing images:", error);
        toast.error("Failed to process photos");
      } finally {
        setUploading(false);
        // Reset input to allow re-uploading same file
        event.target.value = "";
      }
    },
    [photoList, onChange]
  );

  const handleSetPrimary = useCallback(
    (photoId: string) => {
      const updated = photoList.map((p) => ({
        ...p,
        isPrimary: p.id === photoId,
      }));
      onChange(updated);
      toast.success("Primary photo updated");
    },
    [photoList, onChange]
  );

  const handleDelete = useCallback(
    async (photoId: string) => {
      const photoToDelete = photoList.find((p) => p.id === photoId);
      if (!photoToDelete) return;

      try {
        // If photo was uploaded to VPS, delete it from server
        if (photoToDelete.fileName && !photoToDelete.uploadFailed) {
          await dashboardService.deleteFile(photoToDelete.fileName);
        }

        const remaining = photoList.filter((p) => p.id !== photoId);

        // Revoke object URL to prevent memory leaks (only for blob URLs, not base64 data URLs)
        if (photoToDelete?.url.startsWith("blob:")) {
          URL.revokeObjectURL(photoToDelete.url);
        }

        // If deleted photo was primary and there are remaining photos, set first as primary
        if (photoToDelete?.isPrimary && remaining.length > 0) {
          remaining[0].isPrimary = true;
        }

        onChange(remaining);
        toast.success("Photo deleted");
      } catch (error) {
        console.error("Failed to delete photo:", error);
        toast.error("Failed to delete photo from server");
      }
    },
    [photoList, onChange]
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();

      if (draggedIndex === null || draggedIndex === index) return;

      const reordered = [...photoList];
      const [draggedItem] = reordered.splice(draggedIndex, 1);
      reordered.splice(index, 0, draggedItem);

      onChange(reordered);
      setDraggedIndex(index);
    },
    [draggedIndex, photoList, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const openCarousel = useCallback((index: number) => {
    setCarouselIndex(index);
    setCarouselOpen(true);
  }, []);

  const closeCarousel = useCallback(() => {
    setCarouselOpen(false);
  }, []);

  const nextPhoto = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % photoList.length);
  }, [photoList.length]);

  const prevPhoto = useCallback(() => {
    setCarouselIndex(
      (prev) => (prev - 1 + photoList.length) % photoList.length
    );
  }, [photoList.length]);

  // Filter out uploading photos for display (they're already in the list as previews)
  const displayPhotos = photoList.filter((photo) => !photo.uploading);

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-gray-200 bg-gray-50/30">
          <CollapsibleTrigger asChild>
            <button className="w-full p-2 flex items-center justify-between hover:bg-gray-100/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Property Photos</span>
                {displayPhotos.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({displayPhotos.length}/{MAX_PHOTOS})
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-2 pt-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  Click to enlarge • Drag to reorder • Max {MAX_PHOTOS} photos
                </p>
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={displayPhotos.length >= MAX_PHOTOS || uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={displayPhotos.length >= MAX_PHOTOS || uploading}
                    asChild
                  >
                    <span className="cursor-pointer text-xs h-7">
                      {uploading ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3 mr-1" />
                      )}
                      {uploading
                        ? "Uploading..."
                        : `Add (${displayPhotos.length}/${MAX_PHOTOS})`}
                    </span>
                  </Button>
                </label>
              </div>

              {displayPhotos.length === 0 ? (
                <div className="text-center py-3 text-muted-foreground border border-dashed rounded-lg">
                  <Upload className="w-5 h-5 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No photos yet</p>
                  <p className="text-xs opacity-70 mt-1">
                    Upload to showcase the property
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  {displayPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className="relative group cursor-move"
                    >
                      <div
                        onClick={() => openCarousel(index)}
                        className="aspect-square rounded overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer"
                      >
                        <img
                          src={photo.url}
                          alt={`Property ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {photo.uploadFailed && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <div className="bg-red-600 text-white text-[10px] px-1 rounded">
                              Failed
                            </div>
                          </div>
                        )}
                      </div>

                      {photo.isPrimary && (
                        <div className="absolute top-0.5 left-0.5 bg-blue-600 text-white text-[10px] px-1 py-0.5 rounded">
                          1st
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant={photo.isPrimary ? "default" : "secondary"}
                          size="sm"
                          className={`h-5 w-5 p-0 ${
                            photo.isPrimary
                              ? "bg-blue-600 hover:bg-blue-700"
                              : ""
                          }`}
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            if (!photo.isPrimary) {
                              handleSetPrimary(photo.id);
                            }
                          }}
                          disabled={photo.isPrimary || photo.uploadFailed}
                          title={
                            photo.isPrimary ? "Primary photo" : "Set as primary"
                          }
                        >
                          <Star
                            className={`w-2.5 h-2.5 ${
                              photo.isPrimary ? "fill-current" : ""
                            }`}
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            handleDelete(photo.id);
                          }}
                          title="Delete photo"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload progress indicator */}
              {uploading && (
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  Uploading photos... Please don't close the page.
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Carousel Modal */}
      <Dialog open={carouselOpen} onOpenChange={setCarouselOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogTitle className="sr-only">Photo Gallery</DialogTitle>
          <DialogDescription className="sr-only">
            Browse through property photos using navigation controls
          </DialogDescription>
          <div className="relative">
            {displayPhotos.length > 0 && (
              <>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <img
                    src={displayPhotos[carouselIndex]?.url}
                    alt={`Property ${carouselIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  Photo {carouselIndex + 1} of {displayPhotos.length}
                  {displayPhotos[carouselIndex]?.isPrimary && " • Primary"}
                </div>

                {displayPhotos.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      onClick={prevPhoto}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      onClick={nextPhoto}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 left-4"
                  onClick={closeCarousel}
                >
                  <X className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
