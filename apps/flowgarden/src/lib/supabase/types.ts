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
      caribbean_proofs: {
        Row: {
          evidence: Json | null
          proof_type: string
          vouched_at: string | null
          vouched_by: string | null
          wallet_address: string
        }
        Insert: {
          evidence?: Json | null
          proof_type: string
          vouched_at?: string | null
          vouched_by?: string | null
          wallet_address: string
        }
        Update: {
          evidence?: Json | null
          proof_type?: string
          vouched_at?: string | null
          vouched_by?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      danz_profiles: {
        Row: {
          created_at: string | null
          id: string
          level: number | null
          move_score: number | null
          user_id: string | null
          xp_total: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number | null
          move_score?: number | null
          user_id?: string | null
          xp_total?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number | null
          move_score?: number | null
          user_id?: string | null
          xp_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "danz_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      data_consent_grants: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_via: string | null
          grantee_app: string
          grantee_domain: string | null
          id: string
          identity_id: string
          is_active: boolean
          last_used_at: string | null
          purpose_description: string | null
          revoked_at: string | null
          scopes: Database["public"]["Enums"]["consent_scope"][]
          use_count: number
          zk_proof_hash: string | null
          zk_proof_required: boolean
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_via?: string | null
          grantee_app: string
          grantee_domain?: string | null
          id?: string
          identity_id: string
          is_active?: boolean
          last_used_at?: string | null
          purpose_description?: string | null
          revoked_at?: string | null
          scopes: Database["public"]["Enums"]["consent_scope"][]
          use_count?: number
          zk_proof_hash?: string | null
          zk_proof_required?: boolean
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_via?: string | null
          grantee_app?: string
          grantee_domain?: string | null
          id?: string
          identity_id?: string
          is_active?: boolean
          last_used_at?: string | null
          purpose_description?: string | null
          revoked_at?: string | null
          scopes?: Database["public"]["Enums"]["consent_scope"][]
          use_count?: number
          zk_proof_hash?: string | null
          zk_proof_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "data_consent_grants_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_consent_grants_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_consent_grants_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_wallet_audit: {
        Row: {
          cached_at: string | null
          first_activity: string | null
          id: number
          last_activity: string | null
          mint_authority: string | null
          notable_inbound: Json | null
          notable_outbound: Json | null
          total_tx_count: number | null
        }
        Insert: {
          cached_at?: string | null
          first_activity?: string | null
          id?: number
          last_activity?: string | null
          mint_authority?: string | null
          notable_inbound?: Json | null
          notable_outbound?: Json | null
          total_tx_count?: number | null
        }
        Update: {
          cached_at?: string | null
          first_activity?: string | null
          id?: number
          last_activity?: string | null
          mint_authority?: string | null
          notable_inbound?: Json | null
          notable_outbound?: Json | null
          total_tx_count?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          city: string | null
          config: Json
          country: string | null
          created_at: string
          description: string | null
          ends_at: string
          id: string
          is_public: boolean
          max_capacity: number | null
          name: string
          organizer_id: string | null
          product_id: string
          semaphore_group_id: string | null
          slug: string
          starts_at: string
          timezone: string
          updated_at: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          city?: string | null
          config?: Json
          country?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          is_public?: boolean
          max_capacity?: number | null
          name: string
          organizer_id?: string | null
          product_id: string
          semaphore_group_id?: string | null
          slug: string
          starts_at: string
          timezone?: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          city?: string | null
          config?: Json
          country?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          is_public?: boolean
          max_capacity?: number | null
          name?: string
          organizer_id?: string | null
          product_id?: string
          semaphore_group_id?: string | null
          slug?: string
          starts_at?: string
          timezone?: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_cdmx_profiles: {
        Row: {
          attended: boolean | null
          created_at: string | null
          id: string
          ticket_tier: string | null
          user_id: string | null
        }
        Insert: {
          attended?: boolean | null
          created_at?: string | null
          id?: string
          ticket_tier?: string | null
          user_id?: string | null
        }
        Update: {
          attended?: boolean | null
          created_at?: string | null
          id?: string
          ticket_tier?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_cdmx_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      flowbond_auth_accounts: {
        Row: {
          created_at: string
          id: string
          identity_id: string
          provider: string
          provider_account_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          identity_id: string
          provider: string
          provider_account_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          identity_id?: string
          provider?: string
          provider_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flowbond_auth_accounts_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_core_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      flowbond_core_identities: {
        Row: {
          created_at: string
          id: string
          primary_wallet_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          primary_wallet_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          primary_wallet_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flowbond_core_identities_primary_wallet_id_fkey"
            columns: ["primary_wallet_id"]
            isOneToOne: false
            referencedRelation: "flowbond_wallet_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      flowbond_identities: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          bio: string | null
          bitcoin_address: string | null
          cosmos_address: string | null
          created_at: string
          display_name: string | null
          email: string | null
          evm_address: string | null
          handle: string
          handle_is_draft: boolean
          icp_principal: string | null
          icp_vault_canister_id: string | null
          id: string
          is_active: boolean
          is_public: boolean
          is_verified: boolean
          last_seen_at: string | null
          lightning_node_id: string | null
          near_address: string | null
          phone: string | null
          points_balance: number
          polkadot_address: string | null
          referral_code: string
          referred_by_id: string | null
          solana_address: string | null
          ton_address: string | null
          updated_at: string
          zk_identity_commitment: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          bitcoin_address?: string | null
          cosmos_address?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          evm_address?: string | null
          handle: string
          handle_is_draft?: boolean
          icp_principal?: string | null
          icp_vault_canister_id?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          is_verified?: boolean
          last_seen_at?: string | null
          lightning_node_id?: string | null
          near_address?: string | null
          phone?: string | null
          points_balance?: number
          polkadot_address?: string | null
          referral_code?: string
          referred_by_id?: string | null
          solana_address?: string | null
          ton_address?: string | null
          updated_at?: string
          zk_identity_commitment?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          bitcoin_address?: string | null
          cosmos_address?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          evm_address?: string | null
          handle?: string
          handle_is_draft?: boolean
          icp_principal?: string | null
          icp_vault_canister_id?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          is_verified?: boolean
          last_seen_at?: string | null
          lightning_node_id?: string | null
          near_address?: string | null
          phone?: string | null
          points_balance?: number
          polkadot_address?: string | null
          referral_code?: string
          referred_by_id?: string | null
          solana_address?: string | null
          ton_address?: string | null
          updated_at?: string
          zk_identity_commitment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flowbond_identities_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowbond_identities_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowbond_identities_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      flowbond_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          core_identity_id: string
          created_at: string
          display_name: string | null
          handle: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          core_identity_id: string
          created_at?: string
          display_name?: string | null
          handle: string
          id?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          core_identity_id?: string
          created_at?: string
          display_name?: string | null
          handle?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flowbond_profiles_core_identity_id_fkey"
            columns: ["core_identity_id"]
            isOneToOne: true
            referencedRelation: "flowbond_core_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      flowbond_users: {
        Row: {
          created_at: string | null
          email: string | null
          flowbond_id: string | null
          id: string
          privy_did: string | null
          updated_at: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          flowbond_id?: string | null
          id?: string
          privy_did?: string | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          flowbond_id?: string | null
          id?: string
          privy_did?: string | null
          updated_at?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      flowbond_wallet_connections: {
        Row: {
          address: string
          chain: string
          created_at: string
          id: string
          identity_id: string
          is_primary: boolean
          is_verified: boolean
          updated_at: string
          verification_claim_source: string | null
        }
        Insert: {
          address: string
          chain: string
          created_at?: string
          id?: string
          identity_id: string
          is_primary?: boolean
          is_verified?: boolean
          updated_at?: string
          verification_claim_source?: string | null
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string
          id?: string
          identity_id?: string
          is_primary?: boolean
          is_verified?: boolean
          updated_at?: string
          verification_claim_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flowbond_wallet_connections_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_core_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_events: {
        Row: {
          ai_analysis: Json | null
          confidence_score: number | null
          created_at: string | null
          event_type: Database["public"]["Enums"]["flowgarden_event_type"]
          garden_id: string | null
          id: string
          intent: Database["public"]["Enums"]["flowgarden_intent"] | null
          media_urls: string[] | null
          metadata: Json | null
          occurred_at: string
          plant_group_id: string | null
          plant_id: string | null
          raw_input: string | null
          structured_summary: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          urgency: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id: string
          zone_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          event_type: Database["public"]["Enums"]["flowgarden_event_type"]
          garden_id?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["flowgarden_intent"] | null
          media_urls?: string[] | null
          metadata?: Json | null
          occurred_at?: string
          plant_group_id?: string | null
          plant_id?: string | null
          raw_input?: string | null
          structured_summary?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id: string
          zone_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["flowgarden_event_type"]
          garden_id?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["flowgarden_intent"] | null
          media_urls?: string[] | null
          metadata?: Json | null
          occurred_at?: string
          plant_group_id?: string | null
          plant_id?: string | null
          raw_input?: string | null
          structured_summary?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_events_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_events_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_events_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_events_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_gardens: {
        Row: {
          climate_zone: string | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          location_label: string | null
          longitude: number | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          climate_zone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          location_label?: string | null
          longitude?: number | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          climate_zone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          location_label?: string | null
          longitude?: number | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_gardens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_memory_summaries: {
        Row: {
          created_at: string | null
          event_count: number | null
          garden_id: string | null
          id: string
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          plant_group_id: string | null
          summary: string
          summary_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_count?: number | null
          garden_id?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          plant_group_id?: string | null
          summary: string
          summary_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_count?: number | null
          garden_id?: string | null
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          plant_group_id?: string | null
          summary?: string
          summary_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_memory_summaries_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_memory_summaries_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_memory_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_plant_groups: {
        Row: {
          container_type: string | null
          created_at: string | null
          expected_next_action_date: string | null
          garden_id: string
          health_status: Database["public"]["Enums"]["flowgarden_health_status"]
          id: string
          location_description: string | null
          metadata: Json | null
          name: string
          notes: string | null
          photo_urls: string[] | null
          planted_date: string | null
          quantity: number
          species: string | null
          status: Database["public"]["Enums"]["flowgarden_plant_group_status"]
          transplanted_date: string | null
          updated_at: string | null
          user_id: string
          variety: string | null
          zone_id: string | null
        }
        Insert: {
          container_type?: string | null
          created_at?: string | null
          expected_next_action_date?: string | null
          garden_id: string
          health_status?: Database["public"]["Enums"]["flowgarden_health_status"]
          id?: string
          location_description?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          photo_urls?: string[] | null
          planted_date?: string | null
          quantity?: number
          species?: string | null
          status?: Database["public"]["Enums"]["flowgarden_plant_group_status"]
          transplanted_date?: string | null
          updated_at?: string | null
          user_id: string
          variety?: string | null
          zone_id?: string | null
        }
        Update: {
          container_type?: string | null
          created_at?: string | null
          expected_next_action_date?: string | null
          garden_id?: string
          health_status?: Database["public"]["Enums"]["flowgarden_health_status"]
          id?: string
          location_description?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          photo_urls?: string[] | null
          planted_date?: string | null
          quantity?: number
          species?: string | null
          status?: Database["public"]["Enums"]["flowgarden_plant_group_status"]
          transplanted_date?: string | null
          updated_at?: string | null
          user_id?: string
          variety?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_plant_groups_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_plant_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_plant_groups_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_plants: {
        Row: {
          created_at: string | null
          garden_id: string
          health_status: Database["public"]["Enums"]["flowgarden_health_status"]
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          photo_urls: string[] | null
          plant_group_id: string | null
          planted_date: string | null
          species: string | null
          status: Database["public"]["Enums"]["flowgarden_plant_group_status"]
          updated_at: string | null
          user_id: string
          variety: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string | null
          garden_id: string
          health_status?: Database["public"]["Enums"]["flowgarden_health_status"]
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          photo_urls?: string[] | null
          plant_group_id?: string | null
          planted_date?: string | null
          species?: string | null
          status?: Database["public"]["Enums"]["flowgarden_plant_group_status"]
          updated_at?: string | null
          user_id: string
          variety?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string | null
          garden_id?: string
          health_status?: Database["public"]["Enums"]["flowgarden_health_status"]
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          photo_urls?: string[] | null
          plant_group_id?: string | null
          planted_date?: string | null
          species?: string | null
          status?: Database["public"]["Enums"]["flowgarden_plant_group_status"]
          updated_at?: string | null
          user_id?: string
          variety?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_plants_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_plants_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_plants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_plants_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_profiles: {
        Row: {
          ai_provider_preferences: Json | null
          created_at: string | null
          display_name: string | null
          gardening_style: Json | null
          id: string
          language: string | null
          privacy_mode: Database["public"]["Enums"]["flowgarden_privacy_mode"]
          updated_at: string | null
          user_id: string
          xp_total: number
        }
        Insert: {
          ai_provider_preferences?: Json | null
          created_at?: string | null
          display_name?: string | null
          gardening_style?: Json | null
          id?: string
          language?: string | null
          privacy_mode?: Database["public"]["Enums"]["flowgarden_privacy_mode"]
          updated_at?: string | null
          user_id: string
          xp_total?: number
        }
        Update: {
          ai_provider_preferences?: Json | null
          created_at?: string | null
          display_name?: string | null
          gardening_style?: Json | null
          id?: string
          language?: string | null
          privacy_mode?: Database["public"]["Enums"]["flowgarden_privacy_mode"]
          updated_at?: string | null
          user_id?: string
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_recommendations: {
        Row: {
          accepted: boolean | null
          acted_on_event_id: string | null
          body: string
          created_at: string | null
          garden_id: string | null
          id: string
          metadata: Json | null
          plant_group_id: string | null
          plant_id: string | null
          rationale: string | null
          source_event_id: string | null
          title: string
          updated_at: string | null
          urgency: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          acted_on_event_id?: string | null
          body: string
          created_at?: string | null
          garden_id?: string | null
          id?: string
          metadata?: Json | null
          plant_group_id?: string | null
          plant_id?: string | null
          rationale?: string | null
          source_event_id?: string | null
          title: string
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          acted_on_event_id?: string | null
          body?: string
          created_at?: string | null
          garden_id?: string | null
          id?: string
          metadata?: Json | null
          plant_group_id?: string | null
          plant_id?: string | null
          rationale?: string | null
          source_event_id?: string | null
          title?: string
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_recommendations_acted_on_event_id_fkey"
            columns: ["acted_on_event_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_recommendations_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_recommendations_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_recommendations_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_recommendations_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_sensor_readings: {
        Row: {
          created_at: string | null
          garden_id: string
          id: string
          metadata: Json | null
          recorded_at: string
          sensor_id: string | null
          sensor_type: string
          unit: string
          user_id: string
          value: number
          zone_id: string | null
        }
        Insert: {
          created_at?: string | null
          garden_id: string
          id?: string
          metadata?: Json | null
          recorded_at?: string
          sensor_id?: string | null
          sensor_type: string
          unit: string
          user_id: string
          value: number
          zone_id?: string | null
        }
        Update: {
          created_at?: string | null
          garden_id?: string
          id?: string
          metadata?: Json | null
          recorded_at?: string
          sensor_id?: string | null
          sensor_type?: string
          unit?: string
          user_id?: string
          value?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_sensor_readings_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_sensor_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_sensor_readings_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_tasks: {
        Row: {
          completed_at: string | null
          completed_event_id: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          garden_id: string | null
          id: string
          is_mission: boolean
          metadata: Json | null
          mission_category: string | null
          plant_group_id: string | null
          plant_id: string | null
          source_event_id: string | null
          status: Database["public"]["Enums"]["flowgarden_task_status"]
          title: string
          updated_at: string | null
          urgency: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id: string
          xp_reward: number
          zone_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_event_id?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          garden_id?: string | null
          id?: string
          is_mission?: boolean
          metadata?: Json | null
          mission_category?: string | null
          plant_group_id?: string | null
          plant_id?: string | null
          source_event_id?: string | null
          status?: Database["public"]["Enums"]["flowgarden_task_status"]
          title: string
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id: string
          xp_reward?: number
          zone_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_event_id?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          garden_id?: string | null
          id?: string
          is_mission?: boolean
          metadata?: Json | null
          mission_category?: string | null
          plant_group_id?: string | null
          plant_id?: string | null
          source_event_id?: string | null
          status?: Database["public"]["Enums"]["flowgarden_task_status"]
          title?: string
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["flowgarden_urgency"]
          user_id?: string
          xp_reward?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_tasks_completed_event_id_fkey"
            columns: ["completed_event_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_tasks_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_tasks_plant_group_id_fkey"
            columns: ["plant_group_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_plant_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_tasks_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_tasks_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_tasks_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_xp_log: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string | null
          source_event_id: string | null
          source_task_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason?: string | null
          source_event_id?: string | null
          source_task_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string | null
          source_event_id?: string | null
          source_task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_xp_log_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_xp_log_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_xp_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      flowgarden_zones: {
        Row: {
          created_at: string | null
          description: string | null
          garden_id: string
          id: string
          metadata: Json | null
          name: string
          photo_urls: string[] | null
          soil_notes: string | null
          sun_exposure: string | null
          updated_at: string | null
          user_id: string
          zone_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          garden_id: string
          id?: string
          metadata?: Json | null
          name: string
          photo_urls?: string[] | null
          soil_notes?: string | null
          sun_exposure?: string | null
          updated_at?: string | null
          user_id: string
          zone_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          garden_id?: string
          id?: string
          metadata?: Json | null
          name?: string
          photo_urls?: string[] | null
          soil_notes?: string | null
          sun_exposure?: string | null
          updated_at?: string | null
          user_id?: string
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flowgarden_zones_garden_id_fkey"
            columns: ["garden_id"]
            isOneToOne: false
            referencedRelation: "flowgarden_gardens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flowgarden_zones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_roles: {
        Row: {
          event_id: string | null
          expires_at: string | null
          granted_at: string
          granted_by_id: string | null
          id: string
          identity_id: string
          is_active: boolean
          product_slug: string | null
          profile_data: Json
          role: Database["public"]["Enums"]["global_role"]
          scope: Database["public"]["Enums"]["role_scope"]
        }
        Insert: {
          event_id?: string | null
          expires_at?: string | null
          granted_at?: string
          granted_by_id?: string | null
          id?: string
          identity_id: string
          is_active?: boolean
          product_slug?: string | null
          profile_data?: Json
          role: Database["public"]["Enums"]["global_role"]
          scope?: Database["public"]["Enums"]["role_scope"]
        }
        Update: {
          event_id?: string | null
          expires_at?: string | null
          granted_at?: string
          granted_by_id?: string | null
          id?: string
          identity_id?: string
          is_active?: boolean
          product_slug?: string | null
          profile_data?: Json
          role?: Database["public"]["Enums"]["global_role"]
          scope?: Database["public"]["Enums"]["role_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "identity_roles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_roles_granted_by_id_fkey"
            columns: ["granted_by_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_roles_granted_by_id_fkey"
            columns: ["granted_by_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_roles_granted_by_id_fkey"
            columns: ["granted_by_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_roles_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_roles_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_roles_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_sessions: {
        Row: {
          created_at: string
          device_type: string | null
          expires_at: string
          id: string
          identity_id: string
          ip_hash: string | null
          last_active_at: string
          product_slug: string | null
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          expires_at?: string
          id?: string
          identity_id: string
          ip_hash?: string | null
          last_active_at?: string
          product_slug?: string | null
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          expires_at?: string
          id?: string
          identity_id?: string
          ip_hash?: string | null
          last_active_at?: string
          product_slug?: string | null
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_sessions_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_sessions_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_sessions_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          is_active: boolean
          points_reward: number
          product_id: string | null
          required_action: Json | null
          requires_mission_id: string | null
          slug: string
          sort_order: number
          title: string
          unlocks_chain: Database["public"]["Enums"]["chain_id"] | null
          xp_reward: number
          zk_circuit_id: string | null
          zk_proof_required: boolean
        }
        Insert: {
          content?: Json
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          points_reward?: number
          product_id?: string | null
          required_action?: Json | null
          requires_mission_id?: string | null
          slug: string
          sort_order?: number
          title: string
          unlocks_chain?: Database["public"]["Enums"]["chain_id"] | null
          xp_reward?: number
          zk_circuit_id?: string | null
          zk_proof_required?: boolean
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean
          points_reward?: number
          product_id?: string | null
          required_action?: Json | null
          requires_mission_id?: string | null
          slug?: string
          sort_order?: number
          title?: string
          unlocks_chain?: Database["public"]["Enums"]["chain_id"] | null
          xp_reward?: number
          zk_circuit_id?: string | null
          zk_proof_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "missions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_requires_mission_id_fkey"
            columns: ["requires_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mountain_dogs_profiles: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mountain_dogs_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      og_snapshot: {
        Row: {
          detected_at: string | null
          nft_mint: string
          source: string
          wallet_address: string
        }
        Insert: {
          detected_at?: string | null
          nft_mint: string
          source: string
          wallet_address: string
        }
        Update: {
          detected_at?: string | null
          nft_mint?: string
          source?: string
          wallet_address?: string
        }
        Relationships: []
      }
      og_stats: {
        Row: {
          id: number
          last_updated: string | null
          total_caribbean_phoenix: number | null
          total_citizens: number | null
          total_og_verified: number | null
          total_phoenix_eligible: number | null
          total_phoenix_minted: number | null
        }
        Insert: {
          id?: number
          last_updated?: string | null
          total_caribbean_phoenix?: number | null
          total_citizens?: number | null
          total_og_verified?: number | null
          total_phoenix_eligible?: number | null
          total_phoenix_minted?: number | null
        }
        Update: {
          id?: number
          last_updated?: string | null
          total_caribbean_phoenix?: number | null
          total_citizens?: number | null
          total_og_verified?: number | null
          total_phoenix_eligible?: number | null
          total_phoenix_minted?: number | null
        }
        Relationships: []
      }
      partner_status: {
        Row: {
          display_name: string
          last_updated: string | null
          notes: string | null
          partner_key: string
          status: string
          web_url: string | null
        }
        Insert: {
          display_name: string
          last_updated?: string | null
          notes?: string | null
          partner_key: string
          status: string
          web_url?: string | null
        }
        Update: {
          display_name?: string
          last_updated?: string | null
          notes?: string | null
          partner_key?: string
          status?: string
          web_url?: string | null
        }
        Relationships: []
      }
      phoenix_claims: {
        Row: {
          caribbean_voucher_handle: string | null
          claim_type: string | null
          created_at: string | null
          discord_handle: string | null
          id: string
          old_wallets: string[] | null
          photo_urls: string[] | null
          referrer_handle: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string | null
          story: string
          telegram_handle: string | null
          twitter_handle: string | null
          vouches: number | null
          wallet_address: string
        }
        Insert: {
          caribbean_voucher_handle?: string | null
          claim_type?: string | null
          created_at?: string | null
          discord_handle?: string | null
          id?: string
          old_wallets?: string[] | null
          photo_urls?: string[] | null
          referrer_handle: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string | null
          story: string
          telegram_handle?: string | null
          twitter_handle?: string | null
          vouches?: number | null
          wallet_address: string
        }
        Update: {
          caribbean_voucher_handle?: string | null
          claim_type?: string | null
          created_at?: string | null
          discord_handle?: string | null
          id?: string
          old_wallets?: string[] | null
          photo_urls?: string[] | null
          referrer_handle?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string | null
          story?: string
          telegram_handle?: string | null
          twitter_handle?: string | null
          vouches?: number | null
          wallet_address?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          identity_id: string
          mission_id: string | null
          referral_id: string | null
          triggered_by_id: string | null
          tx_type: Database["public"]["Enums"]["points_tx_type"]
          zk_proof_ref: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          identity_id: string
          mission_id?: string | null
          referral_id?: string | null
          triggered_by_id?: string | null
          tx_type: Database["public"]["Enums"]["points_tx_type"]
          zk_proof_ref?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          identity_id?: string
          mission_id?: string | null
          referral_id?: string | null
          triggered_by_id?: string | null
          tx_type?: Database["public"]["Enums"]["points_tx_type"]
          zk_proof_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_triggered_by_id_fkey"
            columns: ["triggered_by_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_triggered_by_id_fkey"
            columns: ["triggered_by_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_triggered_by_id_fkey"
            columns: ["triggered_by_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      private_data_vault: {
        Row: {
          access_count: number
          content_hash: string
          created_at: string
          data_type: Database["public"]["Enums"]["private_data_type"]
          encryption_scheme: string
          icp_canister_id: string
          icp_data_key: string
          id: string
          identity_id: string
          last_accessed_at: string | null
          updated_at: string
        }
        Insert: {
          access_count?: number
          content_hash: string
          created_at?: string
          data_type: Database["public"]["Enums"]["private_data_type"]
          encryption_scheme?: string
          icp_canister_id: string
          icp_data_key: string
          id?: string
          identity_id: string
          last_accessed_at?: string | null
          updated_at?: string
        }
        Update: {
          access_count?: number
          content_hash?: string
          created_at?: string
          data_type?: Database["public"]["Enums"]["private_data_type"]
          encryption_scheme?: string
          icp_canister_id?: string
          icp_data_key?: string
          id?: string
          identity_id?: string
          last_accessed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_data_vault_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_data_vault_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_data_vault_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          domain: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profile_storefronts: {
        Row: {
          accent_color: string | null
          cover_url: string | null
          featured_events: string[]
          featured_links: Json
          id: string
          identity_id: string
          show_chains_unlocked: boolean
          show_missions_badge: boolean
          show_points_balance: boolean
          show_referral_link: boolean
          show_zk_badge: boolean
          social: Json
          theme: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          cover_url?: string | null
          featured_events?: string[]
          featured_links?: Json
          id?: string
          identity_id: string
          show_chains_unlocked?: boolean
          show_missions_badge?: boolean
          show_points_balance?: boolean
          show_referral_link?: boolean
          show_zk_badge?: boolean
          social?: Json
          theme?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          cover_url?: string | null
          featured_events?: string[]
          featured_links?: Json
          id?: string
          identity_id?: string
          show_chains_unlocked?: boolean
          show_missions_badge?: boolean
          show_points_balance?: boolean
          show_referral_link?: boolean
          show_zk_badge?: boolean
          social?: Json
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_storefronts_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: true
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_storefronts_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_storefronts_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: true
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          flowbond_synced: boolean
          handle: string | null
          og_tier: string | null
          og_verified: boolean
          og_verified_at: string | null
          updated_at: string
          wallet_address: string
          whitelisted: boolean
          whitelisted_at: string | null
          xelva_balance: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          flowbond_synced?: boolean
          handle?: string | null
          og_tier?: string | null
          og_verified?: boolean
          og_verified_at?: string | null
          updated_at?: string
          wallet_address: string
          whitelisted?: boolean
          whitelisted_at?: string | null
          xelva_balance?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          flowbond_synced?: boolean
          handle?: string | null
          og_tier?: string | null
          og_verified?: boolean
          og_verified_at?: string | null
          updated_at?: string
          wallet_address?: string
          whitelisted?: boolean
          whitelisted_at?: string | null
          xelva_balance?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          clicked_at: string
          converted_at: string | null
          event_id: string | null
          event_type: Database["public"]["Enums"]["referral_event_type"]
          expires_at: string | null
          flagged_reason: string | null
          id: string
          ip_hash: string | null
          product_id: string | null
          referral_code_used: string
          referral_url: string | null
          referred_id: string | null
          referred_points: number
          referrer_id: string
          referrer_points: number
          resource_amount_usd: number | null
          resource_id: string | null
          resource_type: string | null
          rewarded_at: string | null
          status: Database["public"]["Enums"]["referral_status"]
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          zk_nullifier_hash: string | null
        }
        Insert: {
          clicked_at?: string
          converted_at?: string | null
          event_id?: string | null
          event_type: Database["public"]["Enums"]["referral_event_type"]
          expires_at?: string | null
          flagged_reason?: string | null
          id?: string
          ip_hash?: string | null
          product_id?: string | null
          referral_code_used: string
          referral_url?: string | null
          referred_id?: string | null
          referred_points?: number
          referrer_id: string
          referrer_points?: number
          resource_amount_usd?: number | null
          resource_id?: string | null
          resource_type?: string | null
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          zk_nullifier_hash?: string | null
        }
        Update: {
          clicked_at?: string
          converted_at?: string | null
          event_id?: string | null
          event_type?: Database["public"]["Enums"]["referral_event_type"]
          expires_at?: string | null
          flagged_reason?: string | null
          id?: string
          ip_hash?: string | null
          product_id?: string | null
          referral_code_used?: string
          referral_url?: string | null
          referred_id?: string | null
          referred_points?: number
          referrer_id?: string
          referrer_points?: number
          resource_amount_usd?: number | null
          resource_id?: string | null
          resource_type?: string | null
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          zk_nullifier_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_assignments: {
        Row: {
          metadata: Json | null
          signals: Json | null
          tier: string
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          metadata?: Json | null
          signals?: Json | null
          tier: string
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          metadata?: Json | null
          signals?: Json | null
          tier?: string
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      used_nullifiers: {
        Row: {
          action_context: string | null
          nullifier_hash: string
          proof_type: Database["public"]["Enums"]["zk_proof_type"]
          used_at: string
        }
        Insert: {
          action_context?: string | null
          nullifier_hash: string
          proof_type: Database["public"]["Enums"]["zk_proof_type"]
          used_at?: string
        }
        Update: {
          action_context?: string | null
          nullifier_hash?: string
          proof_type?: Database["public"]["Enums"]["zk_proof_type"]
          used_at?: string
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          id: string
          identity_id: string
          mission_id: string
          progress_data: Json
          proof_block: number | null
          proof_chain: Database["public"]["Enums"]["chain_id"] | null
          proof_tx_hash: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["mission_status"]
          zk_nullifier: string | null
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          id?: string
          identity_id: string
          mission_id: string
          progress_data?: Json
          proof_block?: number | null
          proof_chain?: Database["public"]["Enums"]["chain_id"] | null
          proof_tx_hash?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          zk_nullifier?: string | null
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          id?: string
          identity_id?: string
          mission_id?: string
          progress_data?: Json
          proof_block?: number | null
          proof_chain?: Database["public"]["Enums"]["chain_id"] | null
          proof_tx_hash?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          zk_nullifier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_missions_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_missions_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_missions_zk_nullifier_fkey"
            columns: ["zk_nullifier"]
            isOneToOne: false
            referencedRelation: "used_nullifiers"
            referencedColumns: ["nullifier_hash"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          locale: string
          referrer: string | null
          source: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          locale?: string
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locale?: string
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      wallet_connections: {
        Row: {
          address: string
          chain: Database["public"]["Enums"]["chain_id"]
          connected_at: string
          curve: Database["public"]["Enums"]["crypto_curve"]
          icp_canister_signer: string | null
          id: string
          identity_id: string
          is_active: boolean
          is_embedded: boolean
          is_primary: boolean
          key_group_id: string | null
          label: string | null
          last_used_at: string | null
          provider: Database["public"]["Enums"]["wallet_provider"]
          provider_wallet_id: string | null
        }
        Insert: {
          address: string
          chain: Database["public"]["Enums"]["chain_id"]
          connected_at?: string
          curve: Database["public"]["Enums"]["crypto_curve"]
          icp_canister_signer?: string | null
          id?: string
          identity_id: string
          is_active?: boolean
          is_embedded?: boolean
          is_primary?: boolean
          key_group_id?: string | null
          label?: string | null
          last_used_at?: string | null
          provider: Database["public"]["Enums"]["wallet_provider"]
          provider_wallet_id?: string | null
        }
        Update: {
          address?: string
          chain?: Database["public"]["Enums"]["chain_id"]
          connected_at?: string
          curve?: Database["public"]["Enums"]["crypto_curve"]
          icp_canister_signer?: string | null
          id?: string
          identity_id?: string
          is_active?: boolean
          is_embedded?: boolean
          is_primary?: boolean
          key_group_id?: string | null
          label?: string | null
          last_used_at?: string | null
          provider?: Database["public"]["Enums"]["wallet_provider"]
          provider_wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_connections_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_connections_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_connections_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      xelva_missions: {
        Row: {
          completed_at: string | null
          id: string
          mission_id: number
          user_id: string | null
          xp_awarded: number
        }
        Insert: {
          completed_at?: string | null
          id?: string
          mission_id: number
          user_id?: string | null
          xp_awarded: number
        }
        Update: {
          completed_at?: string | null
          id?: string
          mission_id?: number
          user_id?: string | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "xelva_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      xelva_profiles: {
        Row: {
          created_at: string | null
          id: string
          level: number | null
          referral_code: string | null
          referred_by: string | null
          user_id: string | null
          xlv_balance: number | null
          xp_total: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number | null
          referral_code?: string | null
          referred_by?: string | null
          user_id?: string | null
          xlv_balance?: number | null
          xp_total?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number | null
          referral_code?: string | null
          referred_by?: string | null
          user_id?: string | null
          xlv_balance?: number | null
          xp_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xelva_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      xelva_project_applications: {
        Row: {
          created_at: string | null
          description: string | null
          email: string | null
          goals: string[] | null
          id: string
          name: string | null
          org: string | null
          project_type: string | null
          raise_target: string | null
          region: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          email?: string | null
          goals?: string[] | null
          id?: string
          name?: string | null
          org?: string | null
          project_type?: string | null
          raise_target?: string | null
          region?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          email?: string | null
          goals?: string[] | null
          id?: string
          name?: string | null
          org?: string | null
          project_type?: string | null
          raise_target?: string | null
          region?: string | null
          status?: string | null
        }
        Relationships: []
      }
      xelva_purchases: {
        Row: {
          amount_usd: number | null
          created_at: string | null
          flowbond_fee: number | null
          id: string
          onramp: string | null
          status: string | null
          tx_hash: string | null
          user_id: string | null
          wallet_address: string | null
          xlv_received: number | null
        }
        Insert: {
          amount_usd?: number | null
          created_at?: string | null
          flowbond_fee?: number | null
          id?: string
          onramp?: string | null
          status?: string | null
          tx_hash?: string | null
          user_id?: string | null
          wallet_address?: string | null
          xlv_received?: number | null
        }
        Update: {
          amount_usd?: number | null
          created_at?: string | null
          flowbond_fee?: number | null
          id?: string
          onramp?: string | null
          status?: string | null
          tx_hash?: string | null
          user_id?: string | null
          wallet_address?: string | null
          xlv_received?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xelva_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      xelva_stakes: {
        Row: {
          active: boolean | null
          apy: number | null
          id: string
          project_id: string
          staked_at: string | null
          user_id: string | null
          xlv_amount: number
        }
        Insert: {
          active?: boolean | null
          apy?: number | null
          id?: string
          project_id: string
          staked_at?: string | null
          user_id?: string | null
          xlv_amount: number
        }
        Update: {
          active?: boolean | null
          apy?: number | null
          id?: string
          project_id?: string
          staked_at?: string | null
          user_id?: string | null
          xlv_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xelva_stakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "flowbond_users"
            referencedColumns: ["id"]
          },
        ]
      }
      zk_proofs_issued: {
        Row: {
          circuit_id: string | null
          claim_description: string
          expires_at: string | null
          id: string
          identity_id: string
          is_revoked: boolean
          issued_at: string
          issued_to_app: string
          issued_to_domain: string | null
          nullifier_hash: string
          proof_system: string
          proof_type: Database["public"]["Enums"]["zk_proof_type"]
          public_inputs_hash: string | null
          verification_tx: string | null
          verified_via: string | null
        }
        Insert: {
          circuit_id?: string | null
          claim_description: string
          expires_at?: string | null
          id?: string
          identity_id: string
          is_revoked?: boolean
          issued_at?: string
          issued_to_app: string
          issued_to_domain?: string | null
          nullifier_hash: string
          proof_system?: string
          proof_type: Database["public"]["Enums"]["zk_proof_type"]
          public_inputs_hash?: string | null
          verification_tx?: string | null
          verified_via?: string | null
        }
        Update: {
          circuit_id?: string | null
          claim_description?: string
          expires_at?: string | null
          id?: string
          identity_id?: string
          is_revoked?: boolean
          issued_at?: string
          issued_to_app?: string
          issued_to_domain?: string | null
          nullifier_hash?: string
          proof_system?: string
          proof_type?: Database["public"]["Enums"]["zk_proof_type"]
          public_inputs_hash?: string | null
          verification_tx?: string | null
          verified_via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zk_proofs_issued_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zk_proofs_issued_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zk_proofs_issued_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      identity_consent_dashboard: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          grantee_app: string | null
          grantee_domain: string | null
          id: string | null
          identity_id: string | null
          is_active: boolean | null
          last_used_at: string | null
          purpose_description: string | null
          revoked_at: string | null
          scopes: Database["public"]["Enums"]["consent_scope"][] | null
          use_count: number | null
          zk_proof_required: boolean | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          grantee_app?: string | null
          grantee_domain?: string | null
          id?: string | null
          identity_id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          purpose_description?: string | null
          revoked_at?: string | null
          scopes?: Database["public"]["Enums"]["consent_scope"][] | null
          use_count?: number | null
          zk_proof_required?: boolean | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          grantee_app?: string | null
          grantee_domain?: string | null
          id?: string | null
          identity_id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          purpose_description?: string | null
          revoked_at?: string | null
          scopes?: Database["public"]["Enums"]["consent_scope"][] | null
          use_count?: number | null
          zk_proof_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "data_consent_grants_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "flowbond_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_consent_grants_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_consent_grants_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "referral_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          bio: string | null
          chains_unlocked: Json | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          featured_events: string[] | null
          handle: string | null
          has_zk_identity: boolean | null
          id: string | null
          is_verified: boolean | null
          points_balance: number | null
          referral_code: string | null
          show_chains_unlocked: boolean | null
          show_missions_badge: boolean | null
          show_referral_link: boolean | null
          social: Json | null
          theme: string | null
        }
        Relationships: []
      }
      referral_leaderboard: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          handle: string | null
          id: string | null
          last_referral_at: string | null
          total_pts_earned: number | null
          total_referrals: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_points: {
        Args: {
          p_amount: number
          p_description?: string
          p_event_id?: string
          p_identity_id: string
          p_mission_id?: string
          p_referral_id?: string
          p_triggered_by?: string
          p_tx_type: Database["public"]["Enums"]["points_tx_type"]
          p_zk_proof_ref?: string
        }
        Returns: number
      }
      complete_mission: {
        Args: {
          p_identity_id: string
          p_mission_id: string
          p_proof_block?: number
          p_proof_chain?: Database["public"]["Enums"]["chain_id"]
          p_proof_tx_hash?: string
          p_zk_nullifier?: string
        }
        Returns: Json
      }
      current_core_identity_id: { Args: never; Returns: string }
      current_identity_id: { Args: never; Returns: string }
      get_my_tier: { Args: { p_wallet_address: string }; Returns: string }
      process_referral_conversion: {
        Args: {
          p_event_type: Database["public"]["Enums"]["referral_event_type"]
          p_referral_id: string
        }
        Returns: undefined
      }
      refresh_og_stats: { Args: never; Returns: undefined }
      upsert_flowbond_user: {
        Args: { p_email?: string; p_privy_did: string; p_wallet?: string }
        Returns: {
          created_at: string | null
          email: string | null
          flowbond_id: string | null
          id: string
          privy_did: string | null
          updated_at: string | null
          wallet_address: string | null
        }
        SetofOptions: {
          from: "*"
          to: "flowbond_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      xelva_add_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      chain_id:
        | "base"
        | "ethereum"
        | "polygon"
        | "arbitrum"
        | "optimism"
        | "bnb"
        | "solana"
        | "near"
        | "stellar"
        | "ton"
        | "polkadot"
        | "kusama"
        | "bitcoin"
        | "lightning"
        | "icp"
        | "cosmos"
      consent_scope:
        | "profile_public"
        | "points_balance"
        | "points_history"
        | "missions"
        | "roles"
        | "wallet_evm"
        | "wallet_solana"
        | "wallet_full_map"
        | "referral_stats"
        | "email"
        | "phone"
      crypto_curve:
        | "ecdsa_secp256k1"
        | "eddsa_ed25519"
        | "sr25519"
        | "ecdsa_secp256r1"
        | "schnorr"
        | "icp_chain_key"
      flowgarden_event_type:
        | "photo_uploaded"
        | "voice_note_uploaded"
        | "text_observation"
        | "planting"
        | "germination"
        | "transplant"
        | "watering"
        | "pest_observed"
        | "disease_observed"
        | "pruning"
        | "fertilizing"
        | "compost_added"
        | "mulch_added"
        | "harvest"
        | "container_changed"
        | "location_changed"
        | "sensor_reading"
        | "ai_recommendation"
        | "task_completed"
        | "question_asked"
        | "system_summary"
      flowgarden_health_status:
        | "excellent"
        | "good"
        | "stressed"
        | "critical"
        | "unknown"
      flowgarden_intent:
        | "CREATE_PLANT_GROUP"
        | "CREATE_PLANT"
        | "UPDATE_PLANT_STATUS"
        | "LOG_OBSERVATION"
        | "LOG_WATERING"
        | "LOG_TRANSPLANT"
        | "LOG_PLANTING"
        | "LOG_GERMINATION"
        | "LOG_PEST_ALERT"
        | "LOG_DISEASE_ALERT"
        | "LOG_PHOTO_ANALYSIS"
        | "ATTACH_MEDIA_TO_PLANT"
        | "CREATE_TASK"
        | "COMPLETE_TASK"
        | "UPDATE_GARDEN_ZONE"
        | "MOVE_PLANT_LOCATION"
        | "GENERATE_DAILY_SUMMARY"
        | "RECOMMEND_NEXT_ACTION"
        | "ASK_CLARIFYING_QUESTION"
        | "SENSOR_DATA_RECEIVED"
        | "UNKNOWN_GARDEN_INPUT"
      flowgarden_plant_group_status:
        | "seed"
        | "germinating"
        | "seedling"
        | "transplanted"
        | "established"
        | "flowering"
        | "fruiting"
        | "harvested"
        | "dormant"
        | "dead"
      flowgarden_privacy_mode: "standard" | "privacy"
      flowgarden_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "dismissed"
        | "missed"
      flowgarden_urgency: "none" | "low" | "medium" | "high" | "urgent"
      global_role:
        | "user"
        | "organizer"
        | "artist"
        | "speaker"
        | "panelist"
        | "sponsor"
        | "moderator"
        | "admin"
        | "superadmin"
      mission_status:
        | "locked"
        | "available"
        | "in_progress"
        | "completed"
        | "claimed"
      points_tx_type:
        | "earn_referral_signup"
        | "earn_referral_ticket"
        | "earn_referral_product"
        | "earn_referral_checkin"
        | "earn_mission_complete"
        | "earn_checkin"
        | "earn_move"
        | "earn_admin_grant"
        | "spend_ticket"
        | "spend_upgrade"
        | "spend_product"
        | "spend_transfer"
        | "adjust_correction"
      private_data_type:
        | "email"
        | "phone"
        | "wallet_map"
        | "kyc_hash"
        | "location"
        | "biometric_hash"
      referral_event_type:
        | "signup"
        | "ticket_purchase"
        | "product_purchase"
        | "event_checkin"
      referral_status:
        | "pending"
        | "converted"
        | "rewarded"
        | "expired"
        | "flagged"
      role_scope: "global" | "product" | "event"
      wallet_provider:
        | "thirdweb"
        | "dfns"
        | "privy"
        | "metamask"
        | "phantom"
        | "near_wallet"
        | "polkadot_js"
        | "talisman"
        | "nightly"
        | "icp_internet_identity"
        | "ton_connect"
        | "external_siwe"
        | "external_siws"
        | "internal"
      zk_proof_type:
        | "membership"
        | "eligibility"
        | "uniqueness"
        | "action_complete"
        | "data_access"
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
      chain_id: [
        "base",
        "ethereum",
        "polygon",
        "arbitrum",
        "optimism",
        "bnb",
        "solana",
        "near",
        "stellar",
        "ton",
        "polkadot",
        "kusama",
        "bitcoin",
        "lightning",
        "icp",
        "cosmos",
      ],
      consent_scope: [
        "profile_public",
        "points_balance",
        "points_history",
        "missions",
        "roles",
        "wallet_evm",
        "wallet_solana",
        "wallet_full_map",
        "referral_stats",
        "email",
        "phone",
      ],
      crypto_curve: [
        "ecdsa_secp256k1",
        "eddsa_ed25519",
        "sr25519",
        "ecdsa_secp256r1",
        "schnorr",
        "icp_chain_key",
      ],
      flowgarden_event_type: [
        "photo_uploaded",
        "voice_note_uploaded",
        "text_observation",
        "planting",
        "germination",
        "transplant",
        "watering",
        "pest_observed",
        "disease_observed",
        "pruning",
        "fertilizing",
        "compost_added",
        "mulch_added",
        "harvest",
        "container_changed",
        "location_changed",
        "sensor_reading",
        "ai_recommendation",
        "task_completed",
        "question_asked",
        "system_summary",
      ],
      flowgarden_health_status: [
        "excellent",
        "good",
        "stressed",
        "critical",
        "unknown",
      ],
      flowgarden_intent: [
        "CREATE_PLANT_GROUP",
        "CREATE_PLANT",
        "UPDATE_PLANT_STATUS",
        "LOG_OBSERVATION",
        "LOG_WATERING",
        "LOG_TRANSPLANT",
        "LOG_PLANTING",
        "LOG_GERMINATION",
        "LOG_PEST_ALERT",
        "LOG_DISEASE_ALERT",
        "LOG_PHOTO_ANALYSIS",
        "ATTACH_MEDIA_TO_PLANT",
        "CREATE_TASK",
        "COMPLETE_TASK",
        "UPDATE_GARDEN_ZONE",
        "MOVE_PLANT_LOCATION",
        "GENERATE_DAILY_SUMMARY",
        "RECOMMEND_NEXT_ACTION",
        "ASK_CLARIFYING_QUESTION",
        "SENSOR_DATA_RECEIVED",
        "UNKNOWN_GARDEN_INPUT",
      ],
      flowgarden_plant_group_status: [
        "seed",
        "germinating",
        "seedling",
        "transplanted",
        "established",
        "flowering",
        "fruiting",
        "harvested",
        "dormant",
        "dead",
      ],
      flowgarden_privacy_mode: ["standard", "privacy"],
      flowgarden_task_status: [
        "pending",
        "in_progress",
        "completed",
        "dismissed",
        "missed",
      ],
      flowgarden_urgency: ["none", "low", "medium", "high", "urgent"],
      global_role: [
        "user",
        "organizer",
        "artist",
        "speaker",
        "panelist",
        "sponsor",
        "moderator",
        "admin",
        "superadmin",
      ],
      mission_status: [
        "locked",
        "available",
        "in_progress",
        "completed",
        "claimed",
      ],
      points_tx_type: [
        "earn_referral_signup",
        "earn_referral_ticket",
        "earn_referral_product",
        "earn_referral_checkin",
        "earn_mission_complete",
        "earn_checkin",
        "earn_move",
        "earn_admin_grant",
        "spend_ticket",
        "spend_upgrade",
        "spend_product",
        "spend_transfer",
        "adjust_correction",
      ],
      private_data_type: [
        "email",
        "phone",
        "wallet_map",
        "kyc_hash",
        "location",
        "biometric_hash",
      ],
      referral_event_type: [
        "signup",
        "ticket_purchase",
        "product_purchase",
        "event_checkin",
      ],
      referral_status: [
        "pending",
        "converted",
        "rewarded",
        "expired",
        "flagged",
      ],
      role_scope: ["global", "product", "event"],
      wallet_provider: [
        "thirdweb",
        "dfns",
        "privy",
        "metamask",
        "phantom",
        "near_wallet",
        "polkadot_js",
        "talisman",
        "nightly",
        "icp_internet_identity",
        "ton_connect",
        "external_siwe",
        "external_siws",
        "internal",
      ],
      zk_proof_type: [
        "membership",
        "eligibility",
        "uniqueness",
        "action_complete",
        "data_access",
      ],
    },
  },
} as const
