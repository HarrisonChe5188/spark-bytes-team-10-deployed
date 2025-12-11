"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import NextImage from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracts the storage path from an avatar URL.
 */
function extractAvatarPath(url: string, userId: string): string | null {
  if (url.includes('/storage/v1/object/public/profile-images/')) {
    return url.split('/storage/v1/object/public/profile-images/')[1].split('?')[0];
  }
  if (url.includes('profile-images/')) {
    return url.split('profile-images/')[1].split('?')[0];
  }
  if (url.startsWith(`${userId}/`)) {
    return url;
  }
  return null;
}

/**
 * Checks if there are unsaved changes.
 */
function hasUnsavedChanges(
  nickname: string,
  savedNickname: string | null,
  file: File | null,
  preview: string | null,
  savedAvatarUrl: string | null,
  removingAvatar: boolean
): boolean {
  return (
    (nickname.trim() || null) !== (savedNickname || null) ||
    !!file ||
    (preview !== null && preview !== savedAvatarUrl) ||
    removingAvatar
  );
}

// This function creates a cropped image blob using canvas
async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const bBoxWidth =
    Math.abs(image.width * Math.cos(rotRad)) +
    Math.abs(image.height * Math.sin(rotRad));
  const bBoxHeight =
    Math.abs(image.width * Math.sin(rotRad)) +
    Math.abs(image.height * Math.cos(rotRad));

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.translate(-pixelCrop.x, -pixelCrop.y);

  ctx.save();
  // move to center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function AvatarDisplay({ url, className = "" }: { url: string | null, className?: string }) {
  return (
    <div className={`w-24 h-24 rounded-md overflow-hidden border-2 border-gray-300 ${className}`}>
      {url ? (
        <NextImage
          src={url}
          alt="Profile avatar"
          width={96}
          height={96}
          className="w-full h-full object-cover"
          unoptimized
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-xs">No Photo</span>
        </div>
      )}
    </div>
  );
}

