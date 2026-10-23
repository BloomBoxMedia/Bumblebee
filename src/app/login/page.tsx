"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card mx-auto mt-16 max-w-sm space-y-4 p-6">
      <h1 className="text-lg font-semibold">Sign in</h1>
      <label className="block space-y-1 text-sm">
        <span>Password</span>
        <input name="password" type="password" required autoFocus className="input" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
