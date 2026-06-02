'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

function getAvatarColor(id) {
  const colors = [
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-green-100',  text: 'text-green-700'  },
    { bg: 'bg-amber-100',  text: 'text-amber-700'  },
    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
    { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  ]
  return colors[id ? id.charCodeAt(0) % colors.length : 0]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const goalLabels = {
  hackathon:  '🏆 Hackathon',
  study:      '📚 Study partner',
  cofounder:  '🚀 Co-founder',
  opensource: '💻 Open source',
}

export default function Matches() {
  const router = useRouter()
  const [myProfile, setMyProfile] = useState(null)
  const [matches, setMatches]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)

  useEffect(() => { loadMatches() }, [])

  async function loadMatches() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: mine } = await supabase
      .from('profiles')
      .select()
      .eq('user_id', user.id)
      .single()

    if (!mine) return router.push('/onboarding')
    setMyProfile(mine)

    const { data: matchRows } = await supabase
      .from('matches')
      .select()
      .or(`user1_id.eq.${mine.id},user2_id.eq.${mine.id}`)

    if (!matchRows || matchRows.length === 0) {
      setLoading(false)
      return
    }

    const otherIds = matchRows.map(m =>
      m.user1_id === mine.id ? m.user2_id : m.user1_id
    )

    const { data: otherProfiles } = await supabase
      .from('profiles')
      .select()
      .in('id', otherIds)

    const combined = matchRows.map(m => {
      const otherId = m.user1_id === mine.id ? m.user2_id : m.user1_id
      const profile = otherProfiles?.find(p => p.id === otherId)
      return { matchId: m.id, matchedAt: m.created_at, profile }
    }).filter(m => m.profile)

    setMatches(combined)
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading your matches...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">CollabMatch</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/discover')} className="text-sm text-gray-600 hover:text-gray-900">Discover</button>
          <button onClick={() => router.push('/inbox')}    className="text-sm text-gray-600 hover:text-gray-900">Inbox</button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >Sign out</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your matches</h2>
          <p className="text-gray-500 text-sm mt-1">
            {matches.length === 0
              ? 'No matches yet'
              : `${matches.length} mutual match${matches.length > 1 ? 'es' : ''}`}
          </p>
        </div>

        {matches.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">No mutual matches yet</p>
            <button
              onClick={() => router.push('/discover')}
              className="text-sm bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800"
            >
              Go discover people
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {matches.map(({ matchId, matchedAt, profile }) => {
            const color = getAvatarColor(profile.id)
            const isOpen = selected?.matchId === matchId

            return (
              <div
                key={matchId}
                className={`bg-white rounded-2xl border transition-all ${isOpen ? 'border-gray-300' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setSelected(isOpen ? null : { matchId, profile })}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-semibold text-base flex-shrink-0`}>
                        {getInitials(profile.name)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                        <span className="text-xs text-gray-400">
                          {new Date(matchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{profile.year} · {profile.college}</p>
                      {profile.goal && (
                        <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {goalLabels[profile.goal] || profile.goal}
                        </span>
                      )}
                    </div>

                    <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-6 pb-6 border-t border-gray-50">
                    <div className="pt-4 flex flex-col gap-4">

                      {profile.bio && (
                        <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
                      )}

                      <div>
                        <p className="text-xs text-gray-400 mb-2">Their skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.skills?.map(s => (
                            <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 mb-2">They need</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.needs?.map(n => (
                            <span key={n} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">{n}</span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-3 font-medium">Reach out and start collaborating</p>
                        <a
                          href={`mailto:${profile.email || ''}`}
                          className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-4 py-2.5 hover:border-gray-400 transition-all w-fit"
                        >
                          <span>✉️</span> Send email
                        </a>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}