export default function SettingsForm({
  userId,
  initialNickname = "",
  initialAvatarUrl = null,
}: {
  userId: string;
  initialNickname?: string;
  initialAvatarUrl?: string | null;
}) {
  const supabase = createClient();
  const [nickname, setNickname] = useState(initialNickname);
  const [savedNickname, setSavedNickname] = useState<string | null>(
    initialNickname || null
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialAvatarUrl);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(
    initialAvatarUrl || null
  );
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const router = useRouter();

  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
      setIsEditingAvatar(true);
    }
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixelsParam: Area) => {
    setCroppedAreaPixels(croppedAreaPixelsParam);
  }, []);

  const resetCropperState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  const handleCancel = () => {
    // Revoke blob URL if created from local file
    if (file && preview?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(preview);
      } catch {
        // Ignore revocation errors
      }
    }

    setNickname(savedNickname ?? initialNickname ?? "");
    setFile(null);
    setPreview(savedAvatarUrl ?? initialAvatarUrl ?? null);
    resetCropperState();
    setRemovingAvatar(false);
    setIsEditingProfile(false);
    setIsEditingAvatar(false);
  };

  // Initialize state from props
  useEffect(() => {
    setNickname(initialNickname);
    setSavedNickname(initialNickname || null);
    setPreview(initialAvatarUrl);
    setSavedAvatarUrl(initialAvatarUrl);
    setIsEditingProfile(false);
    setIsEditingAvatar(false);
  }, [initialNickname, initialAvatarUrl]);

  const handleAvatarRemoval = async (avatarUrl: string): Promise<void> => {
    const avatarPath = extractAvatarPath(avatarUrl, userId);
    if (avatarPath) {
      try {
        await supabase.storage
          .from('profile-images')
          .remove([avatarPath]);
      } catch (err) {
        console.error('Error removing avatar from storage:', err);
      }
    }
  };

  const handleAvatarUpload = async (): Promise<string | null> => {
    if (!file) return null;

    let uploadBlob: Blob;
    try {
      if (croppedAreaPixels) {
        const imageSrc = preview as string;
        const cropped = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
        if (!cropped) throw new Error("Failed to crop image");
        uploadBlob = cropped;
      } else {
        uploadBlob = file;
      }
    } catch (cropErr) {
      console.error("Crop failed, falling back to original file:", cropErr);
      uploadBlob = file;
    }

    const extMatch = (file.name || "").match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1]}` : ".png";
    const path = `${userId}/avatar${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(path, uploadBlob, { upsert: true });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from("profile-images")
      .getPublicUrl(path);
    return publicData?.publicUrl ?? null;
  };

  const uploadAndSave = async () => {
    if (!userId) {
      console.error("No user id available");
      return;
    }
    setLoading(true);
    try {
      let avatarUrl = initialAvatarUrl;

      if (removingAvatar && savedAvatarUrl) {
        await handleAvatarRemoval(savedAvatarUrl);
        avatarUrl = null;
      } else if (file) {
        avatarUrl = await handleAvatarUpload();
      }

      const { error: dbError } = await supabase.from("userinfo").upsert({
        id: userId,
        nickname: nickname || null,
        avatar_url: avatarUrl,
      });

      if (dbError) throw dbError;

      // Update UI to reflect saved state
      setPreview(avatarUrl ?? null);
      setFile(null);
      resetCropperState();
      setRemovingAvatar(false);
      setSavedNickname(nickname || null);
      setSavedAvatarUrl(avatarUrl ?? null);
      setIsEditingProfile(false);
      setIsEditingAvatar(false);

      // Notify header about profile update
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: { avatarUrl, nickname: nickname || null }
      }));
    } catch (err) {
      console.error("Profile save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone. All your posts, reservations, and profile data will be permanently deleted.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/user", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      // Redirect to home page after successful deletion
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Delete account error:", err);
      const message = err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {/* Profile Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          {!isEditingProfile && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditingProfile(true)}
            >
              Edit Profile
            </Button>
          )}
        </div>

        {isEditingProfile && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar Section */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <button
                  type="button"
                  onClick={() => setIsEditingAvatar(true)}
                  className="group"
                  aria-label="Edit picture"
                >
                  <AvatarDisplay 
                    url={preview || savedAvatarUrl} 
                    className="group-hover:border-gray-400 transition-colors" 
                  />
                  <p className="text-xs text-gray-500 text-center mt-1 group-hover:text-gray-700 transition-colors">
                    Edit picture
                  </p>
                </button>
              </div>

              {/* Nickname Section */}
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nickname
                </label>
                <input
                  className="block w-full rounded-md border px-3 py-2 mb-1"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="What should people call you?"
                  autoFocus
                />
                {!savedNickname && (
                  <p className="text-xs text-gray-500">
                    This will be displayed on your posts. If not set, your posts
                    will show as &quot;Anonymous&quot;.
                  </p>
                )}
              </div>
            </div>

            {/* Avatar Editing Controls */}
            {isEditingAvatar && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change Photo
                </label>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={onFileChange}
                    className="flex-1"
                  />
                  {savedAvatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRemovingAvatar(true);
                        setFile(null);
                        setPreview(null);
                        resetCropperState();
                      }}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {removingAvatar && (
                  <p className="text-sm text-gray-600 mb-3">
                    Photo will be removed when you save.
                  </p>
                )}
                
                {preview && (
                  <div className="mt-3">
                    <div className="relative w-full h-72 bg-gray-50 rounded-lg overflow-hidden">
                      <Cropper
                        image={preview}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                      />
                    </div>

                    <div className="flex gap-2 mt-3">
                      <label className="flex-1">
                        <span className="text-sm text-gray-700">Zoom</span>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.1}
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className="w-full mt-1"
                        />
                      </label>
                      <label className="w-32">
                        <span className="text-sm text-gray-700">Rotate</span>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          step={1}
                          value={rotation}
                          onChange={(e) => setRotation(Number(e.target.value))}
                          className="w-full mt-1"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {!isEditingProfile && (
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar Display */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <AvatarDisplay url={savedAvatarUrl} />
            </div>

            {/* Nickname Display */}
            <div className="flex-1 w-full text-center sm:text-left mt-4 sm:mt-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nickname
              </label>
              <div className="text-lg font-medium text-gray-900">
                {nickname || "No nickname set"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save/Cancel Buttons */}
      {isEditingProfile && (
        <div className="flex gap-2">
          <Button 
            onClick={uploadAndSave} 
            disabled={loading || !hasUnsavedChanges(nickname, savedNickname, file, preview, savedAvatarUrl, removingAvatar)}
          >
            {loading ? "Saving…" : "Save"}
          </Button>
          <Button onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button
          onClick={handleDeleteAccount}
          disabled={deleting || loading}
          variant="destructive"
        >
          {deleting ? "Deleting…" : "Delete Account"}
        </Button>
      </div>
    </div>
  );
}