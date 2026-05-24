import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">CollabMatch</h1>
      <p className="text-gray-500 mb-8">Find your people. Build something real.</p>
      <div className="flex gap-4">
        <Link href="/signup" className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800">
          Sign up
        </Link>
        <Link href="/login" className="px-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
          Log in
        </Link>
      </div>
    </main>
  )
}