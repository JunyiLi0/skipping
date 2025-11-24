import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    products: defineTable({
        name: v.string(),
        price: v.number(),
        category: v.string(),
        inStock: v.boolean(),
        description: v.string(),
    })
        .searchIndex("search_name", {
            searchField: "name",
            filterFields: ["category"],
        }),
});
