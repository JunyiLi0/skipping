"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  const products = useQuery(api.products.getAll);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">AI Shopper - Phase 1 Verification</h1>
          <div>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-green-800 mb-2">✅ Next.js App Running</h2>
            <p className="text-green-700">The Next.js development server is running successfully.</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-green-800 mb-2">✅ Clerk Authentication</h2>
            <SignedOut>
              <p className="text-green-700">Clerk is configured. Click "Sign In" to test authentication.</p>
            </SignedOut>
            <SignedIn>
              <p className="text-green-700">You are signed in! Authentication is working.</p>
            </SignedIn>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-green-800 mb-2">✅ Convex Database</h2>
            <p className="text-green-700 mb-3">
              Products seeded: {products ? products.length : "Loading..."} items
            </p>
            {products && products.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <h3 className="font-semibold mb-2">Sample Products:</h3>
                <ul className="space-y-1 text-sm">
                  {products.slice(0, 5).map((product) => (
                    <li key={product._id} className="flex justify-between">
                      <span>{product.name}</span>
                      <span className="text-gray-600">€{product.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-2">...and {products.length - 5} more products</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
