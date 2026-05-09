'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Users, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatDate } from '@/lib/utils'
import { Team, Event } from '@/types/robotevents'

interface SearchResponse {
  data: (Team | Event)[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchType, setSearchType] = useState<'all' | 'teams' | 'events'>('all')

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
  }, [initialQuery])

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      setResults(null)
      return
    }

    try {
      setLoading(true)
      
      // Search both teams and events
      const [teamsResponse, eventsResponse] = await Promise.all([
        fetch(`/api/teams?search=${encodeURIComponent(searchQuery)}&per_page=5`),
        fetch(`/api/events?search=${encodeURIComponent(searchQuery)}&per_page=5`)
      ])
      
      const teamsData = await teamsResponse.json()
      const eventsData = await eventsResponse.json()
      
      const combinedResults = {
        data: [
          ...teamsData.data.map((item: Team) => ({ ...item, type: 'team' })),
          ...eventsData.data.map((item: Event) => ({ ...item, type: 'event' }))
        ],
        pagination: {
          page: 1,
          per_page: 10,
          total: teamsData.pagination.total + eventsData.pagination.total,
          total_pages: 1
        }
      }
      
      setResults(combinedResults)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  const filteredResults = results ? results.data.filter(item => {
    if (searchType === 'all') return true
    return searchType === 'teams' ? (item as any).type === 'team' : (item as any).type === 'event'
  }) : []

  const teamResults = filteredResults.filter(item => (item as any).type === 'team') as Team[]
  const eventResults = filteredResults.filter(item => (item as any).type === 'event') as Event[]

  const TeamResult = ({ team }: { team: Team }) => (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/10 dark:bg-zinc-900 rounded-full flex items-center justify-center">
          <Users className="h-5 w-5 text-white dark:text-white" />
        </div>
        <div>
          <h4 className="font-medium">{team.team}</h4>
          <p className="text-sm text-muted-foreground">{team.name}</p>
          <p className="text-sm text-muted-foreground">{team.organization}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/teams/${team.id}`}>
          View
        </Link>
      </Button>
    </div>
  )

  const EventResult = ({ event }: { event: Event }) => (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/10 dark:bg-zinc-900 rounded-full flex items-center justify-center">
          <Calendar className="h-5 w-5 text-white dark:text-white" />
        </div>
        <div>
          <h4 className="font-medium">{event.name}</h4>
          <p className="text-sm text-muted-foreground">{event.sku}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.start)} - {formatDate(event.end)}
          </p>
          <p className="text-sm text-muted-foreground">
            {event.location.city}, {event.location.region}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/events/${event.id}`}>
          View
        </Link>
      </Button>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground">
          Find VEX Robotics teams and events
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search teams, events, or locations..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Search Type Filter */}
            <div className="flex gap-2">
              <Button
                variant={searchType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('all')}
              >
                All
              </Button>
              <Button
                variant={searchType === 'teams' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('teams')}
              >
                Teams
              </Button>
              <Button
                variant={searchType === 'events' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('events')}
              >
                Events
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-8">
          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {formatNumber(results.pagination.total)} results
              {searchType !== 'all' && (
                <> ({searchType === 'teams' ? 'teams' : 'events'} only)</>
              )}
            </p>
            {query && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/teams?search=${encodeURIComponent(query)}`}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Advanced Team Search
                </Link>
              </Button>
            )}
          </div>

          {/* Team Results */}
          {teamResults.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-white" />
                Teams ({teamResults.length})
              </h2>
              <div className="space-y-3">
                {teamResults.map((team) => (
                  <TeamResult key={`team-${team.id}`} team={team} />
                ))}
              </div>
              {teamResults.length >= 5 && (
                <div className="text-center mt-4">
                  <Button variant="outline" asChild>
                    <Link href={`/teams?search=${encodeURIComponent(query)}`}>
                      View All Teams
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Event Results */}
          {eventResults.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-white" />
                Events ({eventResults.length})
              </h2>
              <div className="space-y-3">
                {eventResults.map((event) => (
                  <EventResult key={`event-${event.id}`} event={event} />
                ))}
              </div>
              {eventResults.length >= 5 && (
                <div className="text-center mt-4">
                  <Button variant="outline" asChild>
                    <Link href={`/events?search=${encodeURIComponent(query)}`}>
                      View All Events
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* No Results */}
          {filteredResults.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or browse teams and events directly
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" asChild>
                    <Link href="/teams">
                      Browse Teams
                    </Link>
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
        </div>
      )}

      {/* Initial State */}
      {!results && !initialQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-white" />
                Team Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Search for VEX Robotics teams by number, name, organization, or location.
              </p>
              <div className="space-y-2 text-sm">
                <p>• View detailed team statistics and performance history</p>
                <p>• Compare teams side by side</p>
                <p>• Track skills rankings and match records</p>
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
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
                Find VEX Robotics events, tournaments, and competitions near you.
              </p>
              <div className="space-y-2 text-sm">
                <p>• View event schedules and locations</p>
                <p>• Check team registrations and rankings</p>
                <p>• Follow competition results in real-time</p>
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/events">
                  Browse Events
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
