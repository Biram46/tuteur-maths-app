import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Tuteur Maths</h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-semibold transition"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition shadow-md"
            >
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
            Apprendre les mathématiques
            <br />
            <span className="text-indigo-600">n'a jamais été aussi simple</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Plateforme éducative interactive pour maîtriser les mathématiques du collège au lycée.
            Exercices personnalisés, suivi de progression et assistance en temps réel.
          </p>

          <div className="flex gap-6 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-lg transition shadow-lg hover:shadow-xl"
            >
              Commencer gratuitement
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-indigo-600 rounded-xl hover:bg-gray-50 font-bold text-lg transition shadow-lg border-2 border-indigo-600"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Étude personnalisée</h3>
            <p className="text-gray-600">
              Cours adaptés à votre niveau avec des exercices ciblés pour progresser à votre rythme.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Suivi de progression</h3>
            <p className="text-gray-600">
              Visualisez vos progrès et identifiez vos points forts et axes d'amélioration.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Assistant IA</h3>
            <p className="text-gray-600">
              Posez vos questions et obtenez des explications claires immédiatement.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
