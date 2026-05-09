import { NextRequest, NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';
import { cached } from '@/lib/cache';
import {
  groupMatchesByEvent,
  groupEventsBySeason,
  EventBlock,
  SeasonBlock,
} from '@/lib/match-sorter';
import { Match, Skills, Award, Event } from '@/types/robotevents';

// Pull every season-grouped event a team has participated in, with real
// rankings, skills, and matches attached to each event.

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const teamId = parseInt(params.id);
  if (Number.isNaN(teamId)) {
    return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 }
    );
  }

  try {
    const data = await cached(`team:full:v4:${teamId}`, 900, async () => {
      const team = await robotevents.getTeam(teamId);

      // Fetch ALL pages so prolific teams (with hundreds of matches across
      // their career) still get every event represented. The previous single-
      // page fetch caused recent events to show "0 matches" because older
      // matches drowned them out. Capped at maxPages * per_page = 5000 rows.
      async function pagedFetch<T>(
        fetchPage: (page: number) => Promise<{
          data: T[];
          pagination?: { total_pages?: number };
        }>,
        maxPages = 20
      ): Promise<T[]> {
        const out: T[] = [];
        for (let page = 1; page <= maxPages; page++) {
          const r = await fetchPage(page);
          const items = r?.data || [];
          out.push(...items);
          const totalPages = r?.pagination?.total_pages ?? 1;
          if (page >= totalPages || items.length === 0) break;
        }
        return out;
      }
      const [allMatches, allEvents, allSkills, allAwards] = await Promise.all([
        pagedFetch<Match>((page) =>
          robotevents.getTeamMatches(teamId, { page, per_page: 250 })
        ),
        pagedFetch<Event>((page) =>
          robotevents.getTeamEvents(teamId, { page, per_page: 250 })
        ),
        pagedFetch<Skills>((page) =>
          robotevents.getTeamSkills(teamId, { page, per_page: 250 })
        ),
        pagedFetch<Award>((page) =>
          robotevents.getTeamAwards(teamId, { page, per_page: 250 })
        ),
      ]);

      // Index events by id so we can attach metadata to grouped match blocks.
      const eventLookup = new Map<number, Partial<EventBlock['event']>>();
      for (const ev of allEvents) {
        eventLookup.set(ev.id, {
          id: ev.id,
          name: ev.name,
          code: ev.sku,
          start: ev.start,
          end: ev.end,
          location: ev.location,
          season: ev.season,
        });
      }

      // Backfill from match.event for any events not in the events list.
      for (const m of allMatches) {
        if (m.event?.id && !eventLookup.has(m.event.id)) {
          eventLookup.set(m.event.id, {
            id: m.event.id,
            name: m.event.name,
            code: m.event.code ?? null,
          });
        }
      }

      // 1) Group matches by event.
      const blocksMap = groupMatchesByEvent(allMatches, eventLookup);

      // Ensure every attended event still appears even if we have no match rows
      // (e.g. an upcoming event that the team is registered for).
      for (const ev of allEvents) {
        if (!blocksMap.has(ev.id)) {
          blocksMap.set(ev.id, {
            event: {
              id: ev.id,
              name: ev.name,
              code: ev.sku,
              start: ev.start,
              end: ev.end,
              location: ev.location,
              season: ev.season,
            },
            matches: [],
          });
        }
      }

      // 2) Attach per-event skills (best driver + best programming for this team).
      const skillsByEvent = new Map<number, { driver?: Skills; programming?: Skills }>();
      for (const s of allSkills) {
        const eid = s.event?.id;
        if (!eid) continue;
        const slot = skillsByEvent.get(eid) || {};
        if (s.type === 'driver' && (!slot.driver || s.score > slot.driver.score)) {
          slot.driver = s;
        } else if (s.type === 'programming' && (!slot.programming || s.score > slot.programming.score)) {
          slot.programming = s;
        }
        skillsByEvent.set(eid, slot);
      }
      skillsByEvent.forEach((slot, eid) => {
        const block = blocksMap.get(eid);
        if (!block) return;
        block.skills = {
          driver: slot.driver,
          programming: slot.programming,
          total: (slot.driver?.score || 0) + (slot.programming?.score || 0),
        };
      });

      // 3) Attach awards per event.
      const awardsByEvent = new Map<number, Award[]>();
      for (const a of allAwards) {
        const eid = a.event?.id;
        if (!eid) continue;
        if (!awardsByEvent.has(eid)) awardsByEvent.set(eid, []);
        awardsByEvent.get(eid)!.push(a);
      }
      awardsByEvent.forEach((awards, eid) => {
        const block = blocksMap.get(eid);
        if (block) block.awards = awards;
      });

      // 4) Attach rankings per event (one extra API call per event with matches;
      //    skipped for events where the team has no match rows yet).
      const eventsWithMatches: EventBlock[] = [];
      blocksMap.forEach((b) => {
        if (b.matches.length > 0) eventsWithMatches.push(b);
      });

      // Limit ranking lookups to the most recent 60 events to bound the workload.
      eventsWithMatches.sort((a, b) => {
        const ta = a.event.start ? new Date(a.event.start).getTime() : 0;
        const tb = b.event.start ? new Date(b.event.start).getTime() : 0;
        return tb - ta;
      });
      const rankingTargets = eventsWithMatches.slice(0, 60);

      await Promise.all(
        rankingTargets.map(async (block) => {
          // Match.division_id varies per event; pick a division actually used in
          // the matches we have for this team.
          const divId = block.matches.find((m) => m.division_id)?.division_id || 1;
          try {
            const r: any = await (robotevents as any).fetchWithRetry(
              `https://www.robotevents.com/api/v2/events/${block.event.id}/divisions/${divId}/rankings?per_page=250`
            );
            const found = (r?.data || []).find(
              (row: any) => row?.team?.id === teamId
            );
            if (found) {
              block.ranking = {
                team: found.team,
                rank: found.rank,
                wins: found.wins,
                losses: found.losses,
                ties: found.ties,
                wp: found.wp,
                ap: found.ap,
                sp: found.sp,
                average_points: found.average_points,
                highest_score: found.highest_score,
                total_points: found.total_points,
              } as any;
            }
          } catch {
            /* ignore individual ranking errors */
          }
        })
      );

      // 5) Group event blocks by season.
      const allBlocks: EventBlock[] = [];
      blocksMap.forEach((b) => allBlocks.push(b));
      const seasonBlocks: SeasonBlock[] = groupEventsBySeason(allBlocks);

      // 6) Top-level skills summary (best driver + best programming overall).
      let bestDriver: Skills | undefined;
      let bestProgramming: Skills | undefined;
      for (const s of allSkills) {
        if (s.type === 'driver' && (!bestDriver || s.score > bestDriver.score)) bestDriver = s;
        else if (s.type === 'programming' && (!bestProgramming || s.score > bestProgramming.score))
          bestProgramming = s;
      }

      return {
        team,
        seasonBlocks,
        summary: {
          totalEvents: allEvents.length,
          totalMatches: allMatches.length,
          totalAwards: allAwards.length,
          bestDriverSkills: bestDriver?.score ?? null,
          bestProgrammingSkills: bestProgramming?.score ?? null,
          bestTotalSkills:
            bestDriver || bestProgramming
              ? (bestDriver?.score || 0) + (bestProgramming?.score || 0)
              : null,
          bestSkillsEvent: bestDriver?.event || bestProgramming?.event || null,
        },
        awards: allAwards,
        skills: allSkills,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('API /teams/[id]/full Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch team data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
