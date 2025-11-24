Voici le plan détaillé pour la \*\*Phase 5 : Gestion du Panier & Action
Agent\*\*.

\*\*Objectif :\*\* Transformer l\'IA d\'un simple conseiller (chatbot)
en un véritable \*\*agent\*\* capable d\'agir sur la base de données.
C\'est le moment où l\'utilisateur dit \"Prends ça\" et où le panier se
remplit visuellement à l\'écran sans clics manuels.

\-\-\-\--

\### Étape 1 : Mise à jour du Schéma (La Table Carts)

On officialise la structure du panier.

1\. Ouvre \`convex/schema.ts\`.

2\. Ajoute la table \`carts\`.

\<!\-- end list \--\>

\`\`\`typescript

// convex/schema.ts

import { defineSchema, defineTable } from \"convex/server\";

import { v } from \"convex/values\";

export default defineSchema({

// \... users, products, chats, messages \...

carts: defineTable({

userId: v.id(\"users\"),

status: v.string(), // \"active\" ou \"paid\"

items: v.array(

v.object({

productId: v.id(\"products\"),

quantity: v.number(),

})

),

}).index(\"by_user_status\", \[\"userId\", \"status\"\]),

});

\`\`\`

\-\-\-\--

\### Étape 2 : Backend - Les Mutations du Panier

L\'IA a besoin de \"mains\" pour manipuler le panier. Créons ces
fonctions.

1\. Crée un fichier \`convex/cart.ts\`.

\<!\-- end list \--\>

\`\`\`typescript

import { mutation, query } from \"./\_generated/server\";

import { v } from \"convex/values\";

// 1. Récupérer le panier actif (pour l\'affichage Frontend)

export const getCart = query({

args: {},

handler: async (ctx) =\> {

const identity = await ctx.auth.getUserIdentity();

if (!identity) return null;

const user = await ctx.db

.query(\"users\")

.withIndex(\"by_token\", (q) =\> q.eq(\"tokenIdentifier\",
identity.subject))

.unique();

if (!user) return null;

const cart = await ctx.db

.query(\"carts\")

.withIndex(\"by_user_status\", (q) =\> q.eq(\"userId\",
user.\_id).eq(\"status\", \"active\"))

.unique();

if (!cart) return null;

// On enrichit le panier avec les détails des produits (Join manuel)

const itemsWithDetails = await Promise.all(

cart.items.map(async (item) =\> {

const product = await ctx.db.get(item.productId);

return { \...item, productDetails: product };

})

);

return { \...cart, items: itemsWithDetails };

},

});

// 2. Ajouter un item (L\'outil que l\'IA utilisera)

export const addItem = mutation({

args: {

productId: v.id(\"products\"),

quantity: v.number(),

},

handler: async (ctx, args) =\> {

const identity = await ctx.auth.getUserIdentity();

if (!identity) throw new Error(\"Auth required\");

const user = await ctx.db

.query(\"users\")

.withIndex(\"by_token\", (q) =\> q.eq(\"tokenIdentifier\",
identity.subject))

.unique();

if (!user) throw new Error(\"User not found\");

// Trouver ou créer le panier

let cart = await ctx.db

.query(\"carts\")

.withIndex(\"by_user_status\", (q) =\> q.eq(\"userId\",
user.\_id).eq(\"status\", \"active\"))

.unique();

if (!cart) {

const newCartId = await ctx.db.insert(\"carts\", {

userId: user.\_id,

status: \"active\",

items: \[\],

});

cart = await ctx.db.get(newCartId);

}

if (!cart) throw new Error(\"Erreur création panier\");

// Logique d\'ajout (Fusionner si existe déjà)

const existingItemIndex = cart.items.findIndex((i) =\> i.productId ===
args.productId);

const newItems = \[\...cart.items\];

if (existingItemIndex \>= 0) {

newItems\[existingItemIndex\].quantity += args.quantity;

} else {

newItems.push({ productId: args.productId, quantity: args.quantity });

}

await ctx.db.patch(cart.\_id, { items: newItems });

return \"Produit ajouté au panier !\";

},

});

\`\`\`

\-\-\-\--

\### Étape 3 : Mise à jour de l\'IA (Nouvel Outil)

On retourne dans \`convex/ai.ts\` pour donner ce super-pouvoir à GPT-4o.

1\. Dans \`convex/ai.ts\`, modifie la liste \`tools\`.

2\. Ajoute l\'outil \`add_to_cart\`.

\<!\-- end list \--\>

\`\`\`typescript

// \... dans convex/ai.ts

const tools = \[

// \... outil search_products existant \...

{

type: \"function\",

function: {

name: \"add_to_cart\",

description: \"Ajoute un produit spécifique au panier de l\'utilisateur.
Utilise l\'ID trouvé via search_products.\",

parameters: {

type: \"object\",

properties: {

productId: { type: \"string\", description: \"L\'ID du produit (ex:
\'j57dm\...\')\" },

quantity: { type: \"number\", description: \"Quantité à ajouter (défaut
1)\" },

},

required: \[\"productId\", \"quantity\"\],

},

},

},

\] as const;

\`\`\`

3\. Dans le gestionnaire de réponse (le \`if
(responseMessage.tool_calls)\`), ajoute le cas pour ce nouvel outil.

\<!\-- end list \--\>

\`\`\`typescript

// \... dans la boucle de gestion des tool_calls

if (toolCall.function.name === \"add_to_cart\") {

const { productId, quantity } = JSON.parse(toolCall.function.arguments);

// Exécution de la mutation Panier

await ctx.runMutation(api.cart.addItem, {

productId: productId as Id\<\"products\"\>, // Cast nécessaire pour
TypeScript

quantity

});

// On informe l\'IA que c\'est fait

const confirmationMsg = {

role: \"tool\",

tool_call_id: toolCall.id,

content: \"Succès : Produit ajouté au panier.\",

};

// \... suite logique (renvoyer à GPT pour qu\'il confirme à
l\'utilisateur)

}

\`\`\`

\-\-\-\--

\### Étape 4 : Frontend - Visualiser le Panier

Retourne sur \`app/shop/page.tsx\`. C\'est le moment de remplir la
colonne de droite qui était vide.

1\. Importe la query du panier.

\`\`\`typescript

const cart = useQuery(api.cart.getCart);

\`\`\`

2\. Remplace le \`\<div\>Vide pour l\'instant\</div\>\` par une vraie
liste.

\<!\-- end list \--\>

\`\`\`typescript

{/\* ZONE PANIER \*/}

\<div className=\"hidden md:flex flex-col w-80 border-l bg-white
h-full\"\>

\<div className=\"p-4 border-b bg-gray-50\"\>

\<h2 className=\"font-bold text-lg flex items-center gap-2\"\>

🛒 Votre Panier

{/\* Badge du nombre d\'items \*/}

\<span className=\"bg-blue-600 text-white text-xs px-2 py-1
rounded-full\"\>

{cart?.items.length \|\| 0}

\</span\>

\</h2\>

\</div\>

\<div className=\"flex-1 overflow-y-auto p-4 space-y-4\"\>

{!cart \|\| cart.items.length === 0 ? (

\<p className=\"text-gray-400 text-center mt-10\"\>Votre panier est
vide.\</p\>

) : (

cart.items.map((item, idx) =\> (

\<div key={idx} className=\"flex gap-3 items-center bg-white border p-3
rounded-lg shadow-sm\"\>

{/\* Image Placeholder si pas d\'image \*/}

\<div className=\"w-12 h-12 bg-gray-200 rounded flex items-center
justify-center text-xs text-gray-500\"\>

IMG

\</div\>

\<div className=\"flex-1\"\>

\<p className=\"font-medium text-sm line-clamp-1\"\>

{item.productDetails?.name}

\</p\>

\<p className=\"text-xs text-gray-500\"\>

{item.quantity} x {item.productDetails?.price}€

\</p\>

\</div\>

\<div className=\"font-bold text-sm\"\>

{(item.quantity \* (item.productDetails?.price \|\| 0)).toFixed(2)}€

\</div\>

\</div\>

))

)}

\</div\>

{/\* TOTAL & CHECKOUT \*/}

\<div className=\"p-4 border-t bg-gray-50\"\>

\<div className=\"flex justify-between font-bold mb-4 text-lg\"\>

\<span\>Total\</span\>

\<span\>

{cart?.items.reduce((acc, item) =\> acc + (item.quantity \*
(item.productDetails?.price \|\| 0)), 0).toFixed(2)}€

\</span\>

\</div\>

\<Button className=\"w-full bg-green-600 hover:bg-green-700
text-white\"\>

Commander

\</Button\>

\</div\>

\</div\>

\`\`\`

\-\-\-\--

\### Étape 5 : Le Grand Test Final

À ce stade, tout est connecté.

1\. \*\*Scénario :\*\*

\* Utilisateur : \"Je veux faire des pâtes carbonara pour 2 personnes.\"

\* \*(Ce qui se passe en coulisse)\* :

\* L\'IA analyse : \"Besoin de Pâtes, Oeufs, Lardons (ou substitut si
végétarien), Crème/Fromage\".

\* L\'IA appelle \`search_products\` pour chaque ingrédient.

\* L\'IA trouve les IDs.

\* L\'IA appelle \`add_to_cart(id_pates, 1)\`, \`add_to_cart(id_oeufs,
1)\`, etc.

\* Convex met à jour la table \`carts\`.

2\. \*\*Résultat visuel :\*\*

\* Sans que tu cliques nulle part, les items apparaissent un par un dans
la colonne de droite.

\* Le total se met à jour.

\* L\'IA répond : \"J\'ai ajouté les spaghettis, les oeufs et les
lardons à votre panier. Il vous manque du parmesan, je n\'en ai pas
trouvé en stock.\"

\-\-\-\--

\### Et après ?

Félicitations, tu as un \*\*Agent IA E-commerce Autonome\*\* fonctionnel
\\! 🚀

Pour la suite (Phase 6 & Plus), tu pourrais envisager :

1\. \*\*Le RAG (Retrieval Augmented Generation) :\*\* Si tu as 10 000
produits, la recherche simple ne suffira pas. Il faudra utiliser la
\*Vector Search\* de Convex pour que l\'IA comprenne que \"Soda\" est
proche de \"Coca-Cola\".

2\. \*\*L\'optimisation UI :\*\* Afficher les images des produits dans
le chat quand l\'IA les propose (UI Cards).

3\. \*\*Le Mock Checkout :\*\* Faire fonctionner le bouton \"Commander\"
pour vider le panier et passer le statut à \"paid\".

\*\*Est-ce que tu souhaites que je t\'explique comment implémenter
l\'affichage des \"Cards Produits\" directement dans le flux du chat
(point 2) ?\*\*
