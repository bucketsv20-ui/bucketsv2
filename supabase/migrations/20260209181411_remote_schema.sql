


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_season_overview"("p_season_id" bigint) RETURNS TABLE("teams_count" integer, "roster_count" integer, "shot_count" bigint, "point_total" bigint)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  select
    (select count(*) from season_teams st where st.season_id = p_season_id) as teams_count,
    (select count(*) from season_roster sr where sr.season_id = p_season_id and sr.is_active = true) as roster_count,
    (select count(*) from shot_events se where se.season_id = p_season_id and se.is_voided = false) as shot_count,
    coalesce((select sum(points) from shot_events se where se.season_id = p_season_id and se.is_voided = false), 0) as point_total;
$$;


ALTER FUNCTION "public"."get_season_overview"("p_season_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.role in ('admin','owner')
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_league_admin"("p_league_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.league_memberships lm
    where lm.league_id = p_league_id
      and lm.user_id = auth.uid()
      and lm.is_active = true
      and lm.role in ('owner','admin')
  );
$$;


ALTER FUNCTION "public"."is_league_admin"("p_league_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_league_member"("p_league_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.league_memberships lm
    where lm.league_id = p_league_id
      and lm.user_id = auth.uid()
      and lm.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_league_member"("p_league_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bottle_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_moneyball" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bottle_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dice_set_faces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dice_set_id" "uuid" NOT NULL,
    "die_value" smallint NOT NULL,
    "bottle_type_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dice_set_faces_die_value_check" CHECK ((("die_value" >= 1) AND ("die_value" <= 6)))
);


ALTER TABLE "public"."dice_set_faces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dice_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid",
    "name" "text" NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "effective_to" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dice_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "league_memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."league_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "leagues_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text"))
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_career_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "official_score_total" integer DEFAULT 0 NOT NULL,
    "official_shots_taken" integer DEFAULT 0 NOT NULL,
    "official_pps" numeric(12,4) DEFAULT 0 NOT NULL,
    "official_moneyballs_made" integer DEFAULT 0 NOT NULL,
    "official_doubles_made" integer DEFAULT 0 NOT NULL,
    "official_high_shot_streak" integer DEFAULT 0 NOT NULL,
    "official_high_point_streak" integer DEFAULT 0 NOT NULL,
    "official_xp_total" numeric(12,2) DEFAULT 0 NOT NULL,
    "seasons_played" integer DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_career_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_xp_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "season_player_id" "uuid" NOT NULL,
    "award_type" "text" NOT NULL,
    "placement" smallint,
    "xp_awarded" numeric(12,2) NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "player_xp_awards_award_type_check" CHECK (("award_type" = ANY (ARRAY['team_win_bonus'::"text", 'ffa_place_bonus'::"text", 'mvp_bonus'::"text", 'admin_adjustment'::"text"]))),
    CONSTRAINT "player_xp_awards_placement_check" CHECK (("placement" >= 1)),
    CONSTRAINT "player_xp_awards_xp_awarded_check" CHECK (("xp_awarded" >= (0)::numeric))
);


ALTER TABLE "public"."player_xp_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "short_name" "text",
    "linked_user_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_known_team_id" "uuid",
    "last_known_tier_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "award_key" "text" NOT NULL,
    "winner_season_player_id" "uuid",
    "winner_team_id" "uuid",
    "metric_value" numeric(12,4),
    "context_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "season_awards_award_key_check" CHECK (("award_key" = ANY (ARRAY['league_mvp'::"text", 'longest_shot_streak'::"text", 'longest_point_streak'::"text", 'most_moneyballs'::"text", 'most_doubles'::"text", 'best_crush'::"text", 'worst_crush'::"text"])))
);


ALTER TABLE "public"."season_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_player_allowance_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_player_id" "uuid" NOT NULL,
    "delta_shots" integer NOT NULL,
    "reason" "text" NOT NULL,
    "effective_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "season_player_allowance_events_reason_check" CHECK (("reason" = ANY (ARRAY['shot_taken'::"text", 'monthly_limit'::"text", 'weekly_ceiling_decrease'::"text", 'monthly_ceiling_decrease'::"text", 'admin_adjustment'::"text"])))
);


