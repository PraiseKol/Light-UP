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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
        }
        Relationships: []
      }
      bonus_awards: {
        Row: {
          bonus_type: string
          created_at: string | null
          id: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          bonus_type: string
          created_at?: string | null
          id?: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          bonus_type?: string
          created_at?: string | null
          id?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bonus_awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bonus_awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: number
          is_admin: boolean | null
          message: string
          role: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_admin?: boolean | null
          message: string
          role?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          id?: never
          is_admin?: boolean | null
          message?: string
          role?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      daily_streaks: {
        Row: {
          created_at: string | null
          last_play_date: string
          streak_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          last_play_date: string
          streak_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          last_play_date?: string
          streak_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          provider: string
          reference: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          provider: string
          reference?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          provider?: string
          reference?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "donations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "donations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          player_name: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          player_name?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          player_name?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_users: {
        Row: {
          consecutive_perfects: number
          created_at: string | null
          effects_on: boolean | null
          full_name: string | null
          has_seen_explainer_video: boolean | null
          holy_shield_until: string | null
          in_game: boolean | null
          in_game_level: string | null
          in_game_started_at: string | null
          is_admin: boolean | null
          last_life_lost_at: string | null
          lives: number
          notify_challenge_closing: boolean | null
          notify_challenge_open: boolean | null
          notify_daily_streak: boolean | null
          notify_lives_full: boolean | null
          player_name: string | null
          powerups_inventory: Json | null
          role: string | null
          selected_avatar: string | null
          sound: string | null
          talents: number
          total_user_score: number | null
          updated_at: string | null
          user_id: string
          wallpaper: string | null
        }
        Insert: {
          consecutive_perfects?: number
          created_at?: string | null
          effects_on?: boolean | null
          full_name?: string | null
          has_seen_explainer_video?: boolean | null
          holy_shield_until?: string | null
          in_game?: boolean | null
          in_game_level?: string | null
          in_game_started_at?: string | null
          is_admin?: boolean | null
          last_life_lost_at?: string | null
          lives?: number
          notify_challenge_closing?: boolean | null
          notify_challenge_open?: boolean | null
          notify_daily_streak?: boolean | null
          notify_lives_full?: boolean | null
          player_name?: string | null
          powerups_inventory?: Json | null
          role?: string | null
          selected_avatar?: string | null
          sound?: string | null
          talents?: number
          total_user_score?: number | null
          updated_at?: string | null
          user_id: string
          wallpaper?: string | null
        }
        Update: {
          consecutive_perfects?: number
          created_at?: string | null
          effects_on?: boolean | null
          full_name?: string | null
          has_seen_explainer_video?: boolean | null
          holy_shield_until?: string | null
          in_game?: boolean | null
          in_game_level?: string | null
          in_game_started_at?: string | null
          is_admin?: boolean | null
          last_life_lost_at?: string | null
          lives?: number
          notify_challenge_closing?: boolean | null
          notify_challenge_open?: boolean | null
          notify_daily_streak?: boolean | null
          notify_lives_full?: boolean | null
          player_name?: string | null
          powerups_inventory?: Json | null
          role?: string | null
          selected_avatar?: string | null
          sound?: string | null
          talents?: number
          total_user_score?: number | null
          updated_at?: string | null
          user_id?: string
          wallpaper?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          max_uses: number
          used_count: number
        }
        Insert: {
          code: string
          max_uses?: number
          used_count?: number
        }
        Update: {
          code?: string
          max_uses?: number
          used_count?: number
        }
        Relationships: []
      }
      main_leaderboard_backups: {
        Row: {
          backed_up_at: string | null
          id: string
          player_name: string | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          backed_up_at?: string | null
          id?: string
          player_name?: string | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          backed_up_at?: string | null
          id?: string
          player_name?: string | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      main_leaderboard_bans: {
        Row: {
          banned_at: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "main_leaderboard_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "main_leaderboard_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "main_leaderboard_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      multiplayer_answers: {
        Row: {
          answered_at: string | null
          game_id: string | null
          id: string
          meta: Json | null
          player_id: string | null
          question_id: string | null
        }
        Insert: {
          answered_at?: string | null
          game_id?: string | null
          id?: string
          meta?: Json | null
          player_id?: string | null
          question_id?: string | null
        }
        Update: {
          answered_at?: string | null
          game_id?: string | null
          id?: string
          meta?: Json | null
          player_id?: string | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_answers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiplayer_answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_players"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_games: {
        Row: {
          allow_powerups: boolean
          created_at: string | null
          creator_id: string | null
          duration_seconds: number
          end_at: string | null
          id: string
          mode: string
          start_at: string | null
          status: string
          token: string
        }
        Insert: {
          allow_powerups?: boolean
          created_at?: string | null
          creator_id?: string | null
          duration_seconds: number
          end_at?: string | null
          id?: string
          mode: string
          start_at?: string | null
          status?: string
          token: string
        }
        Update: {
          allow_powerups?: boolean
          created_at?: string | null
          creator_id?: string | null
          duration_seconds?: number
          end_at?: string | null
          id?: string
          mode?: string
          start_at?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      multiplayer_players: {
        Row: {
          game_id: string | null
          id: string
          joined_at: string | null
          player_name: string | null
          score: number | null
          slot_number: number | null
          team_number: number | null
          user_id: string | null
        }
        Insert: {
          game_id?: string | null
          id?: string
          joined_at?: string | null
          player_name?: string | null
          score?: number | null
          slot_number?: number | null
          team_number?: number | null
          user_id?: string | null
        }
        Update: {
          game_id?: string | null
          id?: string
          joined_at?: string | null
          player_name?: string | null
          score?: number | null
          slot_number?: number | null
          team_number?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_games"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_quiz: {
        Row: {
          answer: string
          created_at: string | null
          game_id: string | null
          id: string
          mode: string
          options: Json | null
          question: string
          scripture_reference: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          mode: string
          options?: Json | null
          question: string
          scripture_reference?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          mode?: string
          options?: Json | null
          question?: string
          scripture_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_quiz_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_games"
            referencedColumns: ["id"]
          },
        ]
      }
      player_bans: {
        Row: {
          banned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          banned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "player_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "player_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      powerup_usage: {
        Row: {
          id: string | null
          powerup_key: string | null
          quantity: number | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string | null
          powerup_key?: string | null
          quantity?: number | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string | null
          powerup_key?: string | null
          quantity?: number | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      powerup_usage_FORMER_FOR_INCREMENT: {
        Row: {
          divine_hint: number | null
          grace_period: number | null
          heavenly_match: number | null
          holy_shield: number | null
          last_updated: string | null
          user_id: string
        }
        Insert: {
          divine_hint?: number | null
          grace_period?: number | null
          heavenly_match?: number | null
          holy_shield?: number | null
          last_updated?: string | null
          user_id: string
        }
        Update: {
          divine_hint?: number | null
          grace_period?: number | null
          heavenly_match?: number | null
          holy_shield?: number | null
          last_updated?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "powerup_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "powerup_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "powerup_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          level_id: string | null
          mode: string | null
          phase: number | null
          score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          level_id?: string | null
          mode?: string | null
          phase?: number | null
          score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          level_id?: string | null
          mode?: string | null
          phase?: number | null
          score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz: {
        Row: {
          answer: string | null
          created_at: string | null
          hint_letters: string | null
          id: string
          image_urls: string | null
          letters: string | null
          level_number: number | null
          mode: string | null
          options: Json | null
          phase_number: number
          question: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string | null
          hint_letters?: string | null
          id?: string
          image_urls?: string | null
          letters?: string | null
          level_number?: number | null
          mode?: string | null
          options?: Json | null
          phase_number?: number
          question?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string | null
          hint_letters?: string | null
          id?: string
          image_urls?: string | null
          letters?: string | null
          level_number?: number | null
          mode?: string | null
          options?: Json | null
          phase_number?: number
          question?: string | null
        }
        Relationships: []
      }
      scriptures: {
        Row: {
          created_at: string | null
          id: string
          reference: string | null
          text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reference?: string | null
          text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reference?: string | null
          text?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          provider: string | null
          reference: string | null
          session_id: string | null
          status: string | null
          talents: number | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          provider?: string | null
          reference?: string | null
          session_id?: string | null
          status?: string | null
          talents?: number | null
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          provider?: string | null
          reference?: string | null
          session_id?: string | null
          status?: string | null
          talents?: number | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      weekly_challenges: {
        Row: {
          attempted_at: string | null
          correct_answers: number | null
          id: string
          incorrect_answers: number | null
          questions_answered: number | null
          score: number
          user_id: string | null
          week_start_date: string
        }
        Insert: {
          attempted_at?: string | null
          correct_answers?: number | null
          id?: string
          incorrect_answers?: number | null
          questions_answered?: number | null
          score?: number
          user_id?: string | null
          week_start_date: string
        }
        Update: {
          attempted_at?: string | null
          correct_answers?: number | null
          id?: string
          incorrect_answers?: number | null
          questions_answered?: number | null
          score?: number
          user_id?: string | null
          week_start_date?: string
        }
        Relationships: []
      }
      weekly_leaderboard_backups: {
        Row: {
          backed_up_at: string | null
          id: string
          player_name: string | null
          score: number | null
          user_id: string
          week_start_date: string | null
        }
        Insert: {
          backed_up_at?: string | null
          id?: string
          player_name?: string | null
          score?: number | null
          user_id: string
          week_start_date?: string | null
        }
        Update: {
          backed_up_at?: string | null
          id?: string
          player_name?: string | null
          score?: number | null
          user_id?: string
          week_start_date?: string | null
        }
        Relationships: []
      }
      weekly_leaderboard_bans: {
        Row: {
          banned_at: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_leaderboard_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "game_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "weekly_leaderboard_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "main_game_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "weekly_leaderboard_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["user_id"]
          },
        ]
      }
      weekly_quiz: {
        Row: {
          answer: string | null
          created_at: string | null
          hint: string | null
          id: string
          mode: string
          options: Json[] | null
          question: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string | null
          hint?: string | null
          id?: string
          mode: string
          options?: Json[] | null
          question?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string | null
          hint?: string | null
          id?: string
          mode?: string
          options?: Json[] | null
          question?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      highest_phase_level: {
        Row: {
          highest_level: string | null
          highest_phase: string | null
        }
        Relationships: []
      }
      main_game_leaderboard: {
        Row: {
          player_name: string | null
          total_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          player_name: string | null
          rank: number | null
          total_user_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      weekly_leaderboard: {
        Row: {
          is_active: boolean | null
          player_name: string | null
          score: number | null
          user_id: string | null
          week_start_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_powerup_inventory: {
        Args: { p_amount: number; p_powerup: string; p_user_id: string }
        Returns: Json
      }
      adjust_talents: {
        Args: { p_amount: number; p_transaction_id: string; p_user_id: string }
        Returns: number
      }
      backup_weekly_leaderboard: { Args: never; Returns: undefined }
      calc_week_start_date: { Args: { ts: string }; Returns: string }
      decrement_powerup: {
        Args: { p_powerup_key: string; p_user_id: string }
        Returns: undefined
      }
      get_active_players_this_week: { Args: never; Returns: number }
      get_admin_analytics: { Args: never; Returns: Json }
      get_avg_score_per_mode_week: {
        Args: never
        Returns: {
          avg_score: number
          mode: string
        }[]
      }
      get_daily_active_players: {
        Args: never
        Returns: {
          active_players: number
          day: string
        }[]
      }
      get_mode_popularity: {
        Args: never
        Returns: {
          mode: string
          total_plays: number
        }[]
      }
      get_most_played_mode_week: {
        Args: never
        Returns: {
          mode: string
          play_count: number
        }[]
      }
      get_retention_rate: { Args: never; Returns: number }
      increment_all_lives: { Args: { extra_lives: number }; Returns: undefined }
      increment_all_talents: {
        Args: { extra_talents: number }
        Returns: undefined
      }
      increment_multiplayer_score: {
        Args: { p_game_id: string; p_points: number; p_user_id: string }
        Returns: undefined
      }
      populate_multiplayer_questions: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      set_week_start_date: { Args: never; Returns: string }
      use_invite_code: { Args: { code_input: string }; Returns: Json }
      use_powerup: {
        Args: { p_game_id: string; p_player_id: string; p_type: string }
        Returns: undefined
      }
      validate_invite_code: { Args: { code_input: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
