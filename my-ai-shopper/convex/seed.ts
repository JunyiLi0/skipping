import { internalMutation } from "./_generated/server";
import { PRODUCTS } from "./mockData";

export const populate = internalMutation({
    args: {},
    handler: async (ctx) => {
        for (const product of PRODUCTS) {
            await ctx.db.insert("products", product);
        }
        return "Magasin rempli avec succès !";
    },
});