ALTER TABLE "public"."season_player_allowance_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_player_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_player_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "tier_id" "uuid" NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "effective_to" timestamp with time zone,
    "reset_stats" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."season_player_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_player_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "season_player_id" "uuid" NOT NULL,
    "score_total" integer DEFAULT 0 NOT NULL,
    "shots_taken" integer DEFAULT 0 NOT NULL,
    "pps" numeric(12,4) DEFAULT 0 NOT NULL,
    "moneyballs_made" integer DEFAULT 0 NOT NULL,
    "doubles_made" integer DEFAULT 0 NOT NULL,
    "current_shot_streak" integer DEFAULT 0 NOT NULL,
    "current_point_streak" integer DEFAULT 0 NOT NULL,
    "high_shot_streak" integer DEFAULT 0 NOT NULL,
    "high_point_streak" integer DEFAULT 0 NOT NULL,
    "xp_from_shots" numeric(12,2) DEFAULT 0 NOT NULL,
    "xp_bonus" numeric(12,2) DEFAULT 0 NOT NULL,
    "xp_total" numeric(12,2) DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."season_player_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "tier_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shots_cap_initial" integer NOT NULL,
    "shots_remaining" integer NOT NULL,
    "stats_reset_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "season_players_shots_cap_initial_check" CHECK (("shots_cap_initial" > 0)),
    CONSTRAINT "season_players_shots_remaining_check" CHECK (("shots_remaining" >= 0))
);


ALTER TABLE "public"."season_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "result_type" "text" NOT NULL,
    "placement" smallint NOT NULL,
    "team_id" "uuid",
    "season_player_id" "uuid",
    "score_total" integer DEFAULT 0 NOT NULL,
    "shots_taken" integer DEFAULT 0 NOT NULL,
    "pps" numeric(12,4) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "season_results_placement_check" CHECK (("placement" >= 1)),
    CONSTRAINT "season_results_result_type_check" CHECK (("result_type" = ANY (ARRAY['team'::"text", 'player'::"text"])))
);


ALTER TABLE "public"."season_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_team_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "score_total" integer DEFAULT 0 NOT NULL,
    "shots_taken" integer DEFAULT 0 NOT NULL,
    "pps" numeric(12,4) DEFAULT 0 NOT NULL,
    "team_xp_from_shots" numeric(12,2) DEFAULT 0 NOT NULL,
    "placement" smallint,
    "team_mvp_season_player_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "season_team_stats_placement_check" CHECK (("placement" >= 1))
);


ALTER TABLE "public"."season_team_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."season_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."season_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."season_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "format" "text" NOT NULL,
    "is_ranked" boolean DEFAULT false NOT NULL,
    "is_official" boolean DEFAULT true NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "season_shot_cap" integer NOT NULL,
    "monthly_limit_enabled" boolean DEFAULT false NOT NULL,
    "monthly_shot_cap" integer,
    "weekly_ceiling_decrease_enabled" boolean DEFAULT false NOT NULL,
    "weekly_ceiling_decrease_by" integer,
    "monthly_ceiling_decrease_enabled" boolean DEFAULT false NOT NULL,
    "monthly_ceiling_decrease_by" integer,
    "rules_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "seasons_check" CHECK (((NOT "monthly_limit_enabled") OR ("monthly_shot_cap" IS NOT NULL))),
    CONSTRAINT "seasons_check1" CHECK (((NOT "weekly_ceiling_decrease_enabled") OR ("weekly_ceiling_decrease_by" IS NOT NULL))),
    CONSTRAINT "seasons_check2" CHECK (((NOT "monthly_ceiling_decrease_enabled") OR ("monthly_ceiling_decrease_by" IS NOT NULL))),
    CONSTRAINT "seasons_format_check" CHECK (("format" = ANY (ARRAY['team'::"text", 'ffa'::"text"]))),
    CONSTRAINT "seasons_monthly_ceiling_decrease_by_check" CHECK (("monthly_ceiling_decrease_by" > 0)),
    CONSTRAINT "seasons_monthly_shot_cap_check" CHECK (("monthly_shot_cap" > 0)),
    CONSTRAINT "seasons_season_shot_cap_check" CHECK (("season_shot_cap" > 0)),
    CONSTRAINT "seasons_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text", 'archived'::"text"]))),
    CONSTRAINT "seasons_weekly_ceiling_decrease_by_check" CHECK (("weekly_ceiling_decrease_by" > 0))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shot_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "season_player_id" "uuid" NOT NULL,
    "shot_number" integer NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_waiver" boolean DEFAULT false NOT NULL,
    "rolled_dice" smallint[],
    "selected_die" smallint NOT NULL,
    "dice_set_id" "uuid",
    "bottle_type_id" "uuid",
    "team_id" "uuid",
    "tier_id" "uuid" NOT NULL,
    "base_points" smallint NOT NULL,
    "is_double" boolean DEFAULT false NOT NULL,
    "is_moneyball" boolean DEFAULT false NOT NULL,
    "points_awarded" smallint NOT NULL,
    "xp_awarded" numeric(12,2) DEFAULT 0 NOT NULL,
    "shot_streak" integer,
    "point_streak" integer,
    "is_voided" boolean DEFAULT false NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shot_events_base_points_check" CHECK (("base_points" = ANY (ARRAY[1, 2, 4, 8]))),
    CONSTRAINT "shot_events_check" CHECK (("points_awarded" = ("base_points" *
CASE
    WHEN "is_double" THEN 2
    ELSE 1
END))),
    CONSTRAINT "shot_events_check1" CHECK ((NOT ("is_waiver" AND ("base_points" = 1)))),
    CONSTRAINT "shot_events_point_streak_check" CHECK (("point_streak" >= 1)),
    CONSTRAINT "shot_events_points_awarded_check" CHECK (("points_awarded" = ANY (ARRAY[1, 2, 4, 8, 16]))),
    CONSTRAINT "shot_events_selected_die_check" CHECK ((("selected_die" >= 1) AND ("selected_die" <= 6))),
    CONSTRAINT "shot_events_shot_number_check" CHECK (("shot_number" > 0)),
    CONSTRAINT "shot_events_shot_streak_check" CHECK (("shot_streak" >= 1)),
    CONSTRAINT "shot_events_xp_awarded_check" CHECK (("xp_awarded" >= (0)::numeric))
);


