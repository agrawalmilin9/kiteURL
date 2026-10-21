export interface LinkItem {
  id: string;
  original_url: string;
  slug: string;
  title: string;
  description?: string;
  is_active: boolean;
  is_password_protected: boolean;
  expires_at?: string | null;
  clicks_count: number;
  last_clicked_at?: string | null;
  created_at: string;
  updated_at: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  tags?: string[];
}

export interface ClickRecord {
  id: string;
  link_id: string;
  slug: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  referer: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

export interface LinkAnalytics {
  link_id: string;
  slug: string;
  title: string;
  original_url: string;
  is_active: boolean;
  created_at: string;
  total_clicks: number;
  unique_visitors: number;
  today_clicks: number;
  timeline: Array<{ date: string; label: string; clicks: number }>;
  devices: Array<{ device: string; count: number; percentage: number }>;
  top_referrers: Array<{ referer: string; count: number; percentage: number }>;
  top_browsers: Array<{ browser: string; count: number; percentage: number }>;
  recent_clicks: ClickRecord[];
  geo_available: boolean;
  cache_status: string;
}

export interface SystemOverview {
  total_links: number;
  active_links: number;
  total_clicks: number;
  clicks_last_24h: number;
  cache_performance: {
    hits: number;
    misses: number;
    total_queries: number;
    hit_ratio_percent: number;
    cached_keys_count: number;
    backend: string;
  };
}
