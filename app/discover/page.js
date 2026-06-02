'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

// ─── Matching engine ───────────────────────────────────────────────────────────

const SKILL_ALIASES = {
  'ml': 'machine learning',
  'ai': 'machine learning',
  'artificial intelligence': 'machine learning',
  'deep learning': 'machine learning',
  'dl': 'machine learning',
  'nlp': 'machine learning',
  'computer vision': 'machine learning',
  'node': 'node.js',
  'nodejs': 'node.js',
  'node js': 'node.js',
  'express': 'node.js',
  'expressjs': 'node.js',
  'backend': 'backend development',
  'back end': 'backend development',
  'back-end': 'backend development',
  'frontend': 'frontend development',
  'front end': 'frontend development',
  'front-end': 'frontend development',
  'reactjs': 'react',
  'react.js': 'react',
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'ux': 'ui/ux',
  'ui': 'ui/ux',
  'ui/ux design': 'ui/ux',
  'figma': 'ui/ux',
  'postgres': 'postgresql',
  'mongo': 'mongodb',
  'devops': 'cloud/devops',
  'aws': 'cloud/devops',
  'docker': 'cloud/devops',
  'kubernetes': 'cloud/devops',
}

const SKILL_GROUPS = {
  backend: ['backend development', 'node.js', 'django', 'flask', 'spring', 'api development', 'rest api'],
  frontend: ['frontend development', 'react', 'vue', 'angular', 'html/css', 'next.js', 'svelte'],
  ml: ['machine learning', 'data science', 'pytorch', 'tensorflow', 'scikit-learn', 'data analysis', 'nlp'],
  mobile: ['android', 'ios', 'flutter', 'react native', 'swift', 'kotlin'],
  design: ['ui/ux', 'product design', 'graphic design', 'adobe xd', 'canva'],
  data: ['postgresql', 'mongodb', 'mysql', 'firebase', 'redis', 'sql'],
  cloud: ['cloud/devops', 'git', 'linux', 'ci/cd'],
}

const GOAL_COMPATIBILITY = {
  hackathon:  { hackathon: 1.0, opensource: 0.7, cofounder: 0.5, study: 0.2 },
  study:      { study: 1.0, hackathon: 0.3, opensource: 0.4, cofounder: 0.2 },
  cofounder:  { cofounder: 1.0, hackathon: 0.6, opensource: 0.5, study: 0.1 },
  opensource: { opensource: 1.0, hackathon: 0.7, cofounder: 0.5, study: 0.3 },
}

function normalize(skill) {
  const cleaned = skill.toLowerCase().trim().replace(/[-_]/g, ' ')
  return SKILL_ALIASES[cleaned] || cleaned
}

function buildSkillSet(skills) {
  if (!skills) return new Set()
  return new Set(skills.map(normalize))
}

function areRelated(a, b) {
  if (a === b) return true
  for (const group of Object.values(SKILL_GROUPS)) {
    if (group.includes(a) && group.includes(b)) return true
  }
  return false
}

function isCovered(skill, skillSet) {
  if (skillSet.has(skill)) return true
  for (const s of skillSet) {
    if (areRelated(skill, s)) return true
  }
  return false
}

function goalWeight(myGoal, theirGoal) {
  if (!myGoal || !theirGoal) return 0.7
  return GOAL_COMPATIBILITY[myGoal]?.[theirGoal] ?? 0.3
}

