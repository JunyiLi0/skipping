C\'est un choix de stack technique moderne et très puissant (**Next.js +
Convex + Clerk**). Cette combinaison (souvent appelée le \"Indie
Stack\") permet d\'aller extrêmement vite car Convex gère la base de
données, le backend et les fonctions serverless en temps réel sans
configuration complexe.

Concernant le Mock Store : Je te déconseille fortement FakeStoreAPI pour
ton cas précis. Pourquoi ? Parce qu\'il ne contient que des vêtements et
de l\'électronique. Si ton utilisateur demande \"des ingrédients pour
des lasagnes\" et que l\'API renvoie \"Veste en cuir\", la démo tombe à
l\'eau.

Ma recommandation : Puisque tu utilises Convex, nous allons créer une
table mock_products directement dans ta base de données Convex. Cela
agira comme l\'API du magasin. C\'est plus simple, plus rapide, et tu
pourras y insérer de vrais produits alimentaires (lait, pâtes, etc.).

Voici l\'architecture détaillée et le plan d\'action.

### 1. Architecture Technique Détaillée

L\'application est divisée en deux blocs logiques : **L\'Application
Client** (Ton produit) et **Le Mock Store** (Le faux magasin), tous deux
hébergés dans le même projet pour le POC mais logiquement séparés.

#### A. Frontend (Client)

-   **Framework :** Next.js 15 (App Router).

-   **Hosting :** Vercel.

-   **Styling :** Tailwind CSS + Shadcn UI (pour les formulaires, le
    > chat, et les cards produits).

-   **Auth :** Clerk (Authentification sécurisée et rapide).

-   **State :** React Query (via Convex React Client) pour le temps
    > réel.

#### B. Backend & Data (Convex)

Convex remplace ici ton serveur Node.js et ta base PostgreSQL.

-   **Queries :** Pour récupérer les messages du chat et le contenu du
    > panier.

-   **Mutations :** Pour envoyer un message ou mettre à jour les
    > préférences.

-   **Actions :** C\'est ici que vit l\'IA. Les actions Convex peuvent
    > prendre du temps (appeler OpenAI).

#### C. Intelligence Artificielle (Le Cerveau)

-   **Modèle :** GPT-4o (OpenAI).

-   **Framework :** Utilisation directe de l\'API OpenAI avec **Function
    > Calling** (Tools).

-   **Logique :**

    1.  L\'IA reçoit le prompt + le contexte (préférences utilisateur).

    2.  L\'IA décide si elle a besoin de poser une question (réponse
        > texte) OU si elle doit chercher des produits (appel d\'outil).

    3.  L\'IA génère la liste finale et appelle la fonction addToCart.

#### D. Le Mock Store (Simulé dans Convex)

Pour le POC, l\'API du magasin sera simulée par des fonctions internes
Convex.

-   **Database :** Une table products (avec nom, prix, catégorie,
    > image).

-   **API Simulée :** Une fonction searchProducts(query) qui fait une
    > recherche vectorielle ou textuelle simple dans la table produits.

### 2. Schéma de Base de Données (Convex Schema)

Voici la structure de données (convex/schema.ts) pour supporter ton app.

> TypeScript

import { defineSchema, defineTable } from \"convex/server\";\
import { v } from \"convex/values\";\
\
export default defineSchema({\
// 1. Utilisateurs et Préférences\
users: defineTable({\
tokenIdentifier: v.string(), // ID Clerk\
name: v.string(),\
email: v.string(),\
// Préférences remplies via le formulaire\
preferences: v.object({\
diet: v.optional(v.string()), // ex: \"Végétarien\"\
budget: v.optional(v.string()), // ex: \"Economique\"\
householdSize: v.number(), // ex: 4 personnes\
allergies: v.array(v.string()),\
}),\
}).index(\"by_token\", \[\"tokenIdentifier\"\]),\
\
// 2. Historique du Chat\
chats: defineTable({\
userId: v.id(\"users\"),\
status: v.string(), // \"active\", \"completed\"\
createdAt: v.number(),\
}),\
\
messages: defineTable({\
chatId: v.id(\"chats\"),\
role: v.string(), // \"user\" ou \"assistant\"\
content: v.string(),\
// Si l\'IA propose des actions spécifiques (optionnel pour le POC)\
toolCalls: v.optional(v.any()),\
}),\
\
// 3. LE MOCK STORE (Données du magasin simulé)\
products: defineTable({\
name: v.string(), // ex: \"Barilla Spaghetti 500g\"\
price: v.number(), // ex: 1.50\
category: v.string(), // ex: \"Pâtes\"\
description: v.string(),\
inStock: v.boolean(),\
imageUrl: v.optional(v.string()),\
}).searchIndex(\"search_product\", {\
searchField: \"name\",\
filterFields: \[\"category\"\],\
}),\
\
// 4. Le Panier (Côté Magasin)\
carts: defineTable({\
userId: v.id(\"users\"), // Lien avec l\'utilisateur\
status: v.string(), // \"open\", \"paid\"\
items: v.array(v.object({\
productId: v.id(\"products\"),\
quantity: v.number(),\
priceAtAdd: v.number(), // Prix au moment de l\'ajout\
productName: v.string(), // Snapshot du nom pour affichage facile\
})),\
totalPrice: v.number(),\
}).index(\"by_user_status\", \[\"userId\", \"status\"\]),\
});

### 3. Plan d\'Action Détaillé (De A à Z)

Voici la feuille de route pour construire le POC.

#### Phase 1 : Initialisation & Mock Store (Jour 1)

L\'objectif est d\'avoir un \"faux magasin\" qui fonctionne avant même
de faire de l\'IA.

1.  **Setup :** npx create-next-app, installer Tailwind, Shadcn, Convex,
    > Clerk.

2.  **Auth :** Configurer Clerk et envelopper l\'app avec
    > \<ClerkProvider\>.

3.  **Data Seeding (Crucial) :**

    -   Créer un script seed.ts dans Convex.

    -   Générer un JSON de 50 produits \"Intermarché\" réalistes (Lait,
        > Oeufs, Riz, Pâtes, Sauce Tomate, Steak Haché, Légumes, etc.).

    -   Lancer le script pour remplir la table products.