ALTER TABLE "public"."shot_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_free_agent" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "xp_multiplier" numeric(6,2) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tiers_xp_multiplier_check" CHECK ((("xp_multiplier" > (0)::numeric) AND ("xp_multiplier" <= (5)::numeric)))
);


ALTER TABLE "public"."tiers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bottle_types"
    ADD CONSTRAINT "bottle_types_league_id_name_key" UNIQUE ("league_id", "name");



ALTER TABLE ONLY "public"."bottle_types"
    ADD CONSTRAINT "bottle_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dice_set_faces"
    ADD CONSTRAINT "dice_set_faces_dice_set_id_die_value_key" UNIQUE ("dice_set_id", "die_value");



ALTER TABLE ONLY "public"."dice_set_faces"
    ADD CONSTRAINT "dice_set_faces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dice_sets"
    ADD CONSTRAINT "dice_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_memberships"
    ADD CONSTRAINT "league_memberships_league_id_user_id_key" UNIQUE ("league_id", "user_id");



ALTER TABLE ONLY "public"."league_memberships"
    ADD CONSTRAINT "league_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."player_career_stats"
    ADD CONSTRAINT "player_career_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_career_stats"
    ADD CONSTRAINT "player_career_stats_player_id_key" UNIQUE ("player_id");



ALTER TABLE ONLY "public"."player_xp_awards"
    ADD CONSTRAINT "player_xp_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_xp_awards"
    ADD CONSTRAINT "player_xp_awards_season_id_season_player_id_award_type_plac_key" UNIQUE ("season_id", "season_player_id", "award_type", "placement");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_league_id_display_name_key" UNIQUE ("league_id", "display_name");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_season_id_award_key_key" UNIQUE ("season_id", "award_key");



ALTER TABLE ONLY "public"."season_player_allowance_events"
    ADD CONSTRAINT "season_player_allowance_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_player_assignments"
    ADD CONSTRAINT "season_player_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_player_stats"
    ADD CONSTRAINT "season_player_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_player_stats"
    ADD CONSTRAINT "season_player_stats_season_player_id_key" UNIQUE ("season_player_id");



ALTER TABLE ONLY "public"."season_players"
    ADD CONSTRAINT "season_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_players"
    ADD CONSTRAINT "season_players_season_id_player_id_key" UNIQUE ("season_id", "player_id");



ALTER TABLE ONLY "public"."season_results"
    ADD CONSTRAINT "season_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_results"
    ADD CONSTRAINT "season_results_season_id_result_type_placement_key" UNIQUE ("season_id", "result_type", "placement");



