Voici le plan détaillé pour la **Phase 4 : L\'Intelligence Artificielle
(Le Cerveau)**.

C\'est l\'étape la plus excitante. Nous allons connecter ton application
à OpenAI (GPT-4o). L\'IA ne va pas seulement \"discuter\", elle va avoir
la capacité d\'utiliser des **outils** (Function Calling) pour
interroger ton faux magasin Intermarché stocké dans Convex.

### **Étape 1 : Configuration d\'OpenAI**

Il faut donner à Convex l\'accès à l\'API OpenAI.

1.  **Obtenir la clé :** Va sur
    > [[platform.openai.com]{.underline}](https://platform.openai.com/),
    > génère une API Key.

2.  **Configurer Convex :**

    -   Va sur ton Dashboard Convex \> Settings \> Environment
        > Variables.

    -   Ajoute une variable : OPENAI_API_KEY avec ta clé (sk-\...).

3.  Installer le SDK :\
    > Dans ton terminal :

4.  Bash

npm install openai

5.  
6.  

### **Étape 2 : Définition de l\'Action IA**

Dans Convex, les mutations sont rapides (écriture DB), mais les actions
sont faites pour les tâches lentes (appels API externes).

Crée un fichier convex/ai.ts. Nous allons y construire le cerveau.

*Note technique : Pour que l\'IA puisse lire la base de données
(chercher des produits), nous devons transformer notre Query
products:search (Phase 1) en un \"Outil\" que GPT peut comprendre.*

TypeScript

// convex/ai.ts

\"use node\"; // Indique que ce code tourne sur Node (nécessaire pour
OpenAI)

import { action } from \"./\_generated/server\";

import { v } from \"convex/values\";

import { api } from \"./\_generated/api\";

import OpenAI from \"openai\";

const openai = new OpenAI({

apiKey: process.env.OPENAI_API_KEY,

});

