export interface UserProfile {
  username: string;
  display_name: string;
  bio: string;
  related_url: string;
  is_admin: boolean; //updateMyProfileでは見てない
  is_suspended: boolean;
};

export interface Wallet {
  subscription_plan: 'free' | 'basic' | 'premium';
  resilient: number;
  permanent: number;
  pending_downgrade: boolean;
  downgrade_scheduled_at: number | null;
}

export interface PublicationContent {
  id: string;
  author_id: string;
  title: string;
  is_public: boolean;
  is_suspended: boolean;
  description: string;
  cover_url: string;
  content_url: string;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
  author_display_name: string;
  fav_count: number;
  comment_count: number;
  socialcard_url: string;
  related_url: string;
  author_display_name: string;
  author_username: string;
  author_is_suspended: boolean;
}

export interface Works {
  isMine: boolean;
  works: PublicationContent[];
}

export interface Mail {
  id: string;
  created_at: string;
  sender_display_name: string;
  title: string;
  content: string;
  read_at: string | null;
}

export interface Comment {
  id: string;
  author_display_name: string;
  author_username: string;
  content: string;
  created_at: string;
}

