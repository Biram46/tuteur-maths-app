"use client";

import { logout } from "../auth/actions";
import Link from "next/link";
import { useTransition } from "react";

export default function UserAuthButton({ user }: { user: any }) {
    const [isPending, startTransition] = useTransition();

    if (!user) {
        return (
            <Link href="/login" className="btn btn-outline">
                Connexion
            </Link>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {user.email}
            </span>
            <button
                onClick={() => startTransition(() => logout())}
                disabled={isPending}
                className="btn btn-outline text-sm"
            >
                {isPending ? "Déconnexion..." : "Déconnexion"}
            </button>
        </div>
    );
}
