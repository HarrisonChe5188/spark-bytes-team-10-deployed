import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { post_id } = await request.json()
    
    if (!post_id) {
      return NextResponse.json(
        { error: 'post_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has a reservation for this post
    const { data: existingReservation } = await supabase
      .from('reservations')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', post_id)
      .single()

    if (existingReservation) {
      return NextResponse.json(
        { error: 'You have already reserved this post' },
        { status: 400 }
      )
    }

    // Get current post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('quantity_left, total_quantity')
      .eq('id', post_id)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.quantity_left <= 0) {
      return NextResponse.json(
        { error: 'This post is no longer available' },
        { status: 400 }
      )
    }

    // Create reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: user.id,
        post_id: post_id,
        status: 'reserved'
      })
      .select()
      .single()

    if (reservationError) {
      return NextResponse.json(
        { error: 'Failed to create reservation' },
        { status: 500 }
      )
    }

    // Decrement quantity_left in posts table
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        quantity_left: post.quantity_left - 1
      })
      .eq('id', post_id)

    if (updateError) {
      // Rollback reservation if quantity update fails
      await supabase
        .from('reservations')
        .delete()
        .eq('id', reservation.id)
      
      return NextResponse.json(
        { error: 'Failed to update post quantity' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reservation,
      message: 'Successfully reserved post'
    })
  } catch (error) {
    console.error('Reservation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
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

    // Get all reservations for the user with post details
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        created_at,
        status,
        posts:post_id (
          id,
          title,
          description,
          quantity_left,
          total_quantity,
          created_at,
          image_path,
          location,
          start_time,
          end_time
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch reservations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reservations })
  } catch (error) {
    console.error('Get reservations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('id')

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservation id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get reservation to find post_id
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('post_id')
      .eq('id', reservationId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    // Get current post quantity
    const { data: post } = await supabase
      .from('posts')
      .select('quantity_left')
      .eq('id', reservation.post_id)
      .single()

    // Delete reservation
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete reservation' },
        { status: 500 }
      )
    }

    // Increment quantity back
    await supabase
      .from('posts')
      .update({
        quantity_left: (post?.quantity_left || 0) + 1
      })
      .eq('id', reservation.post_id)

    return NextResponse.json({ success: true, message: 'Reservation cancelled' })
  } catch (error) {
    console.error('Delete reservation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
