"use client";

import { Button } from "./ui/button";
import { Clock, MapPin } from "lucide-react";
import { Post } from "@/types/post";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface PostCardProps {
  post: Post;
  isReserved?: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
  onPostUpdated?: () => void;
  authorNickname?: string | null;
  authorAvatar?: string | null;
}

const CHARACTER_LIMITS = {
  title: 50,
  location: 100,
  description: 250,
} as const;

const INPUT_CLASSES = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent";

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EST_TIMEZONE = 'America/New_York';

const estFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: EST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

/**
 * Converts a UTC datetime string to EST/EDT date and time strings for form inputs.
 */
function convertUTCToEST(utcString: string): { date: string; time: string } {
  const date = new Date(utcString);
  const estDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const year = estDate.getFullYear();
  const month = String(estDate.getMonth() + 1).padStart(2, '0');
  const day = String(estDate.getDate()).padStart(2, '0');
  const hours = String(estDate.getHours()).padStart(2, '0');
  const minutes = String(estDate.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  };
}

/**
 * Converts an EST/EDT datetime to UTC ISO string for storage in Supabase.
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

export default function PostCard({
  post,
  isReserved: initialIsReserved = false,
  currentUserId = null,
  isAdmin = false,
  onPostUpdated,
  authorNickname = null,
  authorAvatar = null,
}: PostCardProps) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isReserved, setIsReserved] = useState(initialIsReserved);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(post.title);
  const [editLocation, setEditLocation] = useState(post.location || "");
  const [editCampusLocation, setEditCampusLocation] = useState(
    post.campus_location || ""
  );
  const [editDescription, setEditDescription] = useState(
    post.description || ""
  );
  const [editQuantity, setEditQuantity] = useState(String(post.quantity || 1));
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [editRemoveImage, setEditRemoveImage] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<
    Record<string, string>
  >({});

  // Update isReserved when prop changes
  useEffect(() => {
    setIsReserved(initialIsReserved);
  }, [initialIsReserved]);

  // Initialize edit form with post data
  useEffect(() => {
    if (isEditModalOpen) {
      setEditTitle(post.title);
      setEditLocation(post.location || "");
      setEditCampusLocation(post.campus_location || "");
      setEditDescription(post.description || "");
      setEditQuantity(String(post.quantity || 1));

      // Convert UTC times to EST for form
      if (post.end_time) {
        const endEST = convertUTCToEST(post.end_time);
        setEditDate(endEST.date);
        setEditEndTime(endEST.time);
      }
      if (post.start_time) {
        const startEST = convertUTCToEST(post.start_time);
        setEditStartTime(startEST.time);
      }

      // Set image preview
      if (post.image_path) {
        const { data } = supabase.storage
          .from("food_pictures")
          .getPublicUrl(post.image_path);
        setEditPreviewUrl(data?.publicUrl || null);
      } else {
        setEditPreviewUrl(null);
      }
      setEditRemoveImage(false);
      setEditSelectedFile(null);
      setEditFieldErrors({});
    }
  }, [isEditModalOpen, post, supabase]);

  const todayDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // Helper functions for edit form (matching create form logic)
  type EditFieldName =
    | "title"
    | "location"
    | "campusLocation"
    | "description"
    | "quantity"
    | "startTime"
    | "endTime";

  const isEditDateToday = (selectedDate: string): boolean => {
    return selectedDate === todayDate;
  };

  const getSelectedDate = (): string => {
    return editDate || todayDate;
  };

  const clearFieldError = (fieldName: EditFieldName): void => {
    setEditFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleFieldChange = (
    value: string,
    setter: (value: string) => void,
    fieldName: EditFieldName
  ) => {
    setter(value);
    if (editFieldErrors[fieldName]) {
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
      setEditFieldErrors((prev) => ({
        ...prev,
        endTime: "End time must be after start time",
      }));
    } else {
      setEditFieldErrors((prev) => {
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

  // Prepare image URL if provided (public bucket flow)
  let imageUrl: string | null = "/fallback.png";
  try {
    if (post.image_path) {
      const { data } = supabase.storage
        .from("food_pictures")
        .getPublicUrl(post.image_path);
      imageUrl = data?.publicUrl || "/fallback.png";
    }
  } catch {
    // ignore
    imageUrl = "/fallback.png";
  }

  const handleInterested = async () => {
    if (isLoading || !post.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ post_id: post.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reserve food");
      }

      setIsReserved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};
    const selectedDate = getSelectedDate();
    const now = new Date();
    const isSelectedToday = isEditDateToday(selectedDate);

    const titleError = validateCharacterLimit(
      editTitle,
      "title",
      CHARACTER_LIMITS.title
    );
    if (titleError) errors.title = titleError;

    const locationError = validateCharacterLimit(
      editLocation,
      "location",
      CHARACTER_LIMITS.location
    );
    if (locationError) errors.location = locationError;

    if (!editCampusLocation)
      errors.campusLocation = "Campus location is required";

    const descriptionError = validateCharacterLimit(
      editDescription,
      "description",
      CHARACTER_LIMITS.description
    );
    if (descriptionError) errors.description = descriptionError;

    if (!editQuantity || Number(editQuantity) < 1)
      errors.quantity = "Quantity must be at least 1";

    if (!editEndTime) {
      errors.endTime = "End time is required";
    } else {
      const endDateTimeUTC = new Date(
        convertESTToUTC(selectedDate, editEndTime)
      );
      if (endDateTimeUTC <= now) {
        errors.endTime = "End time must be in the future";
      }
    }

    if (!isSelectedToday && !editStartTime) {
      errors.startTime = "Start time is required for future dates";
    } else if (editStartTime) {
      const startDateTimeUTC = new Date(
        convertESTToUTC(selectedDate, editStartTime)
      );
      if (startDateTimeUTC <= now) {
        errors.startTime = "Start time must be in the future";
      }
      if (editEndTime) {
        const endDateTimeUTC = new Date(
          convertESTToUTC(selectedDate, editEndTime)
        );
        if (endDateTimeUTC <= startDateTimeUTC) {
          errors.endTime = "End time must be after start time";
        }
      }
    }

    setEditFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setEditFieldErrors({});

    if (!validateEditForm()) {
      setIsSaving(false);
      return;
    }

    try {
      const selectedDate = getSelectedDate();
      const startDateTime = editStartTime
        ? convertESTToUTC(selectedDate, editStartTime)
        : null;
      const endDateTime = convertESTToUTC(selectedDate, editEndTime);

      const formData = new FormData();
      formData.append("id", String(post.id));
      formData.append("title", editTitle.trim());
      formData.append("location", editLocation.trim() || "");
      formData.append("campus_location", editCampusLocation);
      formData.append("description", editDescription.trim() || "");
      formData.append("quantity", String(Number(editQuantity) || 1));
      if (startDateTime) formData.append("start_time", startDateTime);
      formData.append("end_time", endDateTime);
      if (editSelectedFile) {
        formData.append("image", editSelectedFile);
      }
      if (editRemoveImage) {
        formData.append("remove_image", "true");
      }

      const response = await fetch("/api/posts", {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update post");
      }

      setIsEditModalOpen(false);
      if (onPostUpdated) {
        onPostUpdated();
      } else {
        window.dispatchEvent(new CustomEvent("postUpdated"));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setEditFieldErrors({ submit: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!post.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts?id=${post.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete post");
      }

      setIsDeleteConfirmOpen(false);
      if (onPostUpdated) {
        onPostUpdated();
      } else {
        window.dispatchEvent(new CustomEvent("postUpdated"));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatPostedTime = (dateString?: string) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getESTParts = (date: Date) => {
    const parts = estFormatter.formatToParts(date);
    return {
      year: parseInt(parts.find((p) => p.type === "year")?.value || "0"),
      month: parseInt(parts.find((p) => p.type === "month")?.value || "0"),
      day: parseInt(parts.find((p) => p.type === "day")?.value || "0"),
      hour: parseInt(parts.find((p) => p.type === "hour")?.value || "0"),
      minute: parseInt(parts.find((p) => p.type === "minute")?.value || "0"),
    };
  };

  const getNowEST = () => getESTParts(new Date());

  const isSameDay = (
    date1: ReturnType<typeof getESTParts>,
    date2: ReturnType<typeof getESTParts>
  ) => {
    return (
      date1.year === date2.year &&
      date1.month === date2.month &&
      date1.day === date2.day
    );
  };

  const isToday = (dateEST: ReturnType<typeof getESTParts>) => {
    const nowEST = getNowEST();
    return isSameDay(dateEST, nowEST);
  };

  const isTomorrow = (dateEST: ReturnType<typeof getESTParts>) => {
    const nowEST = getNowEST();
    const tomorrowEST = new Date(nowEST.year, nowEST.month - 1, nowEST.day + 1);
    return (
      dateEST.year === tomorrowEST.getFullYear() &&
      dateEST.month === tomorrowEST.getMonth() + 1 &&
      dateEST.day === tomorrowEST.getDate()
    );
  };

  const formatTimeOnly = (dateTimeString: string): string => {
    const dateEST = getESTParts(new Date(dateTimeString));
    const hour12 = dateEST.hour % 12 || 12;
    const ampm = dateEST.hour >= 12 ? "PM" : "AM";
    return `${hour12}:${String(dateEST.minute).padStart(2, "0")} ${ampm}`;
  };

  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return null;

    const dateEST = getESTParts(new Date(dateTimeString));
    const timeStr = formatTimeOnly(dateTimeString);

    if (isToday(dateEST)) {
      return `Today at ${timeStr}`;
    } else if (isTomorrow(dateEST)) {
      return `Tomorrow at ${timeStr}`;
    } else {
      return `${MONTH_NAMES[dateEST.month - 1]} ${dateEST.day} at ${timeStr}`;
    }
  };

  const formatCreatedDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const isPostEnded = () => {
    if (!post.end_time) return false;
    return new Date(post.end_time) < new Date();
  };

  const postEnded = isPostEnded();
  const canManage = isAdmin || currentUserId === post.user_id;

  const formatNowToEndTime = (endTime: string): string => {
    const dateEST = getESTParts(new Date(endTime));
    return isToday(dateEST)
      ? `Now to ${formatTimeOnly(endTime)}`
      : `Now to ${formatDateTime(endTime)}`;
  };

  const formatTimeRange = (startTime: string, endTime: string): string => {
    const startEST = getESTParts(new Date(startTime));
    const endEST = getESTParts(new Date(endTime));

    if (!isSameDay(startEST, endEST)) {
      return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
    }

    const startTimeStr = formatTimeOnly(startTime);
    const endTimeStr = formatTimeOnly(endTime);

    if (isToday(startEST)) {
      return `Today from ${startTimeStr} - ${endTimeStr}`;
    } else if (isTomorrow(startEST)) {
      return `Tomorrow from ${startTimeStr} - ${endTimeStr}`;
    } else {
      return `${MONTH_NAMES[startEST.month - 1]} ${
        startEST.day
      } from ${startTimeStr} - ${endTimeStr}`;
    }
  };

  return (
    <>
      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-md shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Edit Post
              </h3>
              <form
                onSubmit={handleEditSubmit}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    className={`${INPUT_CLASSES} ${
                      editFieldErrors.title ? "border-red-500" : ""
                    }`}
                    placeholder="e.g., Fresh Pizza Slices"
                    value={editTitle}
                    maxLength={CHARACTER_LIMITS.title}
                    onChange={(e) =>
                      handleFieldChange(e.target.value, setEditTitle, "title")
                    }
                  />
                  <div className="flex justify-between items-center mt-1">
                    {editFieldErrors.title && (
                      <p className="text-sm text-red-600">
                        {editFieldErrors.title}
                      </p>
                    )}
                    <p
                      className={`text-xs ml-auto ${
                        editTitle.length > CHARACTER_LIMITS.title * 0.9
                          ? "text-red-600"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {editTitle.length}/{CHARACTER_LIMITS.title}
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
                    value={editDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setEditDate(newDate);
                      const selectedDate = newDate || todayDate;

                      clearFieldError("startTime");
                      clearFieldError("endTime");

                      if (editStartTime && editEndTime) {
                        validateTimeRelationship(
                          selectedDate,
                          editStartTime,
                          editEndTime
                        );
                      }
                    }}
                    min={todayDate}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time{" "}
                      {isEditDateToday(getSelectedDate()) ? (
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
                        editFieldErrors.startTime ? "border-red-500" : ""
                      }`}
                      value={editStartTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        handleFieldChange(
                          newStartTime,
                          setEditStartTime,
                          "startTime"
                        );
                        if (newStartTime && editEndTime) {
                          validateTimeRelationship(
                            getSelectedDate(),
                            newStartTime,
                            editEndTime
                          );
                        }
                      }}
                    />
                    {editFieldErrors.startTime && (
                      <p className="text-sm text-red-600 mt-1">
                        {editFieldErrors.startTime}
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
                        editFieldErrors.endTime ? "border-red-500" : ""
                      }`}
                      value={editEndTime}
                      onChange={(e) => {
                        const newEndTime = e.target.value;
                        const isTimeRelationshipError =
                          editFieldErrors.endTime ===
                          "End time must be after start time";
                        handleFieldChange(
                          newEndTime,
                          setEditEndTime,
                          "endTime"
                        );
                        if (
                          editFieldErrors.endTime &&
                          !isTimeRelationshipError
                        ) {
                          clearFieldError("endTime");
                        }
                        if (editStartTime && newEndTime) {
                          validateTimeRelationship(
                            getSelectedDate(),
                            editStartTime,
                            newEndTime
                          );
                        } else if (isTimeRelationshipError) {
                          clearFieldError("endTime");
                        }
                      }}
                    />
                    {editFieldErrors.endTime && (
                      <p className="text-sm text-red-600 mt-1">
                        {editFieldErrors.endTime}
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
                      editFieldErrors.location ? "border-red-500" : ""
                    }`}
                    placeholder="e.g., Student Center, Room 205"
                    value={editLocation}
                    maxLength={CHARACTER_LIMITS.location}
                    onChange={(e) =>
                      handleFieldChange(
                        e.target.value,
                        setEditLocation,
                        "location"
                      )
                    }
                  />
                  <div className="flex justify-between items-center mt-1">
                    {editFieldErrors.location && (
                      <p className="text-sm text-red-600">
                        {editFieldErrors.location}
                      </p>
                    )}
                    <p
                      className={`text-xs ml-auto ${
                        editLocation.length > CHARACTER_LIMITS.location * 0.9
                          ? "text-red-600"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {editLocation.length}/{CHARACTER_LIMITS.location}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Campus Location *
                  </label>
                  <select
                    className={`${INPUT_CLASSES} ${
                      editFieldErrors.campusLocation ? "border-red-500" : ""
                    }`}
                    value={editCampusLocation}
                    onChange={(e) =>
                      handleFieldChange(
                        e.target.value,
                        setEditCampusLocation,
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
                  {editFieldErrors.campusLocation && (
                    <p className="text-sm text-red-600 mt-1">
                      {editFieldErrors.campusLocation}
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
                      editFieldErrors.quantity ? "border-red-500" : ""
                    }`}
                    placeholder="e.g., 5"
                    value={editQuantity}
                    onChange={(e) =>
                      handleFieldChange(
                        e.target.value,
                        setEditQuantity,
                        "quantity"
                      )
                    }
                  />
                  {editFieldErrors.quantity && (
                    <p className="text-sm text-red-600 mt-1">
                      {editFieldErrors.quantity}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    className={`${INPUT_CLASSES} resize-none ${
                      editFieldErrors.description ? "border-red-500" : ""
                    }`}
                    placeholder="Describe the food item..."
                    rows={3}
                    value={editDescription}
                    maxLength={CHARACTER_LIMITS.description}
                    onChange={(e) =>
                      handleFieldChange(
                        e.target.value,
                        setEditDescription,
                        "description"
                      )
                    }
                  />
                  <div className="flex justify-between items-center mt-1">
                    {editFieldErrors.description && (
                      <p className="text-sm text-red-600">
                        {editFieldErrors.description}
                      </p>
                    )}
                    <p
                      className={`text-xs ml-auto ${
                        editDescription.length >
                        CHARACTER_LIMITS.description * 0.9
                          ? "text-red-600"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {editDescription.length}/{CHARACTER_LIMITS.description}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Image
                  </label>
                  {editPreviewUrl && !editRemoveImage && (
                    <div className="mb-2 relative">
                      <img
                        src={editPreviewUrl}
                        alt="preview"
                        className="w-full h-40 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditRemoveImage(true);
                          setEditPreviewUrl(null);
                          setEditSelectedFile(null);
                        }}
                        className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {(!editPreviewUrl || editRemoveImage) && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setEditSelectedFile(file);
                        if (file) {
                          setEditPreviewUrl(URL.createObjectURL(file));
                          setEditRemoveImage(false);
                        }
                      }}
                    />
                  )}
                </div>
                {editFieldErrors.submit && (
                  <p className="text-sm text-red-600">
                    {editFieldErrors.submit}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsDeleteConfirmOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-md shadow-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete Post
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete this post? This action cannot be
              undone and will also cancel all reservations for this post.
            </p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800 transition-all duration-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Image - mobile (full width, fixed height) */}
          {imageUrl && (
            <div className="w-full md:hidden">
              <div className="w-full h-48 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                <img
                  src={imageUrl || "/fallback.png"}
                  alt={post.title || "image"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Image - desktop (consistent width, variable height, perfect crop) */}
          {imageUrl && (
            <div className="hidden md:flex flex-shrink-0">
              <div className="w-40 h-40 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                <img
                  src={imageUrl || "/fallback.png"}
                  alt={post.title || "image"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {post.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={authorNickname || "Anonymous"}
                      className="w-5 h-5 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-md bg-gray-300 dark:bg-gray-600" />
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {authorNickname || "Anonymous"}
                  </p>
                </div>
              </div>
              {post.created_at && (
                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatPostedTime(post.created_at)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock size={16} className="text-gray-400 dark:text-gray-500" />
                <span>
                  {isPostEnded() && post.created_at
                    ? formatCreatedDate(post.created_at)
                    : post.start_time && post.end_time
                    ? formatTimeRange(post.start_time, post.end_time)
                    : post.start_time
                    ? formatDateTime(post.start_time)
                    : post.end_time
                    ? formatNowToEndTime(post.end_time)
                    : "Now"}
                </span>
              </div>

              {post.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin
                    size={16}
                    className="text-gray-400 dark:text-gray-500"
                  />
                  <span>{post.location}</span>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 pt-1">
                {post.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                    {post.description}
                  </p>
                )}
                {canManage ? (
                  <div className="flex flex-col items-end gap-1">
                    {postEnded && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        Ended
                      </span>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={handleEdit}
                        className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : !postEnded ? (
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      onClick={handleInterested}
                      disabled={isLoading || isReserved}
                      className={`font-medium whitespace-nowrap ${
                        isReserved
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      } text-white`}
                      size="sm"
                    >
                      {isLoading
                        ? "Reserving..."
                        : isReserved
                        ? "✓ Reserved"
                        : "I'm interested"}
                    </Button>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                      Ended
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
