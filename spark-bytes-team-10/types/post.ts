export interface Post {
  id: number;
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  campus_location?: string;
  description?: string;
  image_path?: string | null;
  quantity: number;
  quantity_left?: number;
  interested_count?: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}