4.  **API Magasin :** Créer une Query Convex searchProducts(query) et
    > une Mutation addToCart(productId, qty).

#### Phase 2 : Onboarding & Préférences (Jour 2)

1.  **Formulaire :** Créer une page /onboarding avec Shadcn Form (React
    > Hook Form + Zod).

2.  **Champs :** Régime, Allergies, Budget, Composition du foyer.

3.  **Sauvegarde :** Créer une Mutation Convex updateUserPreferences
    > pour stocker ces infos dans la table users.

#### Phase 3 : L\'Interface de Chat (Jour 2-3)

1.  **UI Chat :** Créer une page /shop avec une fenêtre de chat standard
    > (Zone de messages + Input).

2.  **Logique de base :** L\'utilisateur tape -\> ça s\'affiche -\> ça
    > part dans la table messages.

3.  **Streaming (Optionnel mais cool) :** Prévoir l\'affichage du texte
    > de l\'IA mot par mot (stream).

#### Phase 4 : L\'Agent IA (Le Cœur - Jour 4)

C\'est la partie complexe. Créer une **Action Convex** (convex/ai.ts).

1.  **Context Building :** Récupérer les préférences de l\'utilisateur +
    > l\'historique des 10 derniers messages.

2.  **System Prompt :** Rédiger un prompt puissant :\"Tu es un assistant
    > shopping personnel. Tu as accès aux préférences de l\'utilisateur
    > : \[PREFERENCES\]. Ton but est de remplir son panier. Tu dois
    > poser des questions si la demande est floue. Quand tu es prêt à
    > ajouter des articles, utilise l\'outil shopping_tool.\"

3.  **Tool Definition :** Définir les fonctions que GPT peut appeler :

    -   search_store(query)

    -   get_product_details(id)

    -   finalize_cart(list_of_items)

4.  **Boucle d\'exécution :**

    -   Si GPT répond par du texte -\> Envoyer au frontend.

    -   Si GPT appelle search_store -\> L\'Action Convex exécute la
        > recherche dans la table products -\> Renvoie le résultat à GPT
        > -\> GPT analyse et décide quoi prendre.

#### Phase 5 : Logique de Panier & Validation (Jour 5)

1.  **Visualisation :** Sur la droite de l\'écran (desktop) ou dans un
    > drawer (mobile), afficher le composant \"Panier Mock\".

2.  **Remplissage :** Quand l\'IA appelle finalize_cart, l\'application
    > exécute la mutation addToCart pour chaque item.

3.  **Feedback :** Afficher \"X articles ajoutés au panier\" et montrer
    > le total.

#### Phase 6 : Déploiement & Tests

1.  Pousser sur Github.

2.  Connecter à Vercel.

3.  Configurer les variables d\'environnement (CLERK_KEYS, OPENAI_KEY,
    > CONVEX_URL).

### Prochaine étape pour toi

Veux-tu que je génère :

1.  Le fichier **package.json** avec toutes les dépendances exactes pour
    > démarrer ?

2.  Ou le **System Prompt** complet de l\'IA pour qu\'elle gère bien les
    > préférences alimentaires ?
