'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, X, BarChart3, TrendingUp, Users, Target, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, getWinRate } from '@/lib/utils'
import { TeamStats } from '@/types/robotevents'

export default function ComparePage() {
  const searchParams = useSearchParams()
  const initialTeamIds = searchParams.get('teams')?.split(',').filter(Boolean) || []
  
  const [teamIds, setTeamIds] = useState<string[]>(initialTeamIds)
  const [teams, setTeams] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<TeamStats[]>([])

  useEffect(() => {
    if (initialTeamIds.length > 0) {
      fetchTeams(initialTeamIds)
    }
  }, [])

  const fetchTeams = async (ids: string[]) => {
    try {
      setLoading(true)
      const teamPromises = ids.map(id => 
        fetch(`/api/teams/${id}`).then(res => res.json())
      )
      const teamData = await Promise.all(teamPromises)
      setTeams(teamData.filter(Boolean))
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/teams?search=${encodeURIComponent(query)}&per_page=10`)
      const data = await response.json()
      setSearchResults(data.data || [])
    } catch (error) {
      console.error('Failed to search teams:', error)
    }
  }

  const addTeam = (team: TeamStats) => {
    if (!teamIds.includes(team.team.id.toString()) && teams.length < 4) {
      const newTeamIds = [...teamIds, team.team.id.toString()]
      setTeamIds(newTeamIds)
      setTeams([...teams, team])
      setSearchInput('')
      setSearchResults([])
    }
  }

  const removeTeam = (teamId: string) => {
    const newTeamIds = teamIds.filter(id => id !== teamId)
    const newTeams = teams.filter(team => team.team.id.toString() !== teamId)
    setTeamIds(newTeamIds)
    setTeams(newTeams)
  }

  const getSkillsComparison = () => {
    return teams.map(team => ({
      teamId: team.team.id,
      teamNumber: team.team.team,
      total: team.totalSkills || 0,
      driver: team.driverSkills || 0,
      programming: team.programmingSkills || 0
    }))
  }

  const getWinRateComparison = () => {
    return teams.map(team => ({
      teamId: team.team.id,
      teamNumber: team.team.team,
      winRate: getWinRate(team.record.wins, team.record.losses, team.record.ties)
    }))
  }

  const getAverageScoreComparison = () => {
    return teams.map(team => ({
      teamId: team.team.id,
      teamNumber: team.team.team,
      averageScore: team.averageScore
    }))
  }

  const getRecentEventsComparison = () => {
    return teams.map(team => ({
      teamId: team.team.id,
      teamNumber: team.team.team,
      events: team.recentEvents.slice(0, 3)
    }))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Comparison</h1>
        <p className="text-muted-foreground">
          Compare VEX Robotics teams side by side with detailed statistics
        </p>
      </div>

      {/* Team Selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Teams to Compare ({teams.length}/4)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search for teams to add..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  handleSearch(e.target.value)
                }}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-border rounded-md p-2 max-h-48 overflow-y-auto">
                {searchResults.map((team) => (
                  <div
                    key={team.team.id}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => addTeam(team)}
                  >
                    <div>
                      <p className="font-medium">{team.team.team}</p>
                      <p className="text-sm text-muted-foreground">{team.team.name}</p>
                    </div>
                    <Button size="sm" disabled={teams.length >= 4}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Teams */}
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.team.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Link 
                      href={`/teams/${team.team.id}`}
                      className="font-medium text-white hover:text-zinc-300"
                    >
                      {team.team.team}
                    </Link>
                    <span className="text-sm text-muted-foreground">{team.team.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeTeam(team.team.id.toString())}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {teams.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Search and add teams to start comparing
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {teams.length >= 2 && (
        <div className="space-y-8">
          {/* Skills Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-white" />
                Skills Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-32">Team</th>
                      <th className="text-center">Total Skills</th>
                      <th className="text-center">Driver Skills</th>
                      <th className="text-center">Programming Skills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSkillsComparison().map((team) => (
                      <tr key={team.teamId}>
                        <td className="font-medium">
                          <Link 
                            href={`/teams/${team.teamId}`}
                            className="text-white hover:text-zinc-300"
                          >
                            {team.teamNumber}
                          </Link>
                        </td>
                        <td className="text-center">
                          <span className="font-bold text-lg text-white">
                            {formatNumber(team.total)}
                          </span>
                        </td>
                        <td className="text-center">{formatNumber(team.driver)}</td>
                        <td className="text-center">{formatNumber(team.programming)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Win Rate Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-white" />
                Win Rate Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-32">Team</th>
                      <th className="text-center">Win Rate</th>
                      <th className="text-center">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getWinRateComparison().map((team) => {
                      const teamData = teams.find(t => t.team.id === team.teamId)
                      return (
                        <tr key={team.teamId}>
                          <td className="font-medium">
                            <Link 
                              href={`/teams/${team.teamId}`}
                              className="text-white hover:text-zinc-300"
                            >
                              {team.teamNumber}
                            </Link>
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-full bg-muted rounded-full h-2 max-w-24">
                                <div 
                                  className="bg-white h-2 rounded-full"
                                  style={{ width: `${team.winRate}%` }}
                                ></div>
                              </div>
                              <span className="font-bold text-lg min-w-12 text-right">
                                {team.winRate}%
                              </span>
                            </div>
                          </td>
                          <td className="text-center text-sm">
                            {teamData && `${teamData.record.wins}W-${teamData.record.losses}L-${teamData.record.ties}T`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Average Score Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-white" />
                Average Score Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-32">Team</th>
                      <th className="text-center">Average Score</th>
                      <th className="text-center">Highest Score</th>
                      <th className="text-center">Average Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAverageScoreComparison().map((team) => {
                      const teamData = teams.find(t => t.team.id === team.teamId)
                      return (
                        <tr key={team.teamId}>
                          <td className="font-medium">
                            <Link 
                              href={`/teams/${team.teamId}`}
                              className="text-white hover:text-zinc-300"
                            >
                              {team.teamNumber}
                            </Link>
                          </td>
                          <td className="text-center">
                            <span className="font-bold text-lg text-white">
                              {formatNumber(Math.round(team.averageScore))}
                            </span>
                          </td>
                          <td className="text-center">
                            {teamData && formatNumber(teamData.highestScore)}
                          </td>
                          <td className="text-center">
                            {teamData && (
                              <span className={teamData.averageMargin >= 0 ? 'text-white' : 'text-zinc-500'}>
                                {teamData.averageMargin > 0 ? '+' : ''}{formatNumber(Math.round(teamData.averageMargin))}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-white" />
                Recent Events Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getRecentEventsComparison().map((team) => (
                  <div key={team.teamId} className="border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-3">
                      <Link 
                        href={`/teams/${team.teamId}`}
                        className="text-white hover:text-zinc-300"
                      >
                        {team.teamNumber}
                      </Link>
                    </h4>
                    <div className="space-y-2">
                      {team.events.length > 0 ? (
                        team.events.map((event) => (
                          <div key={event.id} className="text-sm">
                            <Link 
                              href={`/events/${event.id}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {event.name}
                            </Link>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No recent events</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {teams.length < 2 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Add Teams to Compare</h3>
            <p className="text-muted-foreground mb-4">
              Search and add at least 2 teams (maximum 4) to see detailed comparisons
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Compare skills scores, win rates, and performance metrics</p>
              <p>• View recent events and head-to-head statistics</p>
              <p>• Analyze trends and patterns across teams</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