export const chat = action({

args: {

chatId: v.id(\"chats\"),

messageBody: v.string(), // Le dernier message de l\'utilisateur

},

handler: async (ctx, args) =\> {

// 1. Récupérer le contexte (User + Historique)

// On fait appel à des queries internes pour avoir les données

const messages = await ctx.runQuery(api.chat.getMessages, { chatId:
args.chatId });

const user = await ctx.runQuery(api.users.getCurrentUser);

if (!user) throw new Error(\"User not found\");

// 2. Construire le System Prompt (La personnalité de l\'IA)

const systemPrompt = \`

Tu es un assistant personnel de courses pour Intermarché.

L\'utilisateur s\'appelle \${user.name}.

SES PRÉFÉRENCES :

\- Régime : \${user.preferences.diet}

\- Allergies : \${user.preferences.allergies}

\- Budget : \${user.preferences.budgetIntensity}

\- Foyer : \${user.preferences.householdSize} personnes.

RÈGLES :

\- Si l\'utilisateur demande un produit, utilise l\'outil
\'search_products\' pour vérifier s\'il existe.

\- Ne propose JAMAIS un produit qui contient une allergie de
l\'utilisateur.

\- Sois concis et utile.

\`;

// 3. Préparer les outils (Tools)

const tools = \[

{

type: \"function\",

function: {

name: \"search_products\",

description: \"Cherche des produits dans le catalogue du magasin par nom
ou catégorie\",

parameters: {

type: \"object\",

properties: {

query: { type: \"string\", description: \"Le nom du produit cherché (ex:
\'Pâtes\', \'Lait\')\" },

},

required: \[\"query\"\],

},

},

},

\] as const;

// 4. Premier appel à GPT (Réflexion)

const completion = await openai.chat.completions.create({

model: \"gpt-4o\",

messages: \[

{ role: \"system\", content: systemPrompt },

\...messages.map(m =\> ({ role: m.role as \"user\" \| \"assistant\",
content: m.content })),

{ role: \"user\", content: args.messageBody }

\],

tools: tools,

tool_choice: \"auto\", // L\'IA décide si elle cherche ou parle

});

const responseMessage = completion.choices\[0\].message;

// 5. Gérer la réponse

// CAS A : L\'IA veut utiliser un outil (Chercher un produit)

if (responseMessage.tool_calls) {

const toolCall = responseMessage.tool_calls\[0\];

if (toolCall.function.name === \"search_products\") {

const { query } = JSON.parse(toolCall.function.arguments);

// Exécuter la recherche dans notre DB Convex

const searchResults = await ctx.runQuery(api.products.search, { query
});

// Renvoyer les résultats à GPT pour qu\'il analyse

const finalCompletion = await openai.chat.completions.create({

model: \"gpt-4o\",

messages: \[

{ role: \"system\", content: systemPrompt },

\...messages.map(m =\> ({ role: m.role, content: m.content })),

{ role: \"user\", content: args.messageBody },

responseMessage, // L\'intention de recherche de l\'IA

{

role: \"tool\",

tool_call_id: toolCall.id,

content: JSON.stringify(searchResults), // Les produits trouvés (Prix,
Nom\...)

}

\],

});

// Sauvegarder la réponse finale de l\'IA

await ctx.runMutation(api.chat.sendMessage, {

chatId: args.chatId,

role: \"assistant\",

content: finalCompletion.choices\[0\].message.content \|\| \"Désolé,
erreur.\",

});

}

}

// CAS B : L\'IA répond juste du texte (ex: \"Bonjour\")

else {

await ctx.runMutation(api.chat.sendMessage, {

chatId: args.chatId,

role: \"assistant\",

content: responseMessage.content \|\| \"Je n\'ai pas compris.\",

});

}

},

});

### **Étape 3 : Connecter le Frontend à l\'Action**

Nous devons modifier la façon dont le message est envoyé. Actuellement,
le frontend sauvegarde juste le message de l\'utilisateur. Il doit
maintenant déclencher l\'IA.

Modifie app/shop/page.tsx (fonction handleSendMessage) :

TypeScript

// \... imports \...

import { api } from \"@/convex/\_generated/api\";

// \... dans le composant \...

const performAiAction = useAction(api.ai.chat); // Hook pour appeler
l\'action

const handleSendMessage = async (e: React.FormEvent) =\> {

e.preventDefault();

if (!newMessage.trim() \|\| !chatId) return;

const tempContent = newMessage;

setNewMessage(\"\"); // Vider l\'input tout de suite pour l\'UX

try {

// 1. Sauvegarder le message utilisateur (Optimistic UI)

await sendMessage({

chatId,

content: tempContent,

role: \"user\",

});

// 2. Déclencher l\'IA (C\'est ici que la magie opère)

// On ne \"wait\" pas forcément ici si on veut pas bloquer l\'UI,

// mais pour le POC c\'est plus simple d\'attendre.

await performAiAction({

chatId,

messageBody: tempContent,

});

} catch (error) {

console.error(\"Erreur IA:\", error);

}

};

*Note : Comme Convex est \"Reactive\", dès que l\'action performAiAction
aura fini et inséré la réponse en base via sendMessage, ton écran se
mettra à jour automatiquement sans que tu aies besoin de faire quoi que
ce soit.*

### **Étape 4 : Test du \"Matching\" (Le Moment de Vérité)**

C\'est le moment de vérifier si ton Mock Store (Phase 1) et ton User
Context (Phase 2) fonctionnent ensemble.

1.  Connecte-toi avec un compte dont les préférences sont :
    > \"Végétarien\".

2.  Dans le Mock Store, assure-toi d\'avoir des \"Steak Hachés\" et des
    > \"Steak Soja\".

3.  Tape dans le chat : **\"Je veux faire des burgers.\"**

**Ce qui devrait se passer (Logique interne) :**

1.  L\'IA reçoit \"Je veux faire des burgers\" + Context \"Végétarien\".

2.  L\'IA appelle l\'outil search_products(\"Burger\") ou
    > search_products(\"Steak\").

3.  Convex renvoie : \[{name: \"Steak Haché Boeuf\"}, {name: \"Steak
    > Soja Bio\"}\].

4.  L\'IA analyse : \"L\'utilisateur est Végétarien, je dois exclure le
    > boeuf\".

5.  **Réponse affichée :** \"J\'ai trouvé des Steaks de Soja Bio
    > parfaits pour vos burgers végétariens. Voulez-vous que je les
    > ajoute ?\"

### **✅ Checkpoint de fin de Phase 4**

Tu as maintenant une \"Thinking Machine\".

1.  L\'IA répond intelligemment.

2.  Elle a accès à tes produits (si tu demandes \"Quel est le prix du
    > lait ?\", elle doit te donner le prix exact de ta DB, pas une
    > hallucination).

3.  Elle respecte tes préférences.

Prochaine étape (Phase 5) : Pour l\'instant, c\'est du texte. L\'IA
demande \"Voulez-vous ajouter ?\". Si tu dis \"Oui\", elle va dire
\"C\'est fait\", mais le panier ne se remplira pas vraiment.

En Phase 5, nous allons donner à l\'IA le pouvoir d\'écrire dans la
table carts via un nouvel outil addToCart.

Veux-tu passer à la Phase 5 (Le Panier et l\'Action) ?
