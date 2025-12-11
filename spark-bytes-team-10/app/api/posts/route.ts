import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()
    const postId = formData.get('id') as string
    const title = formData.get('title') as string
    const location = formData.get('location') as string
    const campusLocation = formData.get('campus_location') as string
    const description = formData.get('description') as string
    const quantity = formData.get('quantity') ? parseInt(formData.get('quantity') as string) : null
    const startTime = formData.get('start_time') as string | null
    const endTime = formData.get('end_time') as string
    const imageFile = formData.get('image') as File | null
    const removeImage = formData.get('remove_image') === 'true'

    if (!postId || !title || !location || !campusLocation || !description || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    // privileged client for uploads/inserts (service role)
    const adminSupabase = createServiceRoleClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const isAdmin =
      ((user?.app_metadata as Record<string, unknown> | undefined)?.role === 'admin') ||
      ((user?.user_metadata as Record<string, unknown> | undefined)?.is_admin === true);

    // Check if post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id, image_path, quantity, total_quantity, quantity_left')
      .eq('id', postId)
      .single()

    if (fetchError || !existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (!isAdmin && existingPost.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only edit your own posts' },
        { status: 403 }
      )
    }

    let imagePath: string | null = existingPost.image_path

    // Handle image removal
    if (removeImage && existingPost.image_path) {
      try {
        await adminSupabase.storage
          .from('food_pictures')
          .remove([existingPost.image_path])
      } catch (err) {
        console.error('Error removing old image:', err)
      }
      imagePath = null
    }

    // If a new image is provided, upload it
    if (imageFile && imageFile.size > 0) {
      try {
        // Remove old image if it exists
        if (existingPost.image_path) {
          try {
            await supabase.storage
              .from('food_pictures')
              .remove([existingPost.image_path])
          } catch (err) {
            console.error('Error removing old image:', err)
          }
        }

        const ext = imageFile.name.split('.').pop() || 'jpg'
        const fileName = `${crypto.randomUUID()}.${ext}`
        const path = fileName

        const arrayBuffer = await imageFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await adminSupabase.storage
          .from('food_pictures')
          .upload(path, buffer, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          console.error('Image upload error:', uploadError)
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }
        imagePath = path
      } catch (upErr) {
        const errMsg = upErr instanceof Error ? upErr.message : 'Unknown error'
        console.error('Image upload error:', errMsg)
        return NextResponse.json(
          { error: `Failed to upload image: ${errMsg}` },
          { status: 500 }
        )
      }
    }

    // Calculate quantity adjustments
    const oldQuantity = existingPost.total_quantity || existingPost.quantity || 1
    const newQuantity = quantity || oldQuantity
    const quantityDiff = newQuantity - oldQuantity
    const newQuantityLeft = Math.max(0, (existingPost.quantity_left || 0) + quantityDiff)

    // Update the post
    const updateData: {
      title: string;
      start_time: string | null;
      end_time: string;
      location: string | null;
      campus_location: string;
      description: string | null;
      quantity: number;
      total_quantity: number;
      quantity_left: number;
      image_path: string | null;
    } = {
      title: title.trim(),
      start_time: startTime ? startTime : null,
      end_time: endTime,
      location: location.trim() || null,
      campus_location: campusLocation,
      description: description.trim() || null,
      quantity: newQuantity,
      total_quantity: newQuantity,
      quantity_left: newQuantityLeft,
      image_path: imagePath,
    }

    const { data: post, error: updateError } = await adminSupabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      post,
      message: 'Post updated successfully'
    })
  } catch (error) {
    console.error('Update post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('id')

    if (!postId) {
      return NextResponse.json(
        { error: 'Post id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminSupabase = createServiceRoleClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const isAdmin =
      ((user?.app_metadata as Record<string, unknown> | undefined)?.role === 'admin') ||
      ((user?.user_metadata as Record<string, unknown> | undefined)?.is_admin === true);

    // Check if post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id, image_path')
      .eq('id', postId)
      .single()

    if (fetchError || !existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (!isAdmin && existingPost.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only delete your own posts' },
        { status: 403 }
      )
    }

    // Delete associated image if it exists
    if (existingPost.image_path) {
      try {
          await adminSupabase.storage
            .from('food_pictures')
            .remove([existingPost.image_path])
      } catch (err) {
        console.error('Error removing image:', err)
        // Continue with post deletion even if image removal fails
      }
    }

    // Delete all reservations for this post first
    await adminSupabase
      .from('reservations')
      .delete()
      .eq('post_id', postId)

    // Delete the post
    const { error: deleteError } = await adminSupabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete post' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const title = formData.get('title') as string
    const location = formData.get('location') as string
    const campusLocation = formData.get('campus_location') as string
    const description = formData.get('description') as string
    const quantity = parseInt(formData.get('quantity') as string)
    const startTime = formData.get('start_time') as string | null
    const endTime = formData.get('end_time') as string
    const imageFile = formData.get('image') as File | null

    if (!title || !location || !campusLocation || !description || !quantity || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminSupabase = createServiceRoleClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let imagePath: string | null = null

    // If an image is provided, upload it to storage
    if (imageFile && imageFile.size > 0) {
      try {
        const ext = imageFile.name.split('.').pop() || 'jpg'
        const fileName = `${crypto.randomUUID()}.${ext}`
        const path = fileName

        const arrayBuffer = await imageFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await adminSupabase.storage
          .from('food_pictures')
          .upload(path, buffer, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          console.error('Image upload error:', uploadError)
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }
        imagePath = path
      } catch (upErr) {
        const errMsg = upErr instanceof Error ? upErr.message : 'Unknown error'
        console.error('Image upload error:', errMsg)
        return NextResponse.json(
          { error: `Failed to upload image: ${errMsg}` },
          { status: 500 }
        )
      }
    }

    // Insert the post with image_path
    const { data: post, error: insertError } = await adminSupabase
      .from('posts')
      .insert({
        user_id: user.id,
        title: title.trim(),
        start_time: startTime ? startTime : null,
        end_time: endTime,
        location: location.trim() || null,
        campus_location: campusLocation,
        description: description.trim() || null,
        quantity: quantity || 1,
        quantity_left: quantity || 1,
        total_quantity: quantity || 1,
        image_path: imagePath,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      // If insert fails but image was uploaded, you could optionally delete the image here
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        post,
        message: 'Post created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
