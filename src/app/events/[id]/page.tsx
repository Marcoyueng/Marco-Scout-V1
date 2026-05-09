'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Trophy, 
  Target, 
  ArrowLeft,
  ExternalLink,
  Clock,
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Event, Match, Ranking, Skills, Award as AwardType } from '@/types/robotevents'

interface EventDetails {
  event: Event
  teams: any[]
  matches: Match[]
  rankings: Ranking[]
  skills: Skills[]
  awards: AwardType[]
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = parseInt(params.id as string)
  
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (eventId) {
      fetchEventDetails()
    }
  }, [eventId])

  const fetchEventDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}?include=teams,matches,rankings,skills,awards`)
      if (!response.ok) {
        throw new Error('Event not found')
      }
      const data: EventDetails = await response.json()
      setEventDetails(data)
    } catch (error) {
      console.error('Failed to fetch event details:', error)
      router.push('/events')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!eventDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Event Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The event you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/events')}>
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { event, teams, matches, rankings, skills, awards } = eventDetails

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'teams', label: 'Teams', count: teams.length },
    { id: 'matches', label: 'Matches', count: matches.length },
    { id: 'rankings', label: 'Rankings', count: rankings.length },
    { id: 'skills', label: 'Skills', count: skills.length },
    { id: 'awards', label: 'Awards', count: awards.length }
  ]

  const MatchRow = ({ match }: { match: Match }) => (
    <tr className="border-b border-border hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-sm">{match.round || '-'}</td>
      <td className="px-4 py-3 text-sm">{match.match_num || '-'}</td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-zinc-500 font-medium">Red:</span> {(match.alliance_red?.teams || []).map(t => t.team?.team).filter(Boolean).join(', ')}
          </div>
          <div className="text-sm">
            <span className="text-white font-medium">Blue:</span> {(match.alliance_blue?.teams || []).map(t => t.team?.team).filter(Boolean).join(', ')}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center font-bold">
        <span className="text-zinc-500">{match.score_red}</span> - 
        <span className="text-white"> {match.score_blue}</span>
      </td>
      <td className="px-4 py-3 text-sm">
        {match.completed ? formatDate(match.completed) : formatDate(match.scheduled)}
      </td>
    </tr>
  )

  const RankingRow = ({ ranking, index }: { ranking: Ranking; index: number }) => (
    <tr className="border-b border-border hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-sm font-medium">#{ranking.rank || index + 1}</td>
      <td className="px-4 py-3">
        <Link 
          href={`/teams/${ranking.team.id}`}
          className="text-white hover:text-zinc-300 font-medium"
        >
          {ranking.team.team}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm">{ranking.team.name}</td>
      <td className="px-4 py-3 text-sm text-center">{ranking.wins || 0}</td>
      <td className="px-4 py-3 text-sm text-center">{ranking.losses || 0}</td>
      <td className="px-4 py-3 text-sm text-center">{ranking.ties || 0}</td>
      <td className="px-4 py-3 text-sm text-center font-medium">
        {ranking.wp ? ranking.wp.toFixed(1) : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {ranking.ap ? ranking.ap.toFixed(1) : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {ranking.sp ? ranking.sp.toFixed(1) : '-'}
      </td>
    </tr>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
            <p className="text-muted-foreground mb-4">{event.sku}</p>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(event.start)} - {formatDate(event.end)}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location.venue}, {event.location.city}, {event.location.region}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {teams.length} teams
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a
                href={`https://www.robotevents.com/${event.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                RobotEvents
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Event Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Level</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{event.level}</div>
            <p className="text-xs text-muted-foreground">
              Competition level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Program</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{event.program.name}</div>
            <p className="text-xs text-muted-foreground">
              Competition program
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {event.ongoing ? (
                <span className="text-white">Live</span>
              ) : new Date(event.end) < new Date() ? (
                <span className="text-gray-600">Finished</span>
              ) : (
                <span className="text-white">Upcoming</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Event status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-white/30 text-white'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Event Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Location</h4>
                      <p className="text-muted-foreground">
                        {event.location.venue}<br />
                        {event.location.address_1}<br />
                        {event.location.city}, {event.location.region} {event.location.postal_code}<br />
                        {event.location.country}
                      </p>
                    </div>
                    {event.season && (
                      <div>
                        <h4 className="font-medium mb-2">Season</h4>
                        <p className="text-muted-foreground">{event.season.name}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Matches */}
              {matches.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Matches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {matches.slice(0, 5).map((match) => (
                        <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">
                              Round {match.round} - Match {match.match_num}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(match.completed || match.scheduled)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              <span className="text-zinc-500">{match.score_red}</span> - 
                              <span className="text-white"> {match.score_blue}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'teams' && (
            <Card>
              <CardHeader>
                <CardTitle>Registered Teams ({teams.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <Link 
                          href={`/teams/${team.id}`}
                          className="font-medium text-white hover:text-zinc-300"
                        >
                          {team.team}
                        </Link>
                        <p className="text-sm text-muted-foreground">{team.name}</p>
                        <p className="text-sm text-muted-foreground">{team.organization}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'matches' && (
            <Card>
              <CardHeader>
                <CardTitle>Match Results ({matches.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="w-16">Round</th>
                        <th className="w-16">Match</th>
                        <th>Alliances</th>
                        <th className="w-24 text-center">Score</th>
                        <th className="w-32">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((match) => (
                        <MatchRow key={match.id} match={match} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'rankings' && (
            <Card>
              <CardHeader>
                <CardTitle>Event Rankings ({rankings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="w-16">Rank</th>
                        <th>Team</th>
                        <th>Organization</th>
                        <th className="w-16 text-center">W</th>
                        <th className="w-16 text-center">L</th>
                        <th className="w-16 text-center">T</th>
                        <th className="w-16 text-center">WP</th>
                        <th className="w-16 text-center">AP</th>
                        <th className="w-16 text-center">SP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((ranking, index) => (
                        <RankingRow key={ranking.team.id} ranking={ranking} index={index} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'skills' && (
            <Card>
              <CardHeader>
                <CardTitle>Skills Results ({skills.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {['driver', 'programming', 'total'].map((type) => {
                    const typeSkills = skills.filter(s => s.type === type)
                    if (typeSkills.length === 0) return null
                    
                    return (
                      <div key={type}>
                        <h4 className="font-medium mb-3 capitalize">{type} Skills</h4>
                        <div className="space-y-2">
                          {typeSkills.slice(0, 10).map((skill) => (
                            <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div>
                                <Link 
                                  href={`/teams/${skill.team.id}`}
                                  className="font-medium text-white hover:text-zinc-300"
                                >
                                  {skill.team.team}
                                </Link>
                                <p className="text-sm text-muted-foreground">{skill.team.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{formatNumber(skill.score)}</p>
                                <p className="text-sm text-muted-foreground">
                                  Attempts: {skill.attempts}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'awards' && (
            <Card>
              <CardHeader>
                <CardTitle>Awards ({awards.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {awards.map((award) => (
                    <div key={award.id} className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-start gap-3">
                        <Award className="h-6 w-6 text-white mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{award.title}</h4>
                          <p className="text-muted-foreground mb-2">{award.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Team: {award.team?.team || 'N/A'}</span>
                            <span>{formatDate(award.event.start)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Teams</span>
                  <span className="font-medium">{teams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Matches</span>
                  <span className="font-medium">{matches.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skills Attempts</span>
                  <span className="font-medium">{skills.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Awards Given</span>
                  <span className="font-medium">{awards.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* External Links */}
          <Card>
            <CardHeader>
              <CardTitle>External Links</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full mb-2" asChild>
                <a
                  href={`https://www.robotevents.com/${event.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on RobotEvents
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
