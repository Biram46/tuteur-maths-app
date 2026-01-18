import { login, signup } from '@/app/auth/actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>
}) {
    const params = await searchParams;
    const error = params.error;
    const message = params.message;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <span className="text-4xl">📐</span>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Connexion Élève
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Ou{' '}
                    <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                        créez un compte gratuitement
                    </a>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Adresse email
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Mot de passe
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                                        <div className="text-sm text-red-700 mt-2">
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {message && (
                            <div className="rounded-md bg-green-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-green-800">Info</h3>
                                        <div className="text-sm text-green-700 mt-2">
                                            <p>{message}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                formAction={login}
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Se connecter
                            </button>

                            <button
                                formAction={signup}
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                S'inscrire
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    )
}
