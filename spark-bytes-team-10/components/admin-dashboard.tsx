"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Post } from "@/types/post";
import PostCard from "./post-card";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { RefreshCw, Search, FileText, Clock, CheckCircle2 } from "lucide-react";

export default function AdminDashboard() {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [authorNicknames, setAuthorNicknames] = useState<Map<string, string | null>>(new Map());
  const [authorAvatars, setAuthorAvatars] = useState<Map<string, string | null>>(new Map());

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: postData, error: postError }, userResult] = await Promise.all([
        supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);

      if (postError) {
        throw postError;
      }

      const normalizedPosts = (postData || []).map((item: Post) => ({
        ...item,
        location: item.location || "Location TBD",
        description: item.description || "No description available.",
      })) as Post[];

      setPosts(normalizedPosts);
      setCurrentUserId(userResult.data.user?.id || null);

      // Fetch author nicknames and avatars in parallel
      const userIds = [
        ...new Set(normalizedPosts.map((p: Post) => p.user_id).filter(Boolean)),
      ] as string[];

      if (userIds.length > 0) {
        const { data: userInfos } = await supabase
          .from("userinfo")
          .select("id, nickname, avatar_url")
          .in("id", userIds);

        const nicknamesMap = new Map<string, string | null>();
        const avatarsMap = new Map<string, string | null>();
        userInfos?.forEach((info) => {
          nicknamesMap.set(info.id, info.nickname || null);
          avatarsMap.set(info.id, info.avatar_url || null);
        });

        // Set null for users not found
        userIds.forEach((id) => {
          if (!nicknamesMap.has(id)) {
            nicknamesMap.set(id, null);
          }
          if (!avatarsMap.has(id)) {
            avatarsMap.set(id, null);
          }
        });

        setAuthorNicknames(nicknamesMap);
        setAuthorAvatars(avatarsMap);
      } else {
        // No posts, reset maps
        setAuthorNicknames(new Map());
        setAuthorAvatars(new Map());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load posts";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const handleUpdate = () => loadPosts();
    window.addEventListener("postUpdated", handleUpdate);
    window.addEventListener("postCreated", handleUpdate);
    return () => {
      window.removeEventListener("postUpdated", handleUpdate);
      window.removeEventListener("postCreated", handleUpdate);
    };
  }, [loadPosts]);

  const stats = useMemo(() => {
    const now = new Date();
    const active = posts.filter((post) => post.end_time && new Date(post.end_time) > now).length;
    const ended = posts.filter((post) => post.end_time && new Date(post.end_time) <= now).length;
    return {
      total: posts.length,
      active,
      ended,
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.title?.toLowerCase().includes(query) ||
        post.description?.toLowerCase().includes(query) ||
        post.location?.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.active}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Ended Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
              {stats.ended}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search posts by title, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadPosts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {searchQuery ? "No posts match your search." : "No posts available right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isAdmin
              onPostUpdated={loadPosts}
              authorNickname={
                post.user_id ? authorNicknames.get(post.user_id) ?? null : null
              }
              authorAvatar={
                post.user_id ? authorAvatars.get(post.user_id) ?? null : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}