ALTER TABLE ONLY "public"."season_team_stats"
    ADD CONSTRAINT "season_team_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_team_stats"
    ADD CONSTRAINT "season_team_stats_season_id_team_id_key" UNIQUE ("season_id", "team_id");



ALTER TABLE ONLY "public"."season_teams"
    ADD CONSTRAINT "season_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_teams"
    ADD CONSTRAINT "season_teams_season_id_team_id_key" UNIQUE ("season_id", "team_id");



ALTER TABLE ONLY "public"."season_tiers"
    ADD CONSTRAINT "season_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."season_tiers"
    ADD CONSTRAINT "season_tiers_season_id_tier_id_key" UNIQUE ("season_id", "tier_id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_league_id_name_key" UNIQUE ("league_id", "name");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_season_player_id_shot_number_key" UNIQUE ("season_player_id", "shot_number");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_league_id_name_key" UNIQUE ("league_id", "name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_league_id_name_key" UNIQUE ("league_id", "name");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_allowance_events_player_time" ON "public"."season_player_allowance_events" USING "btree" ("season_player_id", "effective_at");



CREATE INDEX "idx_assignments_season_player_effective" ON "public"."season_player_assignments" USING "btree" ("season_player_id", "effective_from");



CREATE INDEX "idx_dice_set_faces_bottle" ON "public"."dice_set_faces" USING "btree" ("bottle_type_id");



CREATE INDEX "idx_dice_sets_league_effective" ON "public"."dice_sets" USING "btree" ("league_id", "effective_from");



CREATE INDEX "idx_dice_sets_season_effective" ON "public"."dice_sets" USING "btree" ("season_id", "effective_from");



CREATE INDEX "idx_league_memberships_user" ON "public"."league_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_player_career_stats_league_level" ON "public"."player_career_stats" USING "btree" ("league_id", "level");



CREATE INDEX "idx_player_xp_awards_season" ON "public"."player_xp_awards" USING "btree" ("season_id");



CREATE INDEX "idx_players_league_active" ON "public"."players" USING "btree" ("league_id", "is_active");



CREATE INDEX "idx_players_linked_user" ON "public"."players" USING "btree" ("linked_user_id");



CREATE INDEX "idx_season_awards_season" ON "public"."season_awards" USING "btree" ("season_id");



CREATE INDEX "idx_season_player_stats_season" ON "public"."season_player_stats" USING "btree" ("season_id");



CREATE INDEX "idx_season_players_season_enabled" ON "public"."season_players" USING "btree" ("season_id", "is_enabled");



CREATE INDEX "idx_season_players_team" ON "public"."season_players" USING "btree" ("season_id", "team_id");



CREATE INDEX "idx_season_results_season_type" ON "public"."season_results" USING "btree" ("season_id", "result_type");



CREATE INDEX "idx_season_team_stats_season_place" ON "public"."season_team_stats" USING "btree" ("season_id", "placement");



CREATE INDEX "idx_season_teams_season_enabled" ON "public"."season_teams" USING "btree" ("season_id", "is_enabled");



CREATE INDEX "idx_season_tiers_season_enabled" ON "public"."season_tiers" USING "btree" ("season_id", "is_enabled");



CREATE INDEX "idx_seasons_league_status" ON "public"."seasons" USING "btree" ("league_id", "status");



CREATE INDEX "idx_shot_events_player_time" ON "public"."shot_events" USING "btree" ("season_player_id", "occurred_at");



CREATE INDEX "idx_shot_events_season_time" ON "public"."shot_events" USING "btree" ("season_id", "occurred_at");



CREATE INDEX "idx_shot_events_season_voided" ON "public"."shot_events" USING "btree" ("season_id", "is_voided");



CREATE INDEX "idx_teams_league_active" ON "public"."teams" USING "btree" ("league_id", "is_active");



CREATE INDEX "idx_tiers_league_sort" ON "public"."tiers" USING "btree" ("league_id", "sort_order");



CREATE UNIQUE INDEX "uniq_seasons_one_active_per_league" ON "public"."seasons" USING "btree" ("league_id") WHERE ("status" = 'active'::"text");



CREATE UNIQUE INDEX "uniq_teams_one_free_agent_per_league" ON "public"."teams" USING "btree" ("league_id") WHERE ("is_free_agent" = true);



CREATE OR REPLACE TRIGGER "trg_bottle_types_updated_at" BEFORE UPDATE ON "public"."bottle_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_dice_set_faces_updated_at" BEFORE UPDATE ON "public"."dice_set_faces" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_dice_sets_updated_at" BEFORE UPDATE ON "public"."dice_sets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_league_memberships_updated_at" BEFORE UPDATE ON "public"."league_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_leagues_updated_at" BEFORE UPDATE ON "public"."leagues" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_player_career_stats_updated_at" BEFORE UPDATE ON "public"."player_career_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_player_xp_awards_updated_at" BEFORE UPDATE ON "public"."player_xp_awards" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_players_updated_at" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_awards_updated_at" BEFORE UPDATE ON "public"."season_awards" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_player_allowance_events_updated_at" BEFORE UPDATE ON "public"."season_player_allowance_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_player_assignments_updated_at" BEFORE UPDATE ON "public"."season_player_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_player_stats_updated_at" BEFORE UPDATE ON "public"."season_player_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_players_updated_at" BEFORE UPDATE ON "public"."season_players" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_results_updated_at" BEFORE UPDATE ON "public"."season_results" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_team_stats_updated_at" BEFORE UPDATE ON "public"."season_team_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_teams_updated_at" BEFORE UPDATE ON "public"."season_teams" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_season_tiers_updated_at" BEFORE UPDATE ON "public"."season_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_seasons_updated_at" BEFORE UPDATE ON "public"."seasons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_shot_events_updated_at" BEFORE UPDATE ON "public"."shot_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tiers_updated_at" BEFORE UPDATE ON "public"."tiers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."bottle_types"
    ADD CONSTRAINT "bottle_types_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dice_set_faces"
    ADD CONSTRAINT "dice_set_faces_bottle_type_id_fkey" FOREIGN KEY ("bottle_type_id") REFERENCES "public"."bottle_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dice_set_faces"
    ADD CONSTRAINT "dice_set_faces_dice_set_id_fkey" FOREIGN KEY ("dice_set_id") REFERENCES "public"."dice_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dice_sets"
    ADD CONSTRAINT "dice_sets_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dice_sets"
    ADD CONSTRAINT "dice_sets_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."league_memberships"
    ADD CONSTRAINT "league_memberships_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_memberships"
    ADD CONSTRAINT "league_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_career_stats"
    ADD CONSTRAINT "player_career_stats_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_career_stats"
    ADD CONSTRAINT "player_career_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_xp_awards"
    ADD CONSTRAINT "player_xp_awards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_xp_awards"
    ADD CONSTRAINT "player_xp_awards_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_xp_awards"
    ADD CONSTRAINT "player_xp_awards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_xp_awards"
    ADD CONSTRAINT "player_xp_awards_season_player_id_fkey" FOREIGN KEY ("season_player_id") REFERENCES "public"."season_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_last_known_team_id_fkey" FOREIGN KEY ("last_known_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_last_known_tier_id_fkey" FOREIGN KEY ("last_known_tier_id") REFERENCES "public"."tiers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_winner_season_player_id_fkey" FOREIGN KEY ("winner_season_player_id") REFERENCES "public"."season_players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_awards"
    ADD CONSTRAINT "season_awards_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_player_allowance_events"
    ADD CONSTRAINT "season_player_allowance_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_player_allowance_events"
    ADD CONSTRAINT "season_player_allowance_events_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_player_allowance_events"
    ADD CONSTRAINT "season_player_allowance_events_season_player_id_fkey" FOREIGN KEY ("season_player_id") REFERENCES "public"."season_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_player_assignments"
    ADD CONSTRAINT "season_player_assignments_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_player_assignments"
    ADD CONSTRAINT "season_player_assignments_season_player_id_fkey" FOREIGN KEY ("season_player_id") REFERENCES "public"."season_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_player_assignments"
    ADD CONSTRAINT "season_player_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_player_assignments"
    ADD CONSTRAINT "season_player_assignments_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."season_player_stats"
    ADD CONSTRAINT "season_player_stats_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_player_stats"
    ADD CONSTRAINT "season_player_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_player_stats"
    ADD CONSTRAINT "season_player_stats_season_player_id_fkey" FOREIGN KEY ("season_player_id") REFERENCES "public"."season_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_players"
    ADD CONSTRAINT "season_players_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_players"
    ADD CONSTRAINT "season_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."season_players"
    ADD CONSTRAINT "season_players_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_players"
    ADD CONSTRAINT "season_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_players"
    ADD CONSTRAINT "season_players_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."season_results"
    ADD CONSTRAINT "season_results_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_results"
    ADD CONSTRAINT "season_results_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_results"
    ADD CONSTRAINT "season_results_season_player_id_fkey" FOREIGN KEY ("season_player_id") REFERENCES "public"."season_players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_results"
    ADD CONSTRAINT "season_results_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_team_stats"
    ADD CONSTRAINT "season_team_stats_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_team_stats"
    ADD CONSTRAINT "season_team_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_team_stats"
    ADD CONSTRAINT "season_team_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."season_team_stats"
    ADD CONSTRAINT "season_team_stats_team_mvp_season_player_id_fkey" FOREIGN KEY ("team_mvp_season_player_id") REFERENCES "public"."season_players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."season_teams"
    ADD CONSTRAINT "season_teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_teams"
    ADD CONSTRAINT "season_teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_teams"
    ADD CONSTRAINT "season_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."season_tiers"
    ADD CONSTRAINT "season_tiers_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_tiers"
    ADD CONSTRAINT "season_tiers_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."season_tiers"
    ADD CONSTRAINT "season_tiers_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_bottle_type_id_fkey" FOREIGN KEY ("bottle_type_id") REFERENCES "public"."bottle_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_dice_set_id_fkey" FOREIGN KEY ("dice_set_id") REFERENCES "public"."dice_sets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_season_player_id_fkey" FOREIGN KEY ("season_player_id") REFERENCES "public"."season_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shot_events"
    ADD CONSTRAINT "shot_events_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE "public"."bottle_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bottle_types_select_member" ON "public"."bottle_types" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "bottle_types_write_admin" ON "public"."bottle_types" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."dice_set_faces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dice_set_faces_select_member" ON "public"."dice_set_faces" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."dice_sets" "ds"
  WHERE (("ds"."id" = "dice_set_faces"."dice_set_id") AND "public"."is_league_member"("ds"."league_id")))));