function matchScore(mySkills, myNeeds, theirSkills, theirNeeds, myGoal, theirGoal) {
  if (!mySkills || !myNeeds || !theirSkills || !theirNeeds) return 0
  const mySkillSet = buildSkillSet(mySkills)
  const theirSkillSet = buildSkillSet(theirSkills)
  const myNeedSet = buildSkillSet(myNeeds)
  const theirNeedSet = buildSkillSet(theirNeeds)

  let iCanHelp = 0
  for (const need of theirNeedSet) {
    if (isCovered(need, mySkillSet)) iCanHelp++
  }

  let theyCanHelp = 0
  for (const need of myNeedSet) {
    if (isCovered(need, theirSkillSet)) theyCanHelp++
  }

  const total = theirNeedSet.size + myNeedSet.size
  if (total === 0) return 0

  const skillScore = (iCanHelp + theyCanHelp) / total
  const gw = goalWeight(myGoal, theirGoal)
  return Math.round(skillScore * gw * 100)
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Discover() {
  const router = useRouter()
  const [myProfile, setMyProfile]     = useState(null)
  const [profiles, setProfiles]       = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [requestForm, setRequestForm] = useState({ i_need: '', why_you: '' })
  const [sending, setSending]         = useState(false)
  const [successMsg, setSuccessMsg]   = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: mine } = await supabase
      .from('profiles')
      .select()
      .eq('user_id', user.id)
      .single()

    if (!mine) return router.push('/onboarding')
    setMyProfile(mine)

    const { data: others } = await supabase
      .from('profiles')
      .select()
      .neq('user_id', user.id)

    // FIX: correct query to fetch sent requests
    const { data: sent } = await supabase
      .from('match_requests')
      .select('receiver_id')
      .eq('sender_id', mine.id)

    setSentRequests(sent ? sent.map(r => r.receiver_id) : [])

    const scored = (others || [])
      .map(p => ({
        ...p,
        score: matchScore(mine.skills, mine.needs, p.skills, p.needs, mine.goal, p.goal)
      }))
      .sort((a, b) => b.score - a.score)

    setProfiles(scored)
    setLoading(false)
  }

  function openRequest(profile) {
    setSelected(profile)
    setRequestForm({
      i_need: profile.skills?.join(', ') || '',
      why_you: ''
    })
    setSuccessMsg('')
  }

  async function sendRequest(e) {
    e.preventDefault()
    if (!requestForm.why_you.trim()) return
    setSending(true)

    const { error } = await supabase.from('match_requests').insert({
      sender_id:   myProfile.id,
      receiver_id: selected.id,
      i_am:        `${myProfile.year} · ${myProfile.college}`,
      i_can_do:    myProfile.skills?.join(', '),
      i_need:      requestForm.i_need,
      goal:        myProfile.goal,
      why_you:     requestForm.why_you,
    })

    if (!error) {
      setSentRequests(prev => [...prev, selected.id])
      setSuccessMsg('Request sent!')
      setSending(false)
      setTimeout(() => setSelected(null), 1500)
    } else {
      console.error('Send request error:', error)
      setSending(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Finding people for you...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">CollabMatch</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/inbox')}   className="text-sm text-gray-600 hover:text-gray-900">Inbox</button>
          <button onClick={() => router.push('/matches')} className="text-sm text-gray-600 hover:text-gray-900">Matches</button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >Sign out</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Find your people</h2>
          <p className="text-gray-500 text-sm mt-1">Sorted by how well your skills complement each other</p>
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No profiles yet. Share the link with your classmates!</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {profiles.map(profile => {
            const color = getAvatarColor(profile.id)
            const alreadySent = sentRequests.includes(profile.id)

            return (
              <div key={profile.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 transition-all">
                <div className="flex items-start gap-4">

                  {/* Anonymous avatar — no photo before match */}
                  <div className={`w-12 h-12 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-medium text-sm flex-shrink-0`}>
                    {getInitials(profile.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div>
                        <span className="font-medium text-gray-900 text-sm">{profile.year}</span>
                        <span className="text-gray-400 text-sm"> · {profile.college}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.score > 0 && (
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            {profile.score}% match
                          </span>
                        )}
                        {profile.goal && (
                          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                            {goalLabels[profile.goal] || profile.goal}
                          </span>
                        )}
                      </div>
                    </div>

                    {profile.bio && (
                      <p className="text-sm text-gray-500 mb-3 leading-relaxed">{profile.bio}</p>
                    )}

                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1.5">Has</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills?.map(s => (
                          <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-400 mb-1.5">Needs</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.needs?.map(n => (
                          <span key={n} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">{n}</span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => openRequest(profile)}
                      disabled={alreadySent}
                      className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${
                        alreadySent
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      {alreadySent ? 'Request sent' : 'Send match request'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Match request modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Send match request</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {successMsg ? (
              <div className="text-center py-6">
                <p className="text-green-600 font-medium">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={sendRequest} className="flex flex-col gap-4">
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 flex-shrink-0">I am</span>
                    <span className="text-gray-900">{myProfile.year} · {myProfile.college}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 flex-shrink-0">I can do</span>
                    <span className="text-gray-900">{myProfile.skills?.join(', ')}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 flex-shrink-0">I need</span>
                    <span className="text-gray-900">{requestForm.i_need}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 flex-shrink-0">Goal</span>
                    <span className="text-gray-900">{goalLabels[myProfile.goal] || myProfile.goal}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600 mb-1 block">
                    Why them? <span className="text-gray-400">(max 100 chars)</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={requestForm.why_you}
                    onChange={e => setRequestForm({ ...requestForm, why_you: e.target.value })}
                    placeholder="Be specific — what stood out?"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">{requestForm.why_you.length}/100</p>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}