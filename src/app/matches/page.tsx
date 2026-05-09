'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, Calendar, Users, Target, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatNumber } from '@/lib/utils'
import { Match } from '@/types/robotevents'

interface MatchesResponse {
  data: Match[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export default function MatchesPage() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const initialEvent = searchParams.get('event') || ''
  
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [eventFilter, setEventFilter] = useState(initialEvent)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchMatches()
  }, [currentPage, searchQuery, eventFilter])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '50',
        ...(searchQuery && { search: searchQuery }),
        ...(eventFilter && { event: eventFilter })
      })

      // Since we don't have a dedicated matches API, we'll fetch from events
      // In a real implementation, you'd have a matches endpoint
      const response = await fetch(`/api/events?${params}`)
      const data = await response.json()
      
      // Flatten matches from all events
      const allMatches = data.data.flatMap((event: any) => 
        event.matches?.map((match: Match) => ({
          ...match,
          event_name: event.name,
          event_id: event.id
        })) || []
      )
      
      setMatches(allMatches)
      setTotalCount(allMatches.length)
    } catch (error) {
      console.error('Failed to fetch matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const MatchRow = ({ match }: { match: Match & { event_name?: string; event_id?: number } }) => (
    <tr className="border-b border-border hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <Link 
          href={`/events/${match.event_id}`}
          className="text-white hover:text-zinc-300 font-medium"
        >
          {match.event_name || 'Unknown Event'}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm">{match.round || '-'}</td>
      <td className="px-4 py-3 text-sm">{match.match_num || '-'}</td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-zinc-500 font-medium">Red:</span> {match.alliance_red.teams.map(t => t.team.team).join(', ')}
          </div>
          <div className="text-sm">
            <span className="text-white font-medium">Blue:</span> {match.alliance_blue.teams.map(t => t.team.team).join(', ')}
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
      <td className="px-4 py-3 text-sm">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          match.score_red > match.score_blue ? 'bg-white/10 text-zinc-300' :
          match.score_red < match.score_blue ? 'bg-white/10 text-zinc-500' : 
          'bg-white/10 text-white'
        }`}>
          {match.score_red > match.score_blue ? 'Red Wins' :
           match.score_red < match.score_blue ? 'Blue Wins' : 'Tie'}
        </span>
      </td>
    </tr>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Match History</h1>
        <p className="text-muted-foreground">
          Browse recent VEX Robotics matches and results
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search matches by team number, event name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Event name or ID"
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount > 0 && (
            <>Showing {matches.length} of {formatNumber(totalCount)} matches</>
          )}
        </p>
      </div>

      {/* Matches Table */}
      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="animate-pulse">
              <div className="h-12 bg-muted mb-2"></div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted mb-1"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : matches.length > 0 ? (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-48">Event</th>
                      <th className="w-16">Round</th>
                      <th className="w-16">Match</th>
                      <th>Alliances</th>
                      <th className="w-24 text-center">Score</th>
                      <th className="w-32">Date</th>
                      <th className="w-24">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <MatchRow key={`${match.event_id}-${match.id}`} match={match} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalCount > 50 && (
            <div className="mt-8 flex justify-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 py-2 text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(totalCount / 50)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / 50), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / 50)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No matches found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                setEventFilter('')
                setCurrentPage(1)
              }}>
                Clear Filters
              </Button>
              <Button variant="outline" asChild>
                <Link href="/events">
                  Browse Events
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white" />
              Team Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Search for specific teams to see their match history.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/teams">
                Browse Teams
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-white" />
              Event Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Find events and tournaments to view their match results.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/events">
                Browse Events
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-white" />
              Skills Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              View global skills challenge rankings and scores.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/skills">
                View Rankings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
