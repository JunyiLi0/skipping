C\'est parti. Voici le plan d\'action technique et opérationnel pour la
**Phase 1 : Initialisation & Mock Store**.

L\'objectif de cette phase est d\'avoir une coquille vide fonctionnelle
: une app sécurisée où l\'on peut se connecter et une base de données
remplie de produits alimentaires fictifs prêts à être interrogés.

### **Étape 1 : Initialisation du Projet & Installation**

On met en place le socle technique : Next.js 15, Tailwind, Shadcn et les
connecteurs pour la DB et l\'Auth.

**Créer le projet Next.js :\
**Bash\
npx create-next-app@latest my-ai-shopper

\# Options : TypeScript: Yes, Tailwind: Yes, ESLint: Yes, App Router:
Yes

1.  

**Installer les dépendances clés :\
**Bash\
cd my-ai-shopper

npm install convex \@clerk/nextjs clerk-convex-provider

2.  

**Initialiser Shadcn UI (pour le design rapide) :\
**Bash\
npx shadcn@latest init

\# Style: New York, Base color: Slate, CSS Variables: Yes

npx shadcn@latest add button input card toast

3.  

**Lancer Convex (Le Backend) :\
**Bash\
npx convex dev

\# Cela va te demander de te connecter à Convex et créer un projet.

4.  

### **Étape 2 : Configuration de l\'Authentification (Clerk + Convex)**

On sécurise l\'accès. Convex doit savoir qui est l\'utilisateur connecté
via Clerk.

