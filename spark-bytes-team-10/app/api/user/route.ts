import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Extracts the storage path from an avatar URL.
 * Avatars are stored as {userId}/avatar.{ext} in the profile-images bucket.
 */
function extractAvatarPath(url: string, userId: string): string | null {
  if (url.includes('/storage/v1/object/public/profile-images/')) {
    return url.split('/storage/v1/object/public/profile-images/')[1].split('?')[0]
  }
  if (url.includes('profile-images/')) {
    return url.split('profile-images/')[1].split('?')[0]
  }
  if (url.startsWith(`${userId}/`)) {
    return url
  }
  return null
}

export async function DELETE() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Delete all user reservations
    await supabase
      .from('reservations')
      .delete()
      .eq('user_id', userId)

    // Get all posts by this user to delete associated data
    const { data: userPosts } = await supabase
      .from('posts')
      .select('id, image_path')
      .eq('user_id', userId)

    if (userPosts?.length) {
      const postIds = userPosts.map(post => post.id)

      // Delete reservations for user's posts
      await supabase
        .from('reservations')
        .delete()
        .in('post_id', postIds)

      // Delete post images from storage
      const imagePaths = userPosts
        .map(post => post.image_path)
        .filter((path): path is string => Boolean(path))

      if (imagePaths.length > 0) {
        try {
          await supabase.storage
            .from('food_pictures')
            .remove(imagePaths)
        } catch (err) {
          console.error('Error removing post images:', err)
        }
      }

      // Delete all posts by this user
      await supabase
        .from('posts')
        .delete()
        .eq('user_id', userId)
    }

    // Delete user's avatar from storage
    const { data: profileData } = await supabase
      .from('userinfo')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    if (profileData?.avatar_url) {
      const avatarPath = extractAvatarPath(profileData.avatar_url, userId)
      if (avatarPath) {
        try {
          await supabase.storage
            .from('profile-images')
            .remove([avatarPath])
        } catch (err) {
          console.error('Error removing avatar:', err)
        }
      }
    }

    // Delete user profile data
    await supabase
      .from('userinfo')
      .delete()
      .eq('id', userId)

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}