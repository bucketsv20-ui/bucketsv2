import { z } from "zod";

export const leagueSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const shotEventSchema = z.object({
  season_player_id: z.string().uuid(),
  season_id: z.string().uuid(),
  league_id: z.string().uuid(),
  tier_id: z.string().uuid(),
  selected_die: z.number().min(1).max(6),
  base_points: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8)]),
  is_double: z.boolean().default(false),
  is_moneyball: z.boolean().default(false),
});

const seasonRulesSchema = z.object({
  format: z.union([z.literal("team"), z.literal("ffa")]).default("team"),
  is_ranked: z.boolean().default(false),
  is_official: z.boolean().default(true),
  season_shot_cap: z.number().int().positive(),
  monthly_limit_enabled: z.boolean().default(false),
  monthly_shot_cap: z.number().int().positive().nullable().optional(),
  weekly_ceiling_decrease_enabled: z.boolean().default(false),
  weekly_ceiling_decrease_by: z.number().int().positive().nullable().optional(),
  monthly_ceiling_decrease_enabled: z.boolean().default(false),
  monthly_ceiling_decrease_by: z.number().int().positive().nullable().optional(),
  rules_json: z.record(z.string(), z.unknown()).default({}),
});

const newTeamSchema = z.object({ name: z.string().min(1), is_free_agent: z.boolean().default(false) });

const newTierSchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().int().default(0),
  xp_multiplier: z.number().positive().max(5),
});

const newPlayerSchema = z.object({
  display_name: z.string().min(1),
  short_name: z.string().nullable().optional(),
  team_name: z.string().nullable().optional(),
  tier_name: z.string().min(1),
  shots_cap_initial: z.number().int().positive().optional(),
});

export const seasonBootstrapSchema = z
  .object({
    league_id: z.string().uuid(),
    season_name: z.string().min(2),
    season_rules: seasonRulesSchema,
    teams: z.array(newTeamSchema).min(1),
    tiers: z.array(newTierSchema).min(1),
    players: z.array(newPlayerSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const teamNames = new Set(data.teams.map((team) => team.name.trim().toLowerCase()));
    const tierNames = new Set(data.tiers.map((tier) => tier.name.trim().toLowerCase()));

    data.players.forEach((player, index) => {
      if (player.team_name && !teamNames.has(player.team_name.trim().toLowerCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["players", index, "team_name"],
          message: `Unknown team: ${player.team_name}`,
        });
      }
      if (!tierNames.has(player.tier_name.trim().toLowerCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["players", index, "tier_name"],
          message: `Unknown tier: ${player.tier_name}`,
        });
      }
    });
  });

export type LeagueInput = z.infer<typeof leagueSchema>;
export type ShotEventInput = z.infer<typeof shotEventSchema>;
export type SeasonBootstrapInput = z.infer<typeof seasonBootstrapSchema>;