1.  **Setup Clerk :**

    -   Va sur [[clerk.com]{.underline}](https://clerk.com), crée un
        > projet.

    -   Copie les clés NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY et
        > CLERK_SECRET_KEY dans ton fichier .env.local.

2.  **Lier Clerk à Convex :**

    -   Dans le dashboard Clerk \> **JWT Templates**, crée un template
        > nommé convex.

    -   Copie l\'URL de l\'Issuer.

    -   Crée un fichier convex/auth.config.ts :

TypeScript\
export default {

providers: \[

{

domain: \"https://ton-url-clerk.clerk.accounts.dev\", // L\'URL Issuer
copiée

applicationID: \"convex\",

},

\],

};

3.  

4.  **Provider Frontend :**

    -   Configure le ConvexClientProvider dans ton layout racine
        > (app/layout.tsx) pour envelopper ton app avec
        > l\'authentification.

### **Étape 3 : Création du Schéma de Données**

On définit la structure de la base de données pour nos produits.

1.  Ouvre convex/schema.ts.

2.  Définis la table products avec un index de recherche (crucial pour
    > que l\'IA trouve les produits).

TypeScript

import { defineSchema, defineTable } from \"convex/server\";

import { v } from \"convex/values\";

export default defineSchema({

products: defineTable({

name: v.string(),

price: v.number(),

category: v.string(),

inStock: v.boolean(),

description: v.string(),

})

.searchIndex(\"search_name\", {

searchField: \"name\",

filterFields: \[\"category\"\], // Pour filtrer par rayon si besoin

}),

// \... (On ajoutera users et carts plus tard)

});

### **Étape 4 : Le Script de Seeding (Remplir le magasin)**

C\'est ici qu\'on crée le \"faux Intermarché\".

1.  **Créer les données brutes :** Crée un fichier convex/mockData.ts
    > avec une liste de produits réalistes.

TypeScript

// convex/mockData.ts

export const PRODUCTS = \[

{ name: \"Spaghetti Barilla 500g\", price: 1.15, category: \"Pâtes\",
inStock: true, description: \"Pâtes au blé dur\" },

{ name: \"Riz Basmati Taureau Ailé 1kg\", price: 3.50, category:
\"Riz\", inStock: true, description: \"Riz parfumé\" },

{ name: \"Sauce Tomate Panzani 400g\", price: 1.80, category:
\"Sauces\", inStock: true, description: \"Sauce provençale\" },

{ name: \"Oeufs Bio x6\", price: 2.90, category: \"Frais\", inStock:
true, description: \"Oeufs plein air\" },

{ name: \"Lait Demi-écrémé 1L\", price: 1.05, category: \"Frais\",
inStock: true, description: \"Lait origine France\" },

{ name: \"Steak Haché 5% x2\", price: 4.50, category: \"Viande\",
inStock: true, description: \"Boeuf charolais\" },

// Ajoute une vingtaine d\'autres pour que l\'IA ait du choix\...

\];

2.  **Créer la mutation d\'insertion :** Crée un fichier convex/seed.ts.

TypeScript

import { internalMutation } from \"./\_generated/server\";

import { PRODUCTS } from \"./mockData\";

export const populate = internalMutation({

args: {},

handler: async (ctx) =\> {

for (const product of PRODUCTS) {

await ctx.db.insert(\"products\", product);

}

return \"Magasin rempli avec succès !\";

},

});

3.  **Exécuter le seed :**

    -   Va dans ton dashboard Convex (interface web).

    -   Cherche la fonction seed:populate.

    -   Clique sur \"Run Function\".

    -   *Résultat :* Ta table products contient maintenant tes articles.

### **Étape 5 : Création de l\'API \"Mockée\"**

On crée les fonctions que l\'IA utilisera plus tard pour interroger ce
magasin.

1.  Crée un fichier convex/products.ts.

TypeScript

import { query } from \"./\_generated/server\";

import { v } from \"convex/values\";

// Fonction simple pour voir tout le catalogue (Debug)

export const getAll = query({

args: {},

handler: async (ctx) =\> {

return await ctx.db.query(\"products\").collect();

},

});

// Fonction de recherche que l\'IA utilisera

// Ex: search(ctx, { query: \"Pâtes\" })

export const search = query({

args: { query: v.string() },

handler: async (ctx, args) =\> {

return await ctx.db

.query(\"products\")

.withSearchIndex(\"search_name\", (q) =\> q.search(\"name\",
args.query))

.take(5); // On renvoie les 5 meilleurs résultats

},

});

### **✅ Checkpoint de fin de Phase 1**

À la fin de cette étape, tu dois pouvoir vérifier ceci :

1.  Lancer npm run dev et voir la page d\'accueil Next.js.

2.  Avoir un bouton \"Sign In\" (Clerk) qui fonctionne.

3.  Dans le dashboard Convex, tu vois ta table products remplie avec tes
    > données mockées.

C\'est parti. Voici le plan d\'action technique et opérationnel pour la
**Phase 1 : Initialisation & Mock Store**.

L\'objectif de cette phase est d\'avoir une coquille vide fonctionnelle
: une app sécurisée où l\'on peut se connecter et une base de données
remplie de produits alimentaires fictifs prêts à être interrogés.

### **Étape 1 : Initialisation du Projet & Installation**

On met en place le socle technique : Next.js 15, Tailwind, Shadcn et les
connecteurs pour la DB et l\'Auth.

**Créer le projet Next.js :\
**Bash\
npx create-next-app@latest my-ai-shopper

\# Options : TypeScript: Yes, Tailwind: Yes, ESLint: Yes, App Router:
Yes

1.  

**Installer les dépendances clés :\
**Bash\
cd my-ai-shopper

npm install convex \@clerk/nextjs clerk-convex-provider

2.  

**Initialiser Shadcn UI (pour le design rapide) :\
**Bash\
npx shadcn@latest init

\# Style: New York, Base color: Slate, CSS Variables: Yes

npx shadcn@latest add button input card toast

3.  

**Lancer Convex (Le Backend) :\
**Bash\
npx convex dev

\# Cela va te demander de te connecter à Convex et créer un projet.

4.  

### **Étape 2 : Configuration de l\'Authentification (Clerk + Convex)**

On sécurise l\'accès. Convex doit savoir qui est l\'utilisateur connecté
via Clerk.

1.  **Setup Clerk :**

    -   Va sur [[clerk.com]{.underline}](https://clerk.com), crée un
        > projet.

    -   Copie les clés NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY et
        > CLERK_SECRET_KEY dans ton fichier .env.local.

2.  **Lier Clerk à Convex :**

    -   Dans le dashboard Clerk \> **JWT Templates**, crée un template
        > nommé convex.

    -   Copie l\'URL de l\'Issuer.

    -   Crée un fichier convex/auth.config.ts :

TypeScript\
export default {

providers: \[

{

domain: \"https://ton-url-clerk.clerk.accounts.dev\", // L\'URL Issuer
copiée

applicationID: \"convex\",

},

\],

};

3.  

4.  **Provider Frontend :**

    -   Configure le ConvexClientProvider dans ton layout racine
        > (app/layout.tsx) pour envelopper ton app avec
        > l\'authentification.

### **Étape 3 : Création du Schéma de Données**

On définit la structure de la base de données pour nos produits.

1.  Ouvre convex/schema.ts.

2.  Définis la table products avec un index de recherche (crucial pour
    > que l\'IA trouve les produits).

TypeScript

import { defineSchema, defineTable } from \"convex/server\";

import { v } from \"convex/values\";

export default defineSchema({

products: defineTable({

name: v.string(),

price: v.number(),

category: v.string(),

inStock: v.boolean(),

description: v.string(),

})

.searchIndex(\"search_name\", {

searchField: \"name\",

filterFields: \[\"category\"\], // Pour filtrer par rayon si besoin

}),

// \... (On ajoutera users et carts plus tard)

});

### **Étape 4 : Le Script de Seeding (Remplir le magasin)**

C\'est ici qu\'on crée le \"faux Intermarché\".

1.  **Créer les données brutes :** Crée un fichier convex/mockData.ts
    > avec une liste de produits réalistes.

TypeScript

// convex/mockData.ts

export const PRODUCTS = \[

{ name: \"Spaghetti Barilla 500g\", price: 1.15, category: \"Pâtes\",
inStock: true, description: \"Pâtes au blé dur\" },

{ name: \"Riz Basmati Taureau Ailé 1kg\", price: 3.50, category:
\"Riz\", inStock: true, description: \"Riz parfumé\" },

{ name: \"Sauce Tomate Panzani 400g\", price: 1.80, category:
\"Sauces\", inStock: true, description: \"Sauce provençale\" },

{ name: \"Oeufs Bio x6\", price: 2.90, category: \"Frais\", inStock:
true, description: \"Oeufs plein air\" },

{ name: \"Lait Demi-écrémé 1L\", price: 1.05, category: \"Frais\",
inStock: true, description: \"Lait origine France\" },

{ name: \"Steak Haché 5% x2\", price: 4.50, category: \"Viande\",
inStock: true, description: \"Boeuf charolais\" },

// Ajoute une vingtaine d\'autres pour que l\'IA ait du choix\...

\];

2.  **Créer la mutation d\'insertion :** Crée un fichier convex/seed.ts.

TypeScript

import { internalMutation } from \"./\_generated/server\";

import { PRODUCTS } from \"./mockData\";

export const populate = internalMutation({

args: {},

handler: async (ctx) =\> {

for (const product of PRODUCTS) {

await ctx.db.insert(\"products\", product);

}

return \"Magasin rempli avec succès !\";

},

});

3.  **Exécuter le seed :**

    -   Va dans ton dashboard Convex (interface web).

    -   Cherche la fonction seed:populate.

    -   Clique sur \"Run Function\".

    -   *Résultat :* Ta table products contient maintenant tes articles.

### **Étape 5 : Création de l\'API \"Mockée\"**

On crée les fonctions que l\'IA utilisera plus tard pour interroger ce
magasin.

1.  Crée un fichier convex/products.ts.

TypeScript

import { query } from \"./\_generated/server\";

import { v } from \"convex/values\";

// Fonction simple pour voir tout le catalogue (Debug)

export const getAll = query({

args: {},

handler: async (ctx) =\> {

return await ctx.db.query(\"products\").collect();

},

});

// Fonction de recherche que l\'IA utilisera

// Ex: search(ctx, { query: \"Pâtes\" })

export const search = query({

args: { query: v.string() },

handler: async (ctx, args) =\> {

return await ctx.db

.query(\"products\")

.withSearchIndex(\"search_name\", (q) =\> q.search(\"name\",
args.query))

.take(5); // On renvoie les 5 meilleurs résultats

},

});

### **✅ Checkpoint de fin de Phase 1**

À la fin de cette étape, tu dois pouvoir vérifier ceci :

1.  Lancer npm run dev et voir la page d\'accueil Next.js.

2.  Avoir un bouton \"Sign In\" (Clerk) qui fonctionne.

3.  Dans le dashboard Convex, tu vois ta table products remplie avec tes
    > données mockées.
