'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Filter, Users, MapPin, Trophy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatNumber, getWinRate } from '@/lib/utils'
import { Team } from '@/types/robotevents'

interface TeamsResponse {
  data: Team[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState({
    program: '',
    grade: '',
    region: '',
    country: ''
  })

  useEffect(() => {
    fetchTeams()
  }, [currentPage, searchQuery, filters])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filters.program && { program: filters.program }),
        ...(filters.grade && { grade: filters.grade }),
        ...(filters.region && { region: filters.region }),
        ...(filters.country && { country: filters.country })
      })

      const response = await fetch(`/api/teams?${params}`)
      const data: TeamsResponse = await response.json()
      
      setTeams(Array.isArray(data?.data) ? data.data : [])
      setTotalCount(data?.pagination?.total ?? 0)
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const TeamCard = ({ team }: { team: Team }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link 
                href={`/teams/${team.id}`}
                className="text-white hover:text-zinc-300 flex items-center gap-2"
              >
                {team.team}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{team.name}</p>
            <p className="text-sm text-muted-foreground">{team.organization}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white dark:bg-zinc-900 dark:text-zinc-300">
              {team.program.name}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {team.location.city}, {team.location.region}, {team.location.country}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Grade: {team.grade}
          </div>
          {team.registered && (
            <div className="flex items-center gap-2 text-sm text-white">
              <Trophy className="h-4 w-4" />
              Active Team
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Lookup</h1>
        <p className="text-muted-foreground">
          Search and explore VEX Robotics teams from around the world
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
                  placeholder="Search teams by number, name, or organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filters.program}
                onChange={(e) => setFilters({ ...filters, program: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">All Programs</option>
                <option value="VRC">VRC</option>
                <option value="VEXU">VEX U</option>
                <option value="VIQC">VIQC</option>
              </select>

              <select
                value={filters.grade}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">All Grades</option>
                <option value="Middle School">Middle School</option>
                <option value="High School">High School</option>
                <option value="College">College</option>
                <option value="Elementary">Elementary</option>
              </select>

              <Input
                placeholder="Region"
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
              />

              <Input
                placeholder="Country"
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount > 0 && (
            <>Showing {teams?.length ?? 0} of {formatNumber(totalCount)} teams</>
          )}
        </p>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-24 mb-2"></div>
                <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                <div className="h-4 bg-muted rounded w-40"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (teams?.length ?? 0) > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>

          {/* Pagination */}
          {totalCount > 20 && (
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
                  Page {currentPage} of {Math.ceil(totalCount / 20)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / 20), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / 20)}
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
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setFilters({ program: '', grade: '', region: '', country: '' })
                setCurrentPage(1)
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
