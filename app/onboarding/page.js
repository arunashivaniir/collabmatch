'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    year: '',
    college: '',
    bio: '',
    goal: ''
  })

  const [skillInput, setSkillInput] = useState('')
  const [needInput, setNeedInput] = useState('')
  const [skills, setSkills] = useState([])
  const [needs, setNeeds] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUser(data.user)
    })
  }, [])

  function addSkill(e) {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()])
      }
      setSkillInput('')
    }
  }

  function addNeed(e) {
    if (e.key === 'Enter' && needInput.trim()) {
      e.preventDefault()
      if (!needs.includes(needInput.trim())) {
        setNeeds([...needs, needInput.trim()])
      }
      setNeedInput('')
    }
  }

  function removeSkill(s) { setSkills(skills.filter(x => x !== s)) }
  function removeNeed(n) { setNeeds(needs.filter(x => x !== n)) }

async function handleSubmit(e) {
  e.preventDefault()
  if (skills.length === 0) return setError('Add at least one skill')
  if (needs.length === 0) return setError('Add at least one skill you need')
  if (!form.goal) return setError('Pick a goal')

  setLoading(true)
  setError('')

  // check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    setError('Profile already submitted. Taking you to discover...')
    setLoading(false)
    setTimeout(() => router.push('/discover'), 1500)
    return
  }

    const { error } = await supabase.from('profiles').insert({
      user_id: user.id,
      name: form.name,
      year: form.year,
      college: form.college,
      bio: form.bio,
      goal: form.goal,
      skills,
      needs
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/discover')
  }

  const goalOptions = [
    { value: 'hackathon', label: '🏆 Hackathon team' },
    { value: 'study', label: '📚 Study partner' },
    { value: 'cofounder', label: '🚀 Co-founder' },
    { value: 'opensource', label: '💻 Open source' },
  ]

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Build your profile</h2>
        <p className="text-gray-500 text-sm mb-8">This is what others see when they find you</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-medium text-gray-700">Basic info</h3>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">Year</label>
                <select
                  required
                  value={form.year}
                  onChange={e => setForm({ ...form, year: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white"
                >
                  <option value="">Select</option>
                  <option>1st year</option>
                  <option>2nd year</option>
                  <option>3rd year</option>
                  <option>4th year</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600 mb-1 block">College</label>
                <input
                  type="text"
                  required
                  value={form.college}
                  onChange={e => setForm({ ...form, college: e.target.value })}
                  placeholder="Your college"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Bio <span className="text-gray-400">(optional)</span></label>
              <textarea
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="What are you working on or interested in?"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Skills I have</h3>
              <p className="text-xs text-gray-400 mb-3">Type a skill and press Enter</p>
              <input
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
                placeholder="e.g. React, Python, Figma..."
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {skills.map(s => (
                    <span key={s} className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="ml-1 text-purple-400 hover:text-purple-700">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Skills I need</h3>
              <p className="text-xs text-gray-400 mb-3">What skills are you looking for in a teammate?</p>
              <input
                type="text"
                value={needInput}
                onChange={e => setNeedInput(e.target.value)}
                onKeyDown={addNeed}
                placeholder="e.g. UI/UX, Machine Learning..."
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              {needs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {needs.map(n => (
                    <span key={n} className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full">
                      {n}
                      <button type="button" onClick={() => removeNeed(n)} className="ml-1 text-green-400 hover:text-green-700">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Goal */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">What are you looking for?</h3>
            <div className="grid grid-cols-2 gap-3">
              {goalOptions.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setForm({ ...form, goal: g.value })}
                  className={`p-3 rounded-xl border text-sm text-left transition-all ${
                    form.goal === g.value
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Find my people →'}
          </button>

        </form>
      </div>
    </main>
  )
}