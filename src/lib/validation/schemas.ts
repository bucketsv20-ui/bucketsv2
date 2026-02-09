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

export type LeagueInput = z.infer<typeof leagueSchema>;
export type ShotEventInput = z.infer<typeof shotEventSchema>;
