export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type T<TShape> = { Row: TShape; Insert: Partial<TShape>; Update: Partial<TShape> };

export interface Database {
  public: {
    Tables: {
      bottle_types: T<{ id: string; league_id: string; name: string; is_active: boolean; is_moneyball: boolean; created_at: string; updated_at: string }>;
      dice_set_faces: T<{ id: string; dice_set_id: string; die_value: number; bottle_type_id: string; created_at: string; updated_at: string }>;
      dice_sets: T<{ id: string; league_id: string; season_id: string | null; name: string; effective_from: string; effective_to: string | null; created_at: string; updated_at: string }>;
      league_memberships: T<{ id: string; league_id: string; user_id: string; role: "owner" | "admin" | "member"; is_active: boolean; created_at: string; updated_at: string }>;
      leagues: T<{ id: string; name: string; slug: string; created_at: string; updated_at: string }>;
      player_career_stats: T<{ id: string; league_id: string; player_id: string; official_score_total: number; official_shots_taken: number; official_pps: number; official_moneyballs_made: number; official_doubles_made: number; official_high_shot_streak: number; official_high_point_streak: number; official_xp_total: number; seasons_played: number; level: number; created_at: string; updated_at: string }>;
      player_xp_awards: T<{ id: string; league_id: string; season_id: string; season_player_id: string; award_type: string; placement: number | null; xp_awarded: number; created_by: string | null; created_at: string; updated_at: string }>;
      players: T<{ id: string; league_id: string; display_name: string; short_name: string | null; linked_user_id: string | null; is_active: boolean; last_known_team_id: string | null; last_known_tier_id: string | null; created_at: string; updated_at: string }>;
      profiles: T<{ user_id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string }>;
      season_awards: T<{ id: string; league_id: string; season_id: string; award_key: string; winner_season_player_id: string | null; winner_team_id: string | null; metric_value: number | null; context_json: Json; created_at: string; updated_at: string }>;
      season_player_allowance_events: T<{ id: string; league_id: string; season_player_id: string; delta_shots: number; reason: string; effective_at: string; created_by: string | null; created_at: string; updated_at: string }>;
      season_player_assignments: T<{ id: string; league_id: string; season_player_id: string; team_id: string | null; tier_id: string; effective_from: string; effective_to: string | null; reset_stats: boolean; created_at: string; updated_at: string }>;
      season_player_stats: T<{ id: string; league_id: string; season_id: string; season_player_id: string; score_total: number; shots_taken: number; pps: number; moneyballs_made: number; doubles_made: number; current_shot_streak: number; current_point_streak: number; high_shot_streak: number; high_point_streak: number; xp_from_shots: number; xp_bonus: number; xp_total: number; level: number; created_at: string; updated_at: string }>;
      season_players: T<{ id: string; league_id: string; season_id: string; player_id: string; team_id: string | null; tier_id: string; is_enabled: boolean; joined_at: string; shots_cap_initial: number; shots_remaining: number; stats_reset_at: string | null; created_at: string; updated_at: string }>;
      season_results: T<{ id: string; league_id: string; season_id: string; result_type: string; placement: number; team_id: string | null; season_player_id: string | null; score_total: number; shots_taken: number; pps: number; created_at: string; updated_at: string }>;
      season_team_stats: T<{ id: string; league_id: string; season_id: string; team_id: string; score_total: number; shots_taken: number; pps: number; placement: number | null; wins: number; losses: number; draws: number; xp_total: number; created_at: string; updated_at: string }>;
      season_teams: T<{ id: string; league_id: string; season_id: string; team_id: string; is_enabled: boolean; created_at: string; updated_at: string }>;
      season_tiers: T<{ id: string; league_id: string; season_id: string; tier_id: string; is_enabled: boolean; created_at: string; updated_at: string }>;
      seasons: T<{ id: string; league_id: string; name: string; status: "draft" | "active" | "closed" | "archived"; starts_on: string | null; ends_on: string | null; format: "team" | "ffa"; season_shot_cap: number; monthly_limit_enabled: boolean; monthly_shot_cap: number | null; weekly_ceiling_decrease_enabled: boolean; weekly_ceiling_decrease_by: number | null; monthly_ceiling_decrease_enabled: boolean; monthly_ceiling_decrease_by: number | null; rules_json: Json; created_at: string; updated_at: string }>;
      shot_events: T<{ id: string; league_id: string; season_id: string; season_player_id: string; shot_number: number; occurred_at: string; is_waiver: boolean; rolled_dice: number[] | null; selected_die: number; dice_set_id: string | null; bottle_type_id: string | null; team_id: string | null; tier_id: string; base_points: number; is_double: boolean; is_moneyball: boolean; points_awarded: number; xp_awarded: number; shot_streak: number | null; point_streak: number | null; is_voided: boolean; voided_at: string | null; voided_by: string | null; void_reason: string | null; created_at: string; updated_at: string }>;
      teams: T<{ id: string; league_id: string; name: string; is_active: boolean; is_free_agent: boolean; created_at: string; updated_at: string }>;
      tiers: T<{ id: string; league_id: string; name: string; sort_order: number; xp_multiplier: number; is_active: boolean; created_at: string; updated_at: string }>;
    };
    Functions: {
      get_season_overview: { Args: { p_season_id: number }; Returns: { teams_count: number; roster_count: number; shot_count: number; point_total: number }[] };
    };
  };
}
