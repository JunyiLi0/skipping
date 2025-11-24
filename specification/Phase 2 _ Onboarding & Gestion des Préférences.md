Voici le plan détaillé pour la \*\*Phase 2 : Onboarding & Gestion des
Préférences\*\*.

\*\*Objectif :\*\* Transformer un visiteur anonyme en un utilisateur
connu. Nous allons créer un formulaire qui capture les données cruciales
(régime, budget, famille) et les synchronise entre Clerk (Auth) et
Convex (Base de données). Ces données serviront de \"Contexte Système\"
pour l\'IA plus tard.

\-\-\-\--

\### Étape 1 : Mise à jour du Schéma de Données

Nous devons officialiser la structure de l\'utilisateur dans la base de
données.

1\. Oouvre \`convex/schema.ts\`.

2\. Ajoute ou mets à jour la table \`users\`.

\<!\-- end list \--\>

\`\`\`typescript

// convex/schema.ts

import { defineSchema, defineTable } from \"convex/server\";

import { v } from \"convex/values\";

export default defineSchema({

// \... ta table products existante \...

users: defineTable({

tokenIdentifier: v.string(), // L\'ID unique venant de Clerk (ex:
\"user_2N\...\")

name: v.string(),

email: v.string(),

preferences: v.object({

diet: v.string(), // ex: \"Omnivore\", \"Végétarien\"

allergies: v.string(), // Champ texte libre pour le POC (plus simple que
array)

householdSize: v.number(), // ex: 4

budgetIntensity: v.string(),// ex: \"Eco\", \"Standard\", \"Premium\"

}),

}).index(\"by_token\", \[\"tokenIdentifier\"\]),

});

\`\`\`

\-\-\-\--

\### Étape 2 : Backend - La Mutation \"Upsert\"

Nous avons besoin d\'une fonction sécurisée qui crée ou met à jour
l\'utilisateur.

1\. Crée un fichier \`convex/users.ts\`.

2\. Crée une mutation qui vérifie l\'identité Clerk et sauvegarde les
données.

\<!\-- end list \--\>

\`\`\`typescript

// convex/users.ts

import { mutation, query } from \"./\_generated/server\";

import { v } from \"convex/values\";

// 1. Sauvegarder les préférences (Création ou Mise à jour)

export const upsertUser = mutation({

args: {

name: v.string(),

email: v.string(),

preferences: v.object({

diet: v.string(),

allergies: v.string(),

householdSize: v.number(),

budgetIntensity: v.string(),

}),

},

handler: async (ctx, args) =\> {

const identity = await ctx.auth.getUserIdentity();

if (!identity) {

throw new Error(\"Non authentifié\");

}

// Vérifier si l\'utilisateur existe déjà

const user = await ctx.db

.query(\"users\")

.withIndex(\"by_token\", (q) =\> q.eq(\"tokenIdentifier\",
identity.subject))

.unique();

if (user) {

// Mise à jour

await ctx.db.patch(user.\_id, { \...args });

} else {

// Création

await ctx.db.insert(\"users\", {

tokenIdentifier: identity.subject,

\...args,

});

}

},

});

// 2. Récupérer l\'utilisateur courant (Pour vérifier s\'il a fini
l\'onboarding)

export const getCurrentUser = query({

handler: async (ctx) =\> {

const identity = await ctx.auth.getUserIdentity();

if (!identity) return null;

return await ctx.db

.query(\"users\")

.withIndex(\"by_token\", (q) =\> q.eq(\"tokenIdentifier\",
identity.subject))

.unique();

},

});

\`\`\`

\-\-\-\--

\### Étape 3 : Frontend - Installation des Outils de Formulaire

On utilise la stack standard moderne pour des formulaires robustes.

1\. \*\*Installer Zod et React Hook Form :\*\*

\`\`\`bash

npm install react-hook-form zod \@hookform/resolvers

\`\`\`

2\. \*\*Installer les composants UI Shadcn manquants :\*\*

\`\`\`bash

npx shadcn@latest add form select radio-group input label

\`\`\`

\-\-\-\--

\### Étape 4 : Frontend - Création de la Page Onboarding

C\'est le gros morceau UI.

1\. Crée le fichier \`app/onboarding/page.tsx\`.

2\. Définis le schéma de validation Zod.

3\. Connecte le tout à la mutation Convex.

\*Structure simplifiée du code à implémenter :\*

\`\`\`typescript

\"use client\";

import { useForm } from \"react-hook-form\";

import { zodResolver } from \"@hookform/resolvers/zod\";

import { z } from \"zod\";

import { useMutation, useQuery } from \"convex/react\";

import { api } from \"@/convex/\_generated/api\";

import { useUser } from \"@clerk/nextjs\";

import { useRouter } from \"next/navigation\";

// 1. Schéma de validation

const formSchema = z.object({

diet: z.string().min(1, \"Sélectionnez un régime\"),

allergies: z.string(), // Optionnel, peut être vide

householdSize: z.coerce.number().min(1, \"Au moins 1 personne\"),

budgetIntensity: z.enum(\[\"Eco\", \"Standard\", \"Premium\"\]),

});

export default function OnboardingPage() {

const { user } = useUser();

const router = useRouter();

const updateUser = useMutation(api.users.upsertUser);

const form = useForm\<z.infer\<typeof formSchema\>\>({

resolver: zodResolver(formSchema),

defaultValues: {

diet: \"Omnivore\",

allergies: \"Aucune\",

householdSize: 1,

budgetIntensity: \"Standard\",

},

});

// 2. Soumission

async function onSubmit(values: z.infer\<typeof formSchema\>) {

if (!user) return;

await updateUser({

name: user.fullName \|\| \"Utilisateur\",

email: user.primaryEmailAddress?.emailAddress \|\| \"\",

preferences: values,

});

// Redirection vers le shop une fois terminé

router.push(\"/shop\");

}

return (

\<div className=\"max-w-md mx-auto mt-20 p-6 bg-white shadow-lg
rounded-lg\"\>

\<h1 className=\"text-2xl font-bold mb-4\"\>Configurons votre
assistant\</h1\>

{/\* Ici, insérer les composants \<Form\> de Shadcn pour chaque champ
\*/}

{/\* Diet (Select), Allergies (Input), Household (Input), Budget (Radio)
\*/}

{/\* Bouton Submit \*/}

\</div\>

);

}

\`\`\`

\-\-\-\--

\### Étape 5 : Gestion de la Redirection (Route Guard)

On veut s\'assurer que personne n\'accède au \`/shop\` sans passer par
l\'onboarding.

1\. Crée ta page principale \`app/shop/page.tsx\` (vide pour
l\'instant).

2\. Dans ce fichier, ajoute une vérification au chargement :

\<!\-- end list \--\>

\`\`\`typescript

\"use client\";

import { useQuery } from \"convex/react\";

import { api } from \"@/convex/\_generated/api\";

import { useRouter } from \"next/navigation\";

import { useEffect } from \"react\";

export default function ShopPage() {

const userData = useQuery(api.users.getCurrentUser);

const router = useRouter();

useEffect(() =\> {

// Si chargé, mais pas de données utilisateur trouvées en DB -\>
Onboarding

if (userData === null) {

router.push(\"/onboarding\");

}

}, \[userData, router\]);

if (userData === undefined) return \<div\>Chargement\...\</div\>; //
Convex charge encore

return \<div\>Bienvenue dans le shop, {userData.name} !\</div\>;

}

\`\`\`

\-\-\-\--

\### ✅ Checkpoint de fin de Phase 2

À la fin de cette étape, tu peux tester le flux complet :

1\. Tu cliques sur \"Sign In\" (Clerk).

2\. Une fois connecté, tu vas manuellement sur \`/shop\` (ou tu
configures Clerk pour rediriger là-bas).

3\. Le code détecte que tu n\'existes pas en DB Convex -\\\> Redirection
auto vers \`/onboarding\`.

4\. Tu remplis le formulaire (ex: \"Végétarien\", \"4 personnes\").

5\. Tu valides -\\\> Redirection vers \`/shop\`.

6\. Dans le dashboard Convex \\\> Table \`users\`, tu vois ta ligne
créée avec tes préférences JSON.

\*\*Veux-tu que je te détaille le code UI complet du formulaire (avec
les composants Shadcn) pour copier-coller dans
\`app/onboarding/page.tsx\` ?\*\*
