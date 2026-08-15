export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          apartment: string | null
          building: string | null
          city: string
          created_at: string
          full_name: string
          governorate: string
          id: string
          is_default: boolean
          label: string | null
          landmark: string | null
          notes: string | null
          phone: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment?: string | null
          building?: string | null
          city: string
          created_at?: string
          full_name: string
          governorate: string
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          notes?: string | null
          phone: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment?: string | null
          building?: string | null
          city?: string
          created_at?: string
          full_name?: string
          governorate?: string
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          notes?: string | null
          phone?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          model: string | null
          name_ar: string
          name_en: string
          provider: string
          role_key: string
          system_prompt: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          name_ar: string
          name_en: string
          provider?: string
          role_key: string
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          name_ar?: string
          name_en?: string
          provider?: string
          role_key?: string
          system_prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          position: string | null
          sort_order: number | null
          subtitle_ar: string | null
          subtitle_en: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          position?: string | null
          sort_order?: number | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          position?: string | null
          sort_order?: number | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          logo_url: string | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          saved_for_later: boolean
          session_token: string | null
          unit_price_snapshot: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cart_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          saved_for_later?: boolean
          session_token?: string | null
          unit_price_snapshot?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cart_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          saved_for_later?: boolean
          session_token?: string | null
          unit_price_snapshot?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          currency: string
          customer_id: string | null
          deleted_at: string | null
          id: string
          session_token: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          session_token?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          session_token?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name_ar: string
          name_en: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name_ar: string
          name_en: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name_ar?: string
          name_en?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          change_note: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          snapshot: Json
          version_number: number
        }
        Update: {
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          attempts_count: number
          created_at: string
          delivered_at: string | null
          delivery_partner_id: string | null
          id: string
          notes: string | null
          order_id: string
          scheduled_at: string | null
          status_id: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          attempts_count?: number
          created_at?: string
          delivered_at?: string | null
          delivery_partner_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          scheduled_at?: string | null
          status_id: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          attempts_count?: number
          created_at?: string
          delivered_at?: string | null
          delivery_partner_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          scheduled_at?: string | null
          status_id?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "delivery_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempts: {
        Row: {
          attempt_number: number
          attempted_at: string
          created_at: string
          created_by: string | null
          delivery_id: string
          failure_reason_id: string | null
          id: string
          note: string | null
          result: string
        }
        Insert: {
          attempt_number?: number
          attempted_at?: string
          created_at?: string
          created_by?: string | null
          delivery_id: string
          failure_reason_id?: string | null
          id?: string
          note?: string | null
          result: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          created_at?: string
          created_by?: string | null
          delivery_id?: string
          failure_reason_id?: string | null
          id?: string
          note?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_attempts_failure_reason_id_fkey"
            columns: ["failure_reason_id"]
            isOneToOne: false
            referencedRelation: "delivery_failure_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_failure_reasons: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_partner_users: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_partner_id: string
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_partner_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_partner_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_partner_users_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_partners: {
        Row: {
          coverage_notes: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          phone: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          coverage_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          phone?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          coverage_notes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          phone?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_statuses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_terminal: boolean
          name_ar: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_terminal?: boolean
          name_ar: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_terminal?: boolean
          name_ar?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          content: Json | null
          id: string
          is_active: boolean | null
          section_key: string
          sort_order: number | null
          subtitle_ar: string | null
          subtitle_en: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          id?: string
          is_active?: boolean | null
          section_key: string
          sort_order?: number | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          id?: string
          is_active?: boolean | null
          section_key?: string
          sort_order?: number | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      media_library: {
        Row: {
          alt_ar: string | null
          alt_en: string | null
          created_at: string
          folder: string | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          path: string
          size_bytes: number | null
          updated_at: string
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt_ar?: string | null
          alt_en?: string | null
          created_at?: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          path: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt_ar?: string | null
          alt_en?: string | null
          created_at?: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          path?: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          is_internal: boolean
          logistics_delivery_eta: string | null
          note: string | null
          order_id: string
          status: string
          supplier_ready_eta: string | null
          vehicle_info: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_internal?: boolean
          logistics_delivery_eta?: string | null
          note?: string | null
          order_id: string
          status: string
          supplier_ready_eta?: string | null
          vehicle_info?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_internal?: boolean
          logistics_delivery_eta?: string | null
          note?: string | null
          order_id?: string
          status?: string
          supplier_ready_eta?: string | null
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          buyer_id: string | null
          contact_phone: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          customer_email: string | null
          discount: number
          id: string
          internal_notes: string | null
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping: number
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          buyer_id?: string | null
          contact_phone?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          discount?: number
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping?: number
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          buyer_id?: string | null
          contact_phone?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          discount?: number
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping?: number
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content_ar: string | null
          content_en: string | null
          created_at: string
          id: string
          is_indexable: boolean
          is_published: boolean
          meta_description_ar: string | null
          meta_description_en: string | null
          meta_title_ar: string | null
          meta_title_en: string | null
          nav_sort_order: number
          og_image_url: string | null
          show_in_nav: boolean
          slug: string
          sort_order: number
          title_ar: string | null
          title_en: string
          updated_at: string
        }
        Insert: {
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          id?: string
          is_indexable?: boolean
          is_published?: boolean
          meta_description_ar?: string | null
          meta_description_en?: string | null
          meta_title_ar?: string | null
          meta_title_en?: string | null
          nav_sort_order?: number
          og_image_url?: string | null
          show_in_nav?: boolean
          slug: string
          sort_order?: number
          title_ar?: string | null
          title_en: string
          updated_at?: string
        }
        Update: {
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          id?: string
          is_indexable?: boolean
          is_published?: boolean
          meta_description_ar?: string | null
          meta_description_en?: string | null
          meta_title_ar?: string | null
          meta_title_en?: string | null
          nav_sort_order?: number
          og_image_url?: string | null
          show_in_nav?: boolean
          slug?: string
          sort_order?: number
          title_ar?: string | null
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          code: string
          config: Json
          created_at: string
          description_ar: string | null
          description_en: string | null
          environment: string
          fees_fixed: number
          fees_percent: number
          icon_url: string | null
          id: string
          instructions_ar: string | null
          instructions_en: string | null
          is_available_at_launch: boolean
          is_enabled: boolean
          name_ar: string | null
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          config?: Json
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          environment?: string
          fees_fixed?: number
          fees_percent?: number
          icon_url?: string | null
          id?: string
          instructions_ar?: string | null
          instructions_en?: string | null
          is_available_at_launch?: boolean
          is_enabled?: boolean
          name_ar?: string | null
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          config?: Json
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          environment?: string
          fees_fixed?: number
          fees_percent?: number
          icon_url?: string | null
          id?: string
          instructions_ar?: string | null
          instructions_en?: string | null
          is_available_at_launch?: boolean
          is_enabled?: boolean
          name_ar?: string | null
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway_reference: string | null
          id: string
          metadata: Json
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          proof_media_id: string | null
          proof_url: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transfer_reference: string | null
          transferred_at: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway_reference?: string | null
          id?: string
          metadata?: Json
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          proof_media_id?: string | null
          proof_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_reference?: string | null
          transferred_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway_reference?: string | null
          id?: string
          metadata?: Json
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          proof_media_id?: string | null
          proof_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_reference?: string | null
          transferred_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_proof_media_id_fkey"
            columns: ["proof_media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          id: string
          order_id: string
          product_id: string
          rating: number
          status_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          id?: string
          order_id: string
          product_id: string
          rating: number
          status_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          rating?: number
          status_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "review_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          is_offer: boolean | null
          max_quantity: number | null
          min_quantity: number | null
          name_ar: string
          name_en: string
          offer_price: number | null
          rating: number | null
          retail_price: number
          reviews_count: number | null
          sku: string | null
          slug: string
          specifications: Json | null
          stock: number | null
          supplier_id: string | null
          tags: string[] | null
          tax_rate: number | null
          unit: string | null
          updated_at: string
          video_url: string | null
          weight: number | null
          wholesale_price: number | null
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_offer?: boolean | null
          max_quantity?: number | null
          min_quantity?: number | null
          name_ar: string
          name_en: string
          offer_price?: number | null
          rating?: number | null
          retail_price?: number
          reviews_count?: number | null
          sku?: string | null
          slug: string
          specifications?: Json | null
          stock?: number | null
          supplier_id?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          unit?: string | null
          updated_at?: string
          video_url?: string | null
          weight?: number | null
          wholesale_price?: number | null
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_offer?: boolean | null
          max_quantity?: number | null
          min_quantity?: number | null
          name_ar?: string
          name_en?: string
          offer_price?: number | null
          rating?: number | null
          retail_price?: number
          reviews_count?: number | null
          sku?: string | null
          slug?: string
          specifications?: Json | null
          stock?: number | null
          supplier_id?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          unit?: string | null
          updated_at?: string
          video_url?: string | null
          weight?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "public_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          language: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          language?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          language?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_statuses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
          label_en: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar: string
          label_en: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      supplier_users: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          supplier_id: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "public_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          brand_name: string | null
          business_type: string | null
          city: string | null
          commercial_registration: string | null
          company_name: string
          cover_url: string | null
          created_at: string
          description: string | null
          email: string | null
          governorate: string | null
          id: string
          is_featured: boolean | null
          logo_url: string | null
          owner_name: string | null
          phone: string | null
          rating: number | null
          status: Database["public"]["Enums"]["verification_status"] | null
          tax_number: string | null
          updated_at: string
          user_id: string | null
          vat_number: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          brand_name?: string | null
          business_type?: string | null
          city?: string | null
          commercial_registration?: string | null
          company_name: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          governorate?: string | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          owner_name?: string | null
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
          vat_number?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          brand_name?: string | null
          business_type?: string | null
          city?: string | null
          commercial_registration?: string | null
          company_name?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          governorate?: string | null
          id?: string
          is_featured?: boolean | null
          logo_url?: string | null
          owner_name?: string | null
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
          vat_number?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      theme_settings: {
        Row: {
          color_accent: string
          color_accent_foreground: string
          color_background: string
          color_border: string
          color_error: string
          color_primary: string
          color_primary_foreground: string
          color_secondary: string
          color_secondary_foreground: string
          color_success: string
          color_surface: string
          color_text: string
          color_warning: string
          favicon_url: string | null
          font_family: string
          id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          color_accent?: string
          color_accent_foreground?: string
          color_background?: string
          color_border?: string
          color_error?: string
          color_primary?: string
          color_primary_foreground?: string
          color_secondary?: string
          color_secondary_foreground?: string
          color_success?: string
          color_surface?: string
          color_text?: string
          color_warning?: string
          favicon_url?: string | null
          font_family?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          color_accent?: string
          color_accent_foreground?: string
          color_background?: string
          color_border?: string
          color_error?: string
          color_primary?: string
          color_primary_foreground?: string
          color_secondary?: string
          color_secondary_foreground?: string
          color_success?: string
          color_surface?: string
          color_text?: string
          color_warning?: string
          favicon_url?: string | null
          font_family?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      order_fulfillment_current: {
        Row: {
          driver_name: string | null
          driver_phone: string | null
          logistics_delivery_eta: string | null
          note: string | null
          order_id: string | null
          stage: string | null
          stage_at: string | null
          supplier_ready_eta: string | null
          vehicle_info: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      public_payment_methods: {
        Row: {
          code: string | null
          description_ar: string | null
          description_en: string | null
          fees_fixed: number | null
          fees_percent: number | null
          icon_url: string | null
          id: string | null
          instructions_ar: string | null
          instructions_en: string | null
          is_available_at_launch: boolean | null
          is_enabled: boolean | null
          name_ar: string | null
          name_en: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          description_ar?: string | null
          description_en?: string | null
          fees_fixed?: number | null
          fees_percent?: number | null
          icon_url?: string | null
          id?: string | null
          instructions_ar?: string | null
          instructions_en?: string | null
          is_available_at_launch?: boolean | null
          is_enabled?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          description_ar?: string | null
          description_en?: string | null
          fees_fixed?: number | null
          fees_percent?: number | null
          icon_url?: string | null
          id?: string | null
          instructions_ar?: string | null
          instructions_en?: string | null
          is_available_at_launch?: boolean | null
          is_enabled?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      public_suppliers: {
        Row: {
          brand_name: string | null
          business_type: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          governorate: string | null
          id: string | null
          is_featured: boolean | null
          logo_url: string | null
        }
        Insert: {
          brand_name?: string | null
          business_type?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          governorate?: string | null
          id?: string | null
          is_featured?: boolean | null
          logo_url?: string | null
        }
        Update: {
          brand_name?: string | null
          business_type?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          governorate?: string | null
          id?: string | null
          is_featured?: boolean | null
          logo_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_order_payment: {
        Args: { p_note?: string; p_order_id: string }
        Returns: Json
      }
      logistics_set_order_stage: {
        Args: {
          p_driver_name?: string
          p_driver_phone?: string
          p_eta?: string
          p_note?: string
          p_order_id: string
          p_stage: string
          p_vehicle_info?: string
        }
        Returns: Json
      }
      merge_guest_cart_on_login: {
        Args: { p_session_token: string }
        Returns: string
      }
      place_order: {
        Args: {
          p_address_id: string
          p_notes?: string
          p_payment_method: string
          p_proof_media_id?: string
          p_proof_url?: string
          p_transfer_reference?: string
        }
        Returns: Json
      }
      reject_order_payment: {
        Args: { p_order_id: string; p_reason: string }
        Returns: Json
      }
      rollback_content_version: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_version_number: number
        }
        Returns: undefined
      }
      set_review_status: {
        Args: { p_review_id: string; p_status_code: string }
        Returns: Json
      }
      supplier_set_order_stage: {
        Args: {
          p_eta?: string
          p_note?: string
          p_order_id: string
          p_stage: string
        }
        Returns: Json
      }
      update_delivery_status: {
        Args: {
          p_delivery_id: string
          p_failure_reason_code?: string
          p_new_status_code: string
          p_note?: string
          p_reschedule_at?: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_type: "supplier" | "business_buyer" | "personal_buyer"
      app_role:
        | "super_admin"
        | "admin"
        | "supplier"
        | "business_buyer"
        | "personal_buyer"
        | "logistics_partner"
      order_status:
        | "pending"
        | "pending_payment_review"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_method: "cod" | "instapay" | "wallet"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      verification_status: "pending" | "approved" | "rejected" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["supplier", "business_buyer", "personal_buyer"],
      app_role: [
        "super_admin",
        "admin",
        "supplier",
        "business_buyer",
        "personal_buyer",
        "logistics_partner",
      ],
      order_status: [
        "pending",
        "pending_payment_review",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_method: ["cod", "instapay", "wallet"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      verification_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