CREATE POLICY "dice_set_faces_write_admin" ON "public"."dice_set_faces" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."dice_sets" "ds"
  WHERE (("ds"."id" = "dice_set_faces"."dice_set_id") AND "public"."is_league_admin"("ds"."league_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."dice_sets" "ds"
  WHERE (("ds"."id" = "dice_set_faces"."dice_set_id") AND "public"."is_league_admin"("ds"."league_id")))));



ALTER TABLE "public"."dice_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dice_sets_select_member" ON "public"."dice_sets" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "dice_sets_write_admin" ON "public"."dice_sets" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."league_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "league_memberships_select_member" ON "public"."league_memberships" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "league_memberships_write_admin" ON "public"."league_memberships" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leagues_select_member" ON "public"."leagues" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("id"));



ALTER TABLE "public"."player_career_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "player_career_stats_select_member" ON "public"."player_career_stats" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "player_career_stats_write_admin" ON "public"."player_career_stats" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."player_xp_awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "player_xp_awards_select_member" ON "public"."player_xp_awards" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "player_xp_awards_write_admin" ON "public"."player_xp_awards" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "players_select_member" ON "public"."players" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "players_write_admin" ON "public"."players" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_authenticated" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."season_awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_awards_select_member" ON "public"."season_awards" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_awards_write_admin" ON "public"."season_awards" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."season_player_allowance_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_player_allowance_events_select_member" ON "public"."season_player_allowance_events" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_player_allowance_events_write_admin" ON "public"."season_player_allowance_events" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."season_player_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_player_assignments_select_member" ON "public"."season_player_assignments" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_player_assignments_write_admin" ON "public"."season_player_assignments" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."season_player_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_player_stats_select_member" ON "public"."season_player_stats" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_player_stats_write_admin" ON "public"."season_player_stats" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."season_players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_players_select_member" ON "public"."season_players" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_players_write_admin" ON "public"."season_players" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."season_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_results_select_member" ON "public"."season_results" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_results_write_admin" ON "public"."season_results" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."season_team_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_team_stats_select_member" ON "public"."season_team_stats" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_team_stats_write_admin" ON "public"."season_team_stats" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."season_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_teams_select_member" ON "public"."season_teams" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_teams_write_admin" ON "public"."season_teams" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."season_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "season_tiers_select_member" ON "public"."season_tiers" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "season_tiers_write_admin" ON "public"."season_tiers" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons_select_member" ON "public"."seasons" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "seasons_write_admin" ON "public"."seasons" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."shot_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shot_events_delete_admin" ON "public"."shot_events" FOR DELETE TO "authenticated" USING ("public"."is_league_admin"("league_id"));



