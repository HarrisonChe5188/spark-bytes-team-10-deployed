"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Cropper from "react-easy-crop";

const INPUT_CLASSES = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent";

const CHARACTER_LIMITS = {
  title: 50,
  location: 100,
  description: 250,
} as const;

type FieldName =
  | "title"
  | "location"
  | "campusLocation"
  | "description"
  | "quantity"
  | "startTime"
  | "endTime";

/**
 * Converts an EST/EDT datetime to UTC ISO string for storage in Supabase.
 * Handles DST automatically (EST = UTC-5, EDT = UTC-4).
 */
function convertESTToUTC(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  const testUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const estFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const estParts = estFormatter.formatToParts(testUTC);
  const estHour = parseInt(estParts.find(p => p.type === 'hour')?.value || '12');
  const offsetHours = 12 - estHour;
  
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  utcDate.setUTCHours(utcDate.getUTCHours() + offsetHours);
  
  return utcDate.toISOString();
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

// Simple cropped image blob using the pixel crop returned from the cropper.
// This intentionally ignores rotation to keep the output predictable and
// to match what the user sees in the cropper preview. If you need rotated
// crops, we can add a more advanced implementation later.
async function getCroppedImg(imageSrc: string, pixelCrop: any) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  // Use the pixelCrop directly. react-easy-crop provides pixel coordinates
  // relative to the source image when using `onCropComplete`.
  const { width, height, x, y } = pixelCrop;

  canvas.width = Math.round(width);
  canvas.height = Math.round(height);

  // draw the cropped area from the source image to the canvas
  ctx.drawImage(
    image,
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
    0,
    0,
    Math.round(width),
    Math.round(height)
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function PostPageContent() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<"how-it-works" | "form">("how-it-works");
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Cropping state
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [campusLocation, setCampusLocation] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const todayDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const isToday = (selectedDate: string): boolean => {
    return selectedDate === todayDate;
  };

  const getSelectedDate = (): string => {
    return date || todayDate;
  };

  const clearFieldError = (fieldName: FieldName): void => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleFieldChange = (
    value: string,
    setter: (value: string) => void,
    fieldName: FieldName
  ) => {
    setter(value);
    if (fieldErrors[fieldName]) {
      clearFieldError(fieldName);
    }
  };

  const validateTimeRelationship = (
    selectedDate: string,
    startTime: string,
    endTime: string
  ): void => {
    if (!startTime || !endTime) return;

    if (startTime >= endTime) {
      setFieldErrors((prev) => ({
        ...prev,
        endTime: "End time must be after start time",
      }));
    } else {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors.endTime === "End time must be after start time") {
          delete newErrors.endTime;
        }
        return newErrors;
      });
    }
  };

  const validateCharacterLimit = (
    value: string,
    fieldName: "title" | "location" | "description",
    limit: number
  ): string | null => {
    if (!value.trim())
      return `${
        fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
      } is required`;
    if (value.length > limit)
      return `${
        fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
      } must be ${limit} characters or less`;
    return null;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const selectedDate = getSelectedDate();
    const now = new Date();
    const isSelectedToday = isToday(selectedDate);

    const titleError = validateCharacterLimit(
      title,
      "title",
      CHARACTER_LIMITS.title
    );
    if (titleError) errors.title = titleError;

    const locationError = validateCharacterLimit(
      location,
      "location",
      CHARACTER_LIMITS.location
    );
    if (locationError) errors.location = locationError;

    if (!campusLocation) errors.campusLocation = "Campus location is required";

    const descriptionError = validateCharacterLimit(
      description,
      "description",
      CHARACTER_LIMITS.description
    );
    if (descriptionError) errors.description = descriptionError;

    if (!quantity || Number(quantity) < 1)
      errors.quantity = "Quantity must be at least 1";

    if (!endTime) {
      errors.endTime = "End time is required";
    } else {
      const endDateTimeUTC = new Date(convertESTToUTC(selectedDate, endTime));
      if (endDateTimeUTC <= now) {
        errors.endTime = "End time must be in the future";
      }
    }

    if (!isSelectedToday && !startTime) {
      errors.startTime = "Start time is required for future dates";
    } else if (startTime) {
      const startDateTimeUTC = new Date(
        convertESTToUTC(selectedDate, startTime)
      );
      if (startDateTimeUTC <= now) {
        errors.startTime = "Start time must be in the future";
      }
      if (endTime) {
        const endDateTimeUTC = new Date(convertESTToUTC(selectedDate, endTime));
        if (endDateTimeUTC <= startDateTimeUTC) {
          errors.endTime = "End time must be after start time";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostLoading(true);
    setFieldErrors({});
    
    if (!validateForm()) {
      setPostLoading(false);
      return;
    }

    try {
      const selectedDate = getSelectedDate();
      const startDateTime = startTime ? convertESTToUTC(selectedDate, startTime) : null;
      const endDateTime = convertESTToUTC(selectedDate, endTime);

      // Use server API endpoint to create post with image
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('location', location.trim() || '');
      formData.append("campus_location", campusLocation);
      formData.append('description', description.trim() || '');
      formData.append('quantity', String(Number(quantity) || 1));
      if (startDateTime) formData.append('start_time', startDateTime);
      formData.append('end_time', endDateTime);
      if (selectedFile) {
        if (selectedFile instanceof File) {
          formData.append('image', selectedFile, selectedFile.name);
        } else {
          formData.append('image', selectedFile);
        }
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create post');
      }

      window.dispatchEvent(new CustomEvent("postCreated"));
      router.push("/home");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setFieldErrors({ submit: message });
      setPostLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {currentPage === "how-it-works" ? (
        <div className="space-y-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/home")}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 -ml-2"
          >
            ← Back to Home
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              How it works
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Share food with the BU community! Fill out the form below to
              create a post. Include the time window when the food is available,
              the location where people can pick it up, and a description of
              what you&apos;re sharing. Once posted, others can express interest
              and come collect the food during the specified time.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Step 1: Fill out the form
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Provide details about the food you&apos;re sharing, including
                title, availability times, location, and quantity.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Step 2: Post your listing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Once you submit, your post will appear in the feed where others
                can see it and express interest.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Step 3: Share the food
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Be available at the specified time and location to share your
                food with community members.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setCurrentPage("form")}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            Continue to Form
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentPage("how-it-works")}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 -ml-2"
          >
            ← Back to How it works
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Create a Food Post
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Fill out the form below to share your food with the BU community.
            </p>
          </div>
          <form onSubmit={handlePostSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                className={`${INPUT_CLASSES} ${
                  fieldErrors.title ? "border-red-500" : ""
                }`}
                placeholder="e.g., Fresh Pizza Slices"
                value={title}
                maxLength={CHARACTER_LIMITS.title}
                onChange={(e) =>
                  handleFieldChange(e.target.value, setTitle, "title")
                }
              />
              <div className="flex justify-between items-center mt-1">
                {fieldErrors.title && (
                  <p className="text-sm text-red-600">{fieldErrors.title}</p>
                )}
                <p
                  className={`text-xs ml-auto ${
                    title.length > CHARACTER_LIMITS.title * 0.9
                      ? "text-red-600"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {title.length}/{CHARACTER_LIMITS.title}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date{" "}
                <span className="text-gray-500 dark:text-gray-400 font-normal">
                  (leave empty for today)
                </span>
              </label>
              <input
                type="date"
                className={INPUT_CLASSES}
                value={date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setDate(newDate);
                  const selectedDate = newDate || todayDate;

                  clearFieldError("startTime");
                  clearFieldError("endTime");

                  if (startTime && endTime) {
                    validateTimeRelationship(selectedDate, startTime, endTime);
                  }
                }}
                min={todayDate}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Time{" "}
                  {isToday(getSelectedDate()) ? (
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      (leave empty for &quot;Now&quot;)
                    </span>
                  ) : (
                    "*"
                  )}
                </label>
                <input
                  type="time"
                  className={`${INPUT_CLASSES} ${
                    fieldErrors.startTime ? "border-red-500" : ""
                  }`}
                  value={startTime}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    handleFieldChange(newStartTime, setStartTime, "startTime");
                    if (newStartTime && endTime) {
                      validateTimeRelationship(
                        getSelectedDate(),
                        newStartTime,
                        endTime
                      );
                    }
                  }}
                />
                {fieldErrors.startTime && (
                  <p className="text-sm text-red-600 mt-1">
                    {fieldErrors.startTime}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  className={`${INPUT_CLASSES} ${
                    fieldErrors.endTime ? "border-red-500" : ""
                  }`}
                  value={endTime}
                  onChange={(e) => {
                    const newEndTime = e.target.value;
                    const isTimeRelationshipError =
                      fieldErrors.endTime ===
                      "End time must be after start time";
                    handleFieldChange(newEndTime, setEndTime, "endTime");
                    if (fieldErrors.endTime && !isTimeRelationshipError) {
                      clearFieldError("endTime");
                    }
                    if (startTime && newEndTime) {
                      validateTimeRelationship(
                        getSelectedDate(),
                        startTime,
                        newEndTime
                      );
                    } else if (isTimeRelationshipError) {
                      clearFieldError("endTime");
                    }
                  }}
                />
                {fieldErrors.endTime && (
                  <p className="text-sm text-red-600 mt-1">
                    {fieldErrors.endTime}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Specific Location *
              </label>
              <input
                className={`${INPUT_CLASSES} ${
                  fieldErrors.location ? "border-red-500" : ""
                }`}
                placeholder="e.g., Student Center, Room 205"
                value={location}
                maxLength={CHARACTER_LIMITS.location}
                onChange={(e) =>
                  handleFieldChange(e.target.value, setLocation, "location")
                }
              />
              <div className="flex justify-between items-center mt-1">
                {fieldErrors.location && (
                  <p className="text-sm text-red-600">{fieldErrors.location}</p>
                )}
                <p
                  className={`text-xs ml-auto ${
                    location.length > CHARACTER_LIMITS.location * 0.9
                      ? "text-red-600"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {location.length}/{CHARACTER_LIMITS.location}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Campus Location *
              </label>
              <select
                className={`${INPUT_CLASSES} ${
                  fieldErrors.campusLocation ? "border-red-500" : ""
                }`}
                value={campusLocation}
                onChange={(e) =>
                  handleFieldChange(
                    e.target.value,
                    setCampusLocation,
                    "campusLocation"
                  )
                }
              >
                <option value="">Select a campus</option>
                <option value="South Campus">South Campus</option>
                <option value="North Campus">North Campus</option>
                <option value="East Campus">East Campus</option>
                <option value="West Campus">West Campus</option>
              </select>
              {fieldErrors.campusLocation && (
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.campusLocation}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                className={`${INPUT_CLASSES} ${
                  fieldErrors.quantity ? "border-red-500" : ""
                }`}
                placeholder="e.g., 5"
                value={quantity}
                onChange={(e) =>
                  handleFieldChange(e.target.value, setQuantity, "quantity")
                }
              />
              {fieldErrors.quantity && (
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.quantity}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                className={`${INPUT_CLASSES} resize-none ${
                  fieldErrors.description ? "border-red-500" : ""
                }`}
                placeholder="Describe the food item..."
                rows={3}
                value={description}
                maxLength={CHARACTER_LIMITS.description}
                onChange={(e) =>
                  handleFieldChange(
                    e.target.value,
                    setDescription,
                    "description"
                  )
                }
              />
              <div className="flex justify-between items-center mt-1">
                {fieldErrors.description && (
                  <p className="text-sm text-red-600">
                    {fieldErrors.description}
                  </p>
                )}
                <p
                  className={`text-xs ml-auto ${
                    description.length > CHARACTER_LIMITS.description * 0.9
                      ? "text-red-600"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {description.length}/{CHARACTER_LIMITS.description}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setPreviewUrl(url);
                    setIsEditingImage(true);
                    setCroppedBlob(null);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    setRotation(0);
                  } else {
                    setPreviewUrl(null);
                  }
                }}
              />

              {/* Cropping UI */}
              {isEditingImage && previewUrl && (
                <div className="mt-2">
                  <div className="relative w-full h-64 bg-gray-50">
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={zoom}
                      rotation={rotation}
                      aspect={4 / 3}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onRotationChange={setRotation}
                      onCropComplete={(_croppedArea, croppedAreaPixelsParam) =>
                        setCroppedAreaPixels(croppedAreaPixelsParam)
                      }
                    />
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <label className="flex-1">
                      Zoom
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full"
                      />
                    </label>

                    <label className="w-32">
                      Rotate
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={rotation}
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={async () => {
                        try {
                          const blob = await getCroppedImg(previewUrl, croppedAreaPixels);
                          if (blob) {
                            setCroppedBlob(blob);
                            const fileName = selectedFile?.name || "image.png";
                            const croppedFile = new File([blob], fileName, {
                              type: blob.type || "image/png",
                            });
                            setSelectedFile(croppedFile);
                            try {
                              URL.revokeObjectURL(previewUrl);
                            } catch (e) {}
                            setPreviewUrl(URL.createObjectURL(croppedFile));
                            setIsEditingImage(false);
                          }
                        } catch (err) {
                          console.error("Crop failed:", err);
                        }
                      }}
                    >
                      Apply Crop
                    </Button>

                    <Button
                      onClick={() => {
                        setIsEditingImage(false);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {previewUrl && !isEditingImage && (
                <img
                  src={previewUrl}
                  alt="preview"
                  className="mt-2 w-full h-40 object-cover rounded"
                />
              )}
            </div>
            <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="acknowledge"
                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-relaxed"
              >
                I acknowledge that I am posting legitimate food items and will
                be available at the specified time and location. I understand
                that false or misleading posts may result in account
                restrictions.
              </label>
            </div>
            <Button
              type="submit"
              disabled={postLoading || !acknowledged}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
            >
              {postLoading ? "Creating..." : "Create Post"}
            </Button>
          </form>
          {fieldErrors.submit && (
            <p className="text-center text-sm text-red-600 mt-4">
              {fieldErrors.submit}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PostPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
      } else {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, [router, supabase]);

  if (isAuthenticated === null) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <PostPageContent />;
}
