import { query } from "./_generated/server";
import { v } from "convex/values";

// Fonction simple pour voir tout le catalogue (Debug)
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("products").collect();
    },
});

// Fonction de recherche que l'IA utilisera
// Ex: search(ctx, { query: "Pâtes" })
export const search = query({
    args: { query: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("products")
            .withSearchIndex("search_name", (q) => q.search("name", args.query))
            .take(5); // On renvoie les 5 meilleurs résultats
    },
});