CREATE POLICY "shot_events_insert_member" ON "public"."shot_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_league_member"("league_id"));



CREATE POLICY "shot_events_select_member" ON "public"."shot_events" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "shot_events_update_admin" ON "public"."shot_events" FOR UPDATE TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_select_member" ON "public"."teams" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "teams_write_admin" ON "public"."teams" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));



ALTER TABLE "public"."tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tiers_select_member" ON "public"."tiers" FOR SELECT TO "authenticated" USING ("public"."is_league_member"("league_id"));



CREATE POLICY "tiers_write_admin" ON "public"."tiers" TO "authenticated" USING ("public"."is_league_admin"("league_id")) WITH CHECK ("public"."is_league_admin"("league_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."player_xp_awards";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."season_player_allowance_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."season_player_stats";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."season_players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."season_results";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."season_team_stats";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."seasons";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."shot_events";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_season_overview"("p_season_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_season_overview"("p_season_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_season_overview"("p_season_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_league_admin"("p_league_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_league_admin"("p_league_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_league_admin"("p_league_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_league_member"("p_league_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_league_member"("p_league_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_league_member"("p_league_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."bottle_types" TO "anon";
GRANT ALL ON TABLE "public"."bottle_types" TO "authenticated";
GRANT ALL ON TABLE "public"."bottle_types" TO "service_role";



GRANT ALL ON TABLE "public"."dice_set_faces" TO "anon";
GRANT ALL ON TABLE "public"."dice_set_faces" TO "authenticated";
GRANT ALL ON TABLE "public"."dice_set_faces" TO "service_role";



GRANT ALL ON TABLE "public"."dice_sets" TO "anon";
GRANT ALL ON TABLE "public"."dice_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."dice_sets" TO "service_role";



GRANT ALL ON TABLE "public"."league_memberships" TO "anon";
GRANT ALL ON TABLE "public"."league_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."league_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON TABLE "public"."player_career_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_career_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_career_stats" TO "service_role";



GRANT ALL ON TABLE "public"."player_xp_awards" TO "anon";
GRANT ALL ON TABLE "public"."player_xp_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."player_xp_awards" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."season_awards" TO "anon";
GRANT ALL ON TABLE "public"."season_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."season_awards" TO "service_role";



GRANT ALL ON TABLE "public"."season_player_allowance_events" TO "anon";
GRANT ALL ON TABLE "public"."season_player_allowance_events" TO "authenticated";
GRANT ALL ON TABLE "public"."season_player_allowance_events" TO "service_role";



GRANT ALL ON TABLE "public"."season_player_assignments" TO "anon";
GRANT ALL ON TABLE "public"."season_player_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."season_player_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."season_player_stats" TO "anon";
GRANT ALL ON TABLE "public"."season_player_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."season_player_stats" TO "service_role";



GRANT ALL ON TABLE "public"."season_players" TO "anon";
GRANT ALL ON TABLE "public"."season_players" TO "authenticated";
GRANT ALL ON TABLE "public"."season_players" TO "service_role";



GRANT ALL ON TABLE "public"."season_results" TO "anon";
GRANT ALL ON TABLE "public"."season_results" TO "authenticated";
GRANT ALL ON TABLE "public"."season_results" TO "service_role";



GRANT ALL ON TABLE "public"."season_team_stats" TO "anon";
GRANT ALL ON TABLE "public"."season_team_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."season_team_stats" TO "service_role";



GRANT ALL ON TABLE "public"."season_teams" TO "anon";
GRANT ALL ON TABLE "public"."season_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."season_teams" TO "service_role";



GRANT ALL ON TABLE "public"."season_tiers" TO "anon";
GRANT ALL ON TABLE "public"."season_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."season_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."shot_events" TO "anon";
GRANT ALL ON TABLE "public"."shot_events" TO "authenticated";
GRANT ALL ON TABLE "public"."shot_events" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tiers" TO "anon";
GRANT ALL ON TABLE "public"."tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."tiers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


