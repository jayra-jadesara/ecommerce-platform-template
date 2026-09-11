/**
 * Hand-maintained Supabase Database types aligned with Phase 2 migrations.
 * Regenerate later with `supabase gen types typescript` when connected to a project.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StoreStatus = "draft" | "active" | "suspended" | "archived";
export type ThemeModeDb = "light" | "dark" | "system";
export type AnimationPresetDb =
  | "fade"
  | "fade-up"
  | "fade-down"
  | "slide-up"
  | "slide-down"
  | "scale"
  | "none";
export type AnimationIntensityDb = "subtle" | "medium" | "strong";
export type ProductStatus = "draft" | "active" | "archived";
export type PageStatus = "draft" | "published" | "archived";
export type BlogPostStatus = "draft" | "published" | "archived";
export type BlogLayoutPreset = "GRID" | "LIST" | "FEATURED_GRID";
/** Preferred: RIGHT | LEFT | TOP | NONE. Legacy SIDEBAR / TOP_FILTER still accepted. */
export type BlogSidebarPreset =
  | "RIGHT"
  | "LEFT"
  | "TOP"
  | "NONE"
  | "SIDEBAR"
  | "TOP_FILTER";
export type BlogCardStyle = "STANDARD" | "MINIMAL" | "EDITORIAL";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "REFUNDED";
export type DiscountType = "percentage" | "fixed";
export type ShippingMethod = "flat_rate" | "free" | "percentage" | "zone";
export type InquiryStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "SPAM";
export type AdminRoleCode =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "EDITOR"
  | "ORDER_MANAGER";
