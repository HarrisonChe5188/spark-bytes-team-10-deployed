"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ReservedFood {
  id: string;
  created_at: string;
  status: string;
  posts: {
    id: number;
    title: string;
    description?: string;
    quantity_left: number;
    total_quantity: number;
    created_at?: string;
    image_path?: string | null;
    location?: string;
    start_time?: string;
    end_time?: string;
  };
}

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

export default function MyReservations() {
  const [reservations, setReservations] = useState<ReservedFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reservations");
      
      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }

      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      setCancelingId(reservationId);
      const response = await fetch(`/api/reservations?id=${reservationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel reservation");
      }

      // Refresh the list
      await fetchReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel reservation");
    } finally {
      setCancelingId(null);
    }
  };

  const formatPostedTime = (dateString?: string) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getESTParts = (date: Date) => {
    const parts = estFormatter.formatToParts(date);
    return {
      year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
      hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
      minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    };
  };

  const getNowEST = () => getESTParts(new Date());

  const isSameDay = (date1: ReturnType<typeof getESTParts>, date2: ReturnType<typeof getESTParts>) => {
    return date1.year === date2.year && date1.month === date2.month && date1.day === date2.day;
  };

  const isToday = (dateEST: ReturnType<typeof getESTParts>) => {
    const nowEST = getNowEST();
    return isSameDay(dateEST, nowEST);
  };

  const isTomorrow = (dateEST: ReturnType<typeof getESTParts>) => {
    const nowEST = getNowEST();
    const tomorrowEST = new Date(nowEST.year, nowEST.month - 1, nowEST.day + 1);
    return dateEST.year === tomorrowEST.getFullYear() &&
           dateEST.month === tomorrowEST.getMonth() + 1 &&
           dateEST.day === tomorrowEST.getDate();
  };

  const formatTimeOnly = (dateTimeString: string): string => {
    const dateEST = getESTParts(new Date(dateTimeString));
    const hour12 = dateEST.hour % 12 || 12;
    const ampm = dateEST.hour >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(dateEST.minute).padStart(2, '0')} ${ampm}`;
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
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const isPostEnded = (post: ReservedFood['posts']) => {
    if (!post.end_time) return false;
    return new Date(post.end_time) < new Date();
  };

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
      return `${MONTH_NAMES[startEST.month - 1]} ${startEST.day} from ${startTimeStr} - ${endTimeStr}`;
    }
  };

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        Error: {error}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>There&apos;s nothing here yet.</p>
      </div>
    );
  }

  const renderReservation = (reservation: ReservedFood, isEnded: boolean = false) => {
    const supabase = createClient();
    let imageUrl: string | null = "/fallback.png";
    try {
      if (reservation.posts.image_path) {
        const { data } = supabase.storage.from('food_pictures').getPublicUrl(reservation.posts.image_path);
        imageUrl = data?.publicUrl || "/fallback.png";
      }
    } catch {
      imageUrl = "/fallback.png";
    }

    return (
      <div 
        key={reservation.id} 
        className={`p-5 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transition-all duration-200 ${isEnded ? 'opacity-60' : 'hover:border-red-300 dark:hover:border-red-800'}`}
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Image - mobile (full width) */}
{imageUrl && (
  <div className="flex-shrink-0 w-full md:hidden">
    <img 
      src={imageUrl || '/fallback.png'} 
      alt={reservation.posts.title || 'image'} 
      className="w-full h-48 object-cover rounded-md" 
    />
  </div>
)}

{/* Image - desktop (fixed side image) */}
{imageUrl && (
  <div className="hidden md:block flex-shrink-0">
    <img 
      src={imageUrl || '/fallback.png'} 
      alt={reservation.posts.title || 'image'} 
      className="w-40 h-40 object-cover rounded-md border border-gray-200 dark:border-gray-700"
    />
  </div>
)}

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 pr-4">
                {reservation.posts.title}
              </h2>
              {reservation.posts.created_at && (
                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatPostedTime(reservation.posts.created_at)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock size={16} className="text-gray-400 dark:text-gray-500" />
                <span>
                  {isPostEnded(reservation.posts) && reservation.posts.created_at
                    ? formatCreatedDate(reservation.posts.created_at)
                    : reservation.posts.start_time && reservation.posts.end_time
                    ? formatTimeRange(reservation.posts.start_time, reservation.posts.end_time)
                    : reservation.posts.start_time
                    ? formatDateTime(reservation.posts.start_time)
                    : reservation.posts.end_time
                    ? formatNowToEndTime(reservation.posts.end_time)
                    : "Now"}
                </span>
              </div>
              
              {reservation.posts.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin size={16} className="text-gray-400 dark:text-gray-500" />
                  <span>{reservation.posts.location}</span>
                </div>
              )}
              
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 pt-1">
                {reservation.posts.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                    {reservation.posts.description}
                  </p>
                )}
                <div className="flex flex-col items-end gap-1">
                  {isEnded ? (
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                      Ended
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCancelReservation(reservation.id)}
                      disabled={cancelingId === reservation.id}
                      className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelingId === reservation.id ? "Canceling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {reservations.map((reservation) => {
        const isEnded = isPostEnded(reservation.posts);
        return renderReservation(reservation, isEnded);
      })}

      {reservations.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          <p>There&apos;s nothing here yet.</p>
        </div>
      )}
    </div>
  );
}