export type NavigationLocation = "header" | "footer";
export type PageSectionType =
  | "hero"
  | "text"
  | "image"
  | "banner"
  | "products"
  | "categories"
  | "testimonials"
  | "faq"
  | "cta"
  | "about"
  | "features"
  | "statistics"
  | "text_image"
  | "newsletter"
  | "custom";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          name: string;
          slug: string;
          legal_name: string | null;
          description: string | null;
          status: StoreStatus;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          legal_name?: string | null;
          description?: string | null;
          status?: StoreStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]>;
        Relationships: [];
      };
      store_settings: {
        Row: {
          store_id: string;
          contact_email: string | null;
          contact_phone: string | null;
          contact_phone_secondary: string | null;
          address_line_1: string | null;
          address_line_2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          currency: string;
          timezone: string;
          default_locale: string;
          business_registration_number: string | null;
          tax_id: string | null;
          checkout_guest_allowed: boolean;
          checkout_require_phone: boolean;
          registration_enabled: boolean;
          registration_require_email_verification: boolean;
          social_instagram: string | null;
          social_facebook: string | null;
          social_youtube: string | null;
          social_linkedin: string | null;
          social_x: string | null;
          social_whatsapp: string | null;
          header_sticky: boolean;
          header_search_enabled: boolean;
          header_cart_enabled: boolean;
          header_account_enabled: boolean;
          header_mobile_menu_enabled: boolean;
          header_nav_visible: boolean;
          header_logo_size: "small" | "medium" | "large";
          announcement_enabled: boolean;
          announcement_text: string | null;
          announcement_url: string | null;
          announcement_open_in_new_tab: boolean;
          footer_enabled: boolean;
          footer_description: string | null;
          footer_show_contact: boolean;
          footer_show_social: boolean;
          footer_show_newsletter: boolean;
          footer_nav_visible: boolean;
          copyright_text: string | null;
          extra: Json;
        } & Timestamps;
        Insert: {
          store_id: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          contact_phone_secondary?: string | null;
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          currency?: string;
          timezone?: string;
          default_locale?: string;
          business_registration_number?: string | null;
          tax_id?: string | null;
          checkout_guest_allowed?: boolean;
          checkout_require_phone?: boolean;
          registration_enabled?: boolean;
          registration_require_email_verification?: boolean;
          social_instagram?: string | null;
          social_facebook?: string | null;
          social_youtube?: string | null;
          social_linkedin?: string | null;
          social_x?: string | null;
          social_whatsapp?: string | null;
          header_sticky?: boolean;
          header_search_enabled?: boolean;
          header_cart_enabled?: boolean;
          header_account_enabled?: boolean;
          header_mobile_menu_enabled?: boolean;
          header_nav_visible?: boolean;
          header_logo_size?: "small" | "medium" | "large";
          announcement_enabled?: boolean;
          announcement_text?: string | null;
          announcement_url?: string | null;
          announcement_open_in_new_tab?: boolean;
          footer_enabled?: boolean;
          footer_description?: string | null;
          footer_show_contact?: boolean;
          footer_show_social?: boolean;
          footer_show_newsletter?: boolean;
          footer_nav_visible?: boolean;
          copyright_text?: string | null;
          extra?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_settings"]["Insert"]>;
        Relationships: [];
      };
      store_branding: {
        Row: {
          store_id: string;
          brand_name: string;
          tagline: string | null;
          logo_path: string | null;
          logo_dark_path: string | null;
          favicon_path: string | null;
          social_sharing_image_path: string | null;
        } & Timestamps;
        Insert: {
          store_id: string;
          brand_name: string;
          tagline?: string | null;
          logo_path?: string | null;
          logo_dark_path?: string | null;
          favicon_path?: string | null;
          social_sharing_image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_branding"]["Insert"]>;
        Relationships: [];
      };
      store_theme_settings: {
        Row: {
          store_id: string;
          default_mode: ThemeModeDb;
          enabled_modes: ThemeModeDb[];
          allow_user_toggle: boolean;
          light_primary: string;
          light_secondary: string;
          light_accent: string;
          light_background: string;
          light_foreground: string;
          light_surface: string;
          light_card: string;
          light_border: string;
          light_muted: string;
          light_success: string;
          light_warning: string;
          light_error: string;
          light_header_background: string | null;
          light_header_foreground: string | null;
          light_footer_background: string | null;
          light_footer_foreground: string | null;
          light_button_background: string | null;
          light_button_foreground: string | null;
          dark_primary: string;
          dark_secondary: string;
          dark_accent: string;
          dark_background: string;
          dark_foreground: string;
          dark_surface: string;
          dark_card: string;
          dark_border: string;
          dark_muted: string;
          dark_success: string;
          dark_warning: string;
          dark_error: string;
          dark_header_background: string | null;
          dark_header_foreground: string | null;
          dark_footer_background: string | null;
          dark_footer_foreground: string | null;
          dark_button_background: string | null;
          dark_button_foreground: string | null;
          font_sans: string | null;
          font_mono: string | null;
          font_display: string | null;
          border_radius: string;
        } & Timestamps;
        Insert: {
          store_id: string;
          default_mode?: ThemeModeDb;
          enabled_modes?: ThemeModeDb[];
          allow_user_toggle?: boolean;
          light_primary: string;
          light_secondary: string;
          light_accent: string;
          light_background: string;
          light_foreground: string;
          light_surface: string;
          light_card: string;
          light_border: string;
          light_muted: string;
          light_success: string;
          light_warning: string;
          light_error: string;
          light_header_background?: string | null;
          light_header_foreground?: string | null;
          light_footer_background?: string | null;
          light_footer_foreground?: string | null;
          light_button_background?: string | null;
          light_button_foreground?: string | null;
          dark_primary: string;
          dark_secondary: string;
          dark_accent: string;
          dark_background: string;
          dark_foreground: string;
          dark_surface: string;
          dark_card: string;
          dark_border: string;
          dark_muted: string;
          dark_success: string;
          dark_warning: string;
          dark_error: string;
          dark_header_background?: string | null;
          dark_header_foreground?: string | null;
          dark_footer_background?: string | null;
          dark_footer_foreground?: string | null;
          dark_button_background?: string | null;
          dark_button_foreground?: string | null;
          font_sans?: string | null;
          font_mono?: string | null;
          font_display?: string | null;
          border_radius?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["store_theme_settings"]["Insert"]
        >;
        Relationships: [];
      };
      store_animation_settings: {
        Row: {
          store_id: string;
          enabled: boolean;
          preset: AnimationPresetDb;
          intensity: AnimationIntensityDb;
        } & Timestamps;
        Insert: {
          store_id: string;
          enabled?: boolean;
          preset?: AnimationPresetDb;
          intensity?: AnimationIntensityDb;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["store_animation_settings"]["Insert"]
        >;
        Relationships: [];
      };
      store_visual_effects_settings: {
        Row: {
          store_id: string;
          enabled: boolean;
          hero_enabled: boolean;
          product_enabled: boolean;
          quality: "LOW" | "MEDIUM" | "HIGH";
          hero_preset:
            | "NONE"
            | "FLOATING_SHAPES"
            | "PRODUCT_ORBIT"
            | "ABSTRACT_PARTICLES"
            | "SOFT_GEOMETRY";
          mobile_enabled: boolean;
          respect_reduced_motion: boolean;
        } & Timestamps;
        Insert: {
          store_id: string;
          enabled?: boolean;
          hero_enabled?: boolean;
          product_enabled?: boolean;
          quality?: "LOW" | "MEDIUM" | "HIGH";
          hero_preset?:
            | "NONE"
            | "FLOATING_SHAPES"
            | "PRODUCT_ORBIT"
            | "ABSTRACT_PARTICLES"
            | "SOFT_GEOMETRY";
          mobile_enabled?: boolean;
          respect_reduced_motion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["store_visual_effects_settings"]["Insert"]
        >;
        Relationships: [];
      };
      store_seo_settings: {
        Row: {
          store_id: string;
          site_title: string;
          meta_description: string | null;
          keywords: string[] | null;
          canonical_url: string | null;
          og_title: string | null;
          og_description: string | null;
          og_image_path: string | null;
          robots_index: boolean;
          robots_follow: boolean;
        } & Timestamps;
        Insert: {
          store_id: string;
          site_title: string;
          meta_description?: string | null;
          keywords?: string[] | null;
          canonical_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image_path?: string | null;
          robots_index?: boolean;
          robots_follow?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_seo_settings"]["Insert"]>;
        Relationships: [];
      };
      shipping_settings: {
        Row: {
          store_id: string;
          enabled: boolean;
          method: ShippingMethod;
          free_shipping_threshold: number | null;
          default_shipping_fee: number;
          percentage_rate: number | null;
          estimated_delivery_min_days: number | null;
          estimated_delivery_max_days: number | null;
          estimated_delivery_label: string | null;
          extra: Json;
        } & Timestamps;
        Insert: {
          store_id: string;
          enabled?: boolean;
          method?: ShippingMethod;
          free_shipping_threshold?: number | null;
          default_shipping_fee?: number;
          percentage_rate?: number | null;
          estimated_delivery_min_days?: number | null;
          estimated_delivery_max_days?: number | null;
          estimated_delivery_label?: string | null;
          extra?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipping_settings"]["Insert"]>;
        Relationships: [];
      };
      payment_settings: {
        Row: {
          store_id: string;
          provider: "none" | "razorpay" | "other";
          fee_enabled: boolean;
          fee_type: "PERCENTAGE" | "FIXED";
          fee_value: number;
          fee_basis:
            | "SUBTOTAL"
            | "SUBTOTAL_PLUS_SHIPPING"
            | "ORDER_TOTAL_BEFORE_PAYMENT_FEE";
          tax_enabled: boolean;
          tax_type: "PERCENTAGE" | "FIXED";
          tax_value: number;
          extra: Json;
        } & Timestamps;
        Insert: {
          store_id: string;
          provider?: "none" | "razorpay" | "other";
          fee_enabled?: boolean;
          fee_type?: "PERCENTAGE" | "FIXED";
          fee_value?: number;
          fee_basis?:
            | "SUBTOTAL"
            | "SUBTOTAL_PLUS_SHIPPING"
            | "ORDER_TOTAL_BEFORE_PAYMENT_FEE";
          tax_enabled?: boolean;
          tax_type?: "PERCENTAGE" | "FIXED";
          tax_value?: number;
          extra?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_settings"]["Insert"]>;
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar_path: string | null;
        } & Timestamps;
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
        Relationships: [];
      };
      user_addresses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string | null;
          address_line_1: string;
          address_line_2: string | null;
          city: string;
          state: string | null;
          postal_code: string;
          country: string;
          is_default: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone?: string | null;
          address_line_1: string;
          address_line_2?: string | null;
          city: string;
          state?: string | null;
          postal_code: string;
          country: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_addresses"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          code: AdminRoleCode;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: AdminRoleCode;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      admin_users: {
        Row: {
          user_id: string;
          store_id: string | null;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          user_id: string;
          store_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
        Relationships: [];
      };
      admin_user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_user_roles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          store_id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          image_path: string | null;
          seo_title: string | null;
          seo_description: string | null;
          sort_order: number;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          parent_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          image_path?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          short_description: string | null;
          description: string | null;
          brand: string | null;
          ingredients: string | null;
          usage_instructions: string | null;
          status: ProductStatus;
          featured: boolean;
          seo_title: string | null;
          seo_description: string | null;
          model_path: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          short_description?: string | null;
          description?: string | null;
          brand?: string | null;
          ingredients?: string | null;
          usage_instructions?: string | null;
          status?: ProductStatus;
          featured?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          model_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          weight: number | null;
          unit: string | null;
          track_inventory: boolean;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sku: string;
          price: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          weight?: number | null;
          unit?: string | null;
          track_inventory?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_variants"]["Insert"]>;
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          storage_path: string;
          public_url: string | null;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          storage_path: string;
          public_url?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_images"]["Insert"]>;
        Relationships: [];
      };
      inventory: {
        Row: {
          variant_id: string;
          quantity: number;
          reserved_quantity: number;
          low_stock_threshold: number;
          updated_at: string;
        };
        Insert: {
          variant_id: string;
          quantity?: number;
          reserved_quantity?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventory"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          store_id: string;
          order_number: string;
          user_id: string | null;
          status: OrderStatus;
          subtotal: number;
          discount_amount: number;
          shipping_amount: number;
          gateway_fee: number;
          tax_amount: number;
          grand_total: number;
          currency: string;
          shipping_address: Json;
          billing_address: Json;
          notes: string | null;
          coupon_code: string | null;
          shipping_provider: string | null;
          tracking_number: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          inventory_finalized_at: string | null;
          inventory_restored_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          order_number: string;
          user_id?: string | null;
          status?: OrderStatus;
          subtotal: number;
          discount_amount?: number;
          shipping_amount?: number;
          gateway_fee?: number;
          tax_amount?: number;
          grand_total: number;
          currency: string;
          shipping_address?: Json;
          billing_address?: Json;
          notes?: string | null;
          coupon_code?: string | null;
          shipping_provider?: string | null;
          tracking_number?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          inventory_finalized_at?: string | null;
          inventory_restored_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name_snapshot: string;
          variant_name_snapshot: string;
          sku_snapshot: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name_snapshot: string;
          variant_name_snapshot: string;
          sku_snapshot: string;
          unit_price: number;
          quantity: number;
          line_total: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          user_id: string | null;
          provider: string;
          provider_payment_id: string | null;
          provider_order_id: string | null;
          amount: number;
          amount_minor: number;
          currency: string;
          status: PaymentStatus;
          payment_method: string | null;
          paid_at: string | null;
          failure_reason: string | null;
          pricing_version: string | null;
          receipt: string | null;
          metadata: Json;
        } & Timestamps;
        Insert: {
          id?: string;
          order_id: string;
          user_id?: string | null;
          provider?: string;
          provider_payment_id?: string | null;
          provider_order_id?: string | null;
          amount: number;
          amount_minor: number;
          currency: string;
          status?: PaymentStatus;
          payment_method?: string | null;
          paid_at?: string | null;
          failure_reason?: string | null;
          pricing_version?: string | null;
          receipt?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      payment_webhook_events: {
        Row: {
          id: string;
          provider: string;
          event_id: string;
          event_name: string;
          status: "RECEIVED" | "PROCESSED" | "IGNORED" | "FAILED";
          payment_id: string | null;
          order_id: string | null;
          payload_digest: string | null;
          error_message: string | null;
          received_at: string;
          processed_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          provider: string;
          event_id: string;
          event_name: string;
          status?: "RECEIVED" | "PROCESSED" | "IGNORED" | "FAILED";
          payment_id?: string | null;
          order_id?: string | null;
          payload_digest?: string | null;
          error_message?: string | null;
          received_at?: string;
          processed_at?: string | null;
          metadata?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["payment_webhook_events"]["Insert"]
        >;
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          store_id: string;
          code: string;
          description: string | null;
          discount_type: DiscountType;
          discount_value: number;
          minimum_order_amount: number | null;
          maximum_discount_amount: number | null;
          usage_limit: number | null;
          per_user_limit: number | null;
          starts_at: string | null;
          expires_at: string | null;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          code: string;
          description?: string | null;
          discount_type: DiscountType;
          discount_value: number;
          minimum_order_amount?: number | null;
          maximum_discount_amount?: number | null;
          usage_limit?: number | null;
          per_user_limit?: number | null;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coupons"]["Insert"]>;
        Relationships: [];
      };
      coupon_redemptions: {
        Row: {
          id: string;
          coupon_id: string;
          order_id: string;
          user_id: string | null;
          discount_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          order_id: string;
          user_id?: string | null;
          discount_amount: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["coupon_redemptions"]["Insert"]
        >;
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          store_id: string;
          title: string;
          slug: string;
          content: string | null;
          status: PageStatus;
          seo_title: string | null;
          seo_description: string | null;
          featured_image_path: string | null;
          og_image_path: string | null;
          published_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          title: string;
          slug: string;
          content?: string | null;
          status?: PageStatus;
          seo_title?: string | null;
          seo_description?: string | null;
          featured_image_path?: string | null;
          og_image_path?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pages"]["Insert"]>;
        Relationships: [];
      };
      page_sections: {
        Row: {
          id: string;
          page_id: string;
          section_type: PageSectionType;
          title: string | null;
          sort_order: number;
          is_active: boolean;
          config: Json;
        } & Timestamps;
        Insert: {
          id?: string;
          page_id: string;
          section_type: PageSectionType;
          title?: string | null;
          sort_order?: number;
          is_active?: boolean;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["page_sections"]["Insert"]>;
        Relationships: [];
      };
      banners: {
        Row: {
          id: string;
          store_id: string;
          title: string;
          description: string | null;
          image_path: string | null;
          link_url: string | null;
          button_text: string | null;
          is_active: boolean;
          starts_at: string | null;
          ends_at: string | null;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          title: string;
          description?: string | null;
          image_path?: string | null;
          link_url?: string | null;
          button_text?: string | null;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["banners"]["Insert"]>;
        Relationships: [];
      };
      blog_categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          slug: string;
          description: string | null;
          image_path: string | null;
          is_active: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          slug: string;
          description?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blog_categories"]["Insert"]>;
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string;
          store_id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string | null;
          featured_image_path: string | null;
          author_name: string | null;
          status: BlogPostStatus;
          is_featured: boolean;
          seo_title: string | null;
          seo_description: string | null;
          og_image_path: string | null;
          published_at: string | null;
          reading_time_minutes: number | null;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content?: string | null;
          featured_image_path?: string | null;
          author_name?: string | null;
          status?: BlogPostStatus;
          is_featured?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          og_image_path?: string | null;
          published_at?: string | null;
          reading_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_post_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "blog_post_categories";
            referencedColumns: ["post_id"];
          },
          {
            foreignKeyName: "blog_post_products_post_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "blog_post_products";
            referencedColumns: ["post_id"];
          },
        ];
      };
      blog_post_categories: {
        Row: {
          post_id: string;
          category_id: string;
          store_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          category_id: string;
          store_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["blog_post_categories"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "blog_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blog_post_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "blog_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_post_products: {
        Row: {
          post_id: string;
          product_id: string;
          store_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          post_id: string;
          product_id: string;
          store_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["blog_post_products"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "blog_post_products_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "blog_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blog_post_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_settings: {
        Row: {
          store_id: string;
          page_title: string;
          page_description: string | null;
          posts_per_page: number;
          show_categories: boolean;
          show_author: boolean;
          show_date: boolean;
          show_featured_image: boolean;
          show_sidebar: boolean;
          show_search: boolean;
          layout_preset: BlogLayoutPreset;
          sidebar_preset: BlogSidebarPreset;
          show_reading_time: boolean;
          show_share_buttons: boolean;
          show_related_posts: boolean;
          show_related_products: boolean;
          show_featured_post: boolean;
          auto_featured_fallback: boolean;
          featured_post_id: string | null;
          card_style: BlogCardStyle;
          cta_title: string | null;
          cta_description: string | null;
          cta_button_label: string | null;
          cta_button_href: string | null;
        } & Timestamps;
        Insert: {
          store_id: string;
          page_title?: string;
          page_description?: string | null;
          posts_per_page?: number;
          show_categories?: boolean;
          show_author?: boolean;
          show_date?: boolean;
          show_featured_image?: boolean;
          show_sidebar?: boolean;
          show_search?: boolean;
          layout_preset?: BlogLayoutPreset;
          sidebar_preset?: BlogSidebarPreset;
          show_reading_time?: boolean;
          show_share_buttons?: boolean;
          show_related_posts?: boolean;
          show_related_products?: boolean;
          show_featured_post?: boolean;
          auto_featured_fallback?: boolean;
          featured_post_id?: string | null;
          card_style?: BlogCardStyle;
          cta_title?: string | null;
          cta_description?: string | null;
          cta_button_label?: string | null;
          cta_button_href?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blog_settings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "blog_settings_featured_post_id_fkey";
            columns: ["featured_post_id"];
            isOneToOne: false;
            referencedRelation: "blog_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          store_id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          email: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["newsletter_subscribers"]["Insert"]
        >;
        Relationships: [];
      };
      navigation_items: {
        Row: {
          id: string;
          store_id: string;
          location: NavigationLocation;
          parent_id: string | null;
          label: string;
          href: string;
          sort_order: number;
          is_active: boolean;
          open_in_new_tab: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          location: NavigationLocation;
          parent_id?: string | null;
          label: string;
          href: string;
          sort_order?: number;
          is_active?: boolean;
          open_in_new_tab?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["navigation_items"]["Insert"]>;
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          store_id: string;
          storage_path: string;
          public_url: string | null;
          file_name: string;
          mime_type: string;
          file_size: number | null;
          alt_text: string | null;
          folder: string | null;
          uploaded_by: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          storage_path: string;
          public_url?: string | null;
          file_name: string;
          mime_type: string;
          file_size?: number | null;
          alt_text?: string | null;
          folder?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["media"]["Insert"]>;
        Relationships: [];
      };
      carts: {
        Row: {
          id: string;
          store_id: string;
          user_id: string | null;
          guest_token: string | null;
          expires_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          user_id?: string | null;
          guest_token?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["carts"]["Insert"]>;
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
        } & Timestamps;
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cart_items"]["Insert"]>;
        Relationships: [];
      };
      wishlists: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wishlists"]["Insert"]>;
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          id: string;
          wishlist_id: string;
          product_id: string;
          variant_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          product_id: string;
          variant_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wishlist_items"]["Insert"]>;
        Relationships: [];
      };
      contact_inquiries: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string | null;
          message: string;
          status: InquiryStatus;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          email: string;
          phone?: string | null;
          subject?: string | null;
          message: string;
          status?: InquiryStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_inquiries"]["Insert"]>;
        Relationships: [];
      };
      certifications: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          description: string | null;
          logo_path: string | null;
          certificate_number: string | null;
          issued_date: string | null;
          expiry_date: string | null;
          sort_order: number;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          description?: string | null;
          logo_path?: string | null;
          certificate_number?: string | null;
          issued_date?: string | null;
          expiry_date?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["certifications"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          store_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id?: string | null;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      error_logs: {
        Row: {
          id: string;
          reference_id: string;
          store_id: string | null;
          user_id: string | null;
          user_login: string | null;
          user_role: string | null;
          error_type: string;
          error_source: string;
          severity: string;
          status: string;
          message: string;
          safe_message: string;
          stack: string | null;
          file_name: string | null;
          line_number: number | null;
          column_number: number | null;
          function_name: string | null;
          route: string | null;
          page_name: string | null;
          request_method: string | null;
          request_path: string | null;
          http_status: number | null;
          operation: string | null;
          feature: string | null;
          entity_type: string | null;
          entity_id: string | null;
          order_id: string | null;
          payment_id: string | null;
          provider: string | null;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          webhook_event_id: string | null;
          error_code: string | null;
          database_code: string | null;
          browser_name: string | null;
          browser_version: string | null;
          os: string | null;
          device_type: string | null;
          user_agent: string | null;
          metadata_json: Json;
          fingerprint: string;
          first_seen_at: string;
          last_seen_at: string;
          occurrence_count: number;
          resolved_at: string | null;
          resolved_by: string | null;
          admin_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_id: string;
          store_id?: string | null;
          user_id?: string | null;
          user_login?: string | null;
          user_role?: string | null;
          error_type: string;
          error_source: string;
          severity?: string;
          status?: string;
          message: string;
          safe_message?: string;
          stack?: string | null;
          file_name?: string | null;
          line_number?: number | null;
          column_number?: number | null;
          function_name?: string | null;
          route?: string | null;
          page_name?: string | null;
          request_method?: string | null;
          request_path?: string | null;
          http_status?: number | null;
          operation?: string | null;
          feature?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          order_id?: string | null;
          payment_id?: string | null;
          provider?: string | null;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          webhook_event_id?: string | null;
          error_code?: string | null;
          database_code?: string | null;
          browser_name?: string | null;
          browser_version?: string | null;
          os?: string | null;
          device_type?: string | null;
          user_agent?: string | null;
          metadata_json?: Json;
          fingerprint: string;
          first_seen_at?: string;
          last_seen_at?: string;
          occurrence_count?: number;
          resolved_at?: string | null;
          resolved_by?: string | null;
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["error_logs"]["Insert"]>;
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          store_id: string;
          variant_id: string;
          order_id: string | null;
          order_item_id: string | null;
          movement_type: "SALE" | "RESTOCK" | "REVERSAL" | "ADJUSTMENT";
          quantity_delta: number;
          quantity_after: number | null;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          variant_id: string;
          order_id?: string | null;
          order_item_id?: string | null;
          movement_type: "SALE" | "RESTOCK" | "REVERSAL" | "ADJUSTMENT";
          quantity_delta: number;
          quantity_after?: number | null;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["inventory_movements"]["Insert"]
        >;
        Relationships: [];
      };
      order_activities: {
        Row: {
          id: string;
          order_id: string;
          store_id: string;
          actor_user_id: string | null;
          event_type: string;
          message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          store_id: string;
          actor_user_id?: string | null;
          event_type: string;
          message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["order_activities"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_active_admin: { Args: Record<string, never>; Returns: boolean };
      has_admin_role: { Args: { required_roles: string[] }; Returns: boolean };
      is_store_admin: { Args: { target_store_id: string }; Returns: boolean };
      finalize_order_inventory: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      restore_order_inventory: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      redeem_coupon_for_order: {
        Args: {
          p_order_id: string;
          p_coupon_id: string;
          p_user_id: string | null;
          p_discount_amount: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
