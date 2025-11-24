Voici le plan détaillé pour la **Phase 3 : L\'Interface de Chat &
Persistance**.

Objectif : Mettre en place le \"corps\" de l\'application.
L\'utilisateur doit pouvoir envoyer un message, le voir s\'afficher
instantanément, et l\'historique doit être sauvegardé en base de
données.

Note : À ce stade, l\'IA ne répond pas encore (ce sera la Phase 4), mais
nous allons préparer le terrain.

### **Étape 1 : Mise à jour du Schéma (Tables Chats & Messages)**

Nous devons structurer la conversation. Une \"Session de Chat\"
appartient à un utilisateur, et contient plusieurs \"Messages\".

1.  Ouvre convex/schema.ts.

2.  Ajoute les tables chats et messages.

TypeScript

// convex/schema.ts

import { defineSchema, defineTable } from \"convex/server\";

import { v } from \"convex/values\";

export default defineSchema({

// \... users et products existants \...

chats: defineTable({

userId: v.id(\"users\"),

status: v.string(), // \"active\" ou \"archived\"

title: v.optional(v.string()), // Résumé auto (optionnel pour plus tard)

}).index(\"by_user_status\", \[\"userId\", \"status\"\]),

messages: defineTable({

chatId: v.id(\"chats\"),

role: v.string(), // \"user\" ou \"assistant\"

content: v.string(),

// On prépare le terrain pour l\'IA (Phase 4)

relatedProducts: v.optional(v.array(v.id(\"products\"))),

}).index(\"by_chat\", \[\"chatId\"\]),

});

### **Étape 2 : Backend - Logique de Messagerie**

Il nous faut des fonctions pour récupérer ou créer une conversation et
pour envoyer des messages.

1.  Crée un fichier convex/chat.ts.

TypeScript

import { mutation, query } from \"./\_generated/server\";

import { v } from \"convex/values\";

// 1. Récupérer (ou créer) le chat actif de l\'utilisateur

export const getOrCreateChat = mutation({

args: {},

handler: async (ctx) =\> {

const identity = await ctx.auth.getUserIdentity();

if (!identity) throw new Error(\"Non authentifié\");

const user = await ctx.db

.query(\"users\")

.withIndex(\"by_token\", (q) =\> q.eq(\"tokenIdentifier\",
identity.subject))

.unique();

if (!user) throw new Error(\"Utilisateur introuvable\");

// Chercher un chat actif

const activeChat = await ctx.db

.query(\"chats\")

.withIndex(\"by_user_status\", (q) =\> q.eq(\"userId\",
user.\_id).eq(\"status\", \"active\"))

.first();

if (activeChat) return activeChat.\_id;

// Sinon, en créer un nouveau

return await ctx.db.insert(\"chats\", {

userId: user.\_id,

status: \"active\",

});

},

});

// 2. Récupérer les messages d\'un chat

export const getMessages = query({

args: { chatId: v.id(\"chats\") },

handler: async (ctx, args) =\> {

return await ctx.db

.query(\"messages\")

.withIndex(\"by_chat\", (q) =\> q.eq(\"chatId\", args.chatId))

.collect();

},

});

// 3. Envoyer un message (Utilisateur seulement pour l\'instant)

export const sendMessage = mutation({

args: {

chatId: v.id(\"chats\"),

content: v.string(),

role: v.union(v.literal(\"user\"), v.literal(\"assistant\")),

},

handler: async (ctx, args) =\> {

await ctx.db.insert(\"messages\", {

chatId: args.chatId,

content: args.content,

role: args.role,

});

},

});

### **Étape 3 : Frontend - Structure de la Page Shop**

Nous allons diviser l\'écran en deux : Le Chat (gauche/centre) et le
Panier (droite/drawer). Pour l\'instant, on se concentre sur le Chat.

![Image de Chat Interface Layout
Wireframe](media/image1.jpg){width="5.888888888888889in"
height="8.333333333333334in"}

Shutterstock

Explorer

1.  Ouvre app/shop/page.tsx.

2.  Nous allons gérer l\'état du chat (ID) et charger les messages.

*Structure du code :*

TypeScript

\"use client\";

import { useEffect, useState, useRef } from \"react\";

import { useMutation, useQuery } from \"convex/react\";

import { api } from \"@/convex/\_generated/api\";

import { Id } from \"@/convex/\_generated/dataModel\";

import { Button } from \"@/components/ui/button\";

import { Input } from \"@/components/ui/input\";

import { Send } from \"lucide-react\"; // Icône (npm install
lucide-react)

export default function ShopPage() {

const \[chatId, setChatId\] = useState\<Id\<\"chats\"\> \| null\>(null);

const \[newMessage, setNewMessage\] = useState(\"\");

// Mutations / Queries

const getOrCreateChat = useMutation(api.chat.getOrCreateChat);

const sendMessage = useMutation(api.chat.sendMessage);

const messages = useQuery(api.chat.getMessages, chatId ? { chatId } :
\"skip\");

// Scroll automatique vers le bas

const messagesEndRef = useRef\<HTMLDivElement\>(null);

// 1. Au chargement, on récupère/crée le chat

useEffect(() =\> {

getOrCreateChat().then(setChatId);

}, \[\]);

// 2. Scroll auto quand un nouveau message arrive

useEffect(() =\> {

messagesEndRef.current?.scrollIntoView({ behavior: \"smooth\" });

}, \[messages\]);

const handleSendMessage = async (e: React.FormEvent) =\> {

e.preventDefault();

if (!newMessage.trim() \|\| !chatId) return;

await sendMessage({

chatId,

content: newMessage,

role: \"user\",

});

setNewMessage(\"\");

};

return (

\<div className=\"flex h-screen bg-gray-50\"\>

{/\* ZONE CHAT (Main) \*/}

\<div className=\"flex-1 flex flex-col max-w-3xl mx-auto w-full bg-white
shadow-sm border-x\"\>

{/\* Header \*/}

\<div className=\"p-4 border-b bg-white z-10\"\>

\<h1 className=\"font-bold text-xl\"\>Assistant Courses 🛒\</h1\>

\</div\>

{/\* Liste des Messages \*/}

\<div className=\"flex-1 overflow-y-auto p-4 space-y-4\"\>

{messages?.map((msg) =\> (

\<div

key={msg.\_id}

className={\`flex \${msg.role === \"user\" ? \"justify-end\" :
\"justify-start\"}\`}

\>

\<div

className={\`max-w-\[80%\] rounded-2xl px-4 py-2 \${

msg.role === \"user\"

? \"bg-blue-600 text-white rounded-br-none\"

: \"bg-gray-100 text-gray-800 rounded-bl-none\"

}\`}

\>

{msg.content}

\</div\>

\</div\>

))}

\<div ref={messagesEndRef} /\>

\</div\>

{/\* Zone de saisie (Input) \*/}

\<div className=\"p-4 border-t bg-white\"\>

\<form onSubmit={handleSendMessage} className=\"flex gap-2\"\>

\<Input

value={newMessage}

onChange={(e) =\> setNewMessage(e.target.value)}

placeholder=\"Ex: Je veux faire des lasagnes ce soir\...\"

className=\"flex-1\"

/\>

\<Button type=\"submit\" size=\"icon\" disabled={!chatId}\>

\<Send className=\"h-4 w-4\" /\>

\</Button\>

\</form\>

\</div\>

\</div\>

{/\* ZONE PANIER (Placeholder pour Phase 5) \*/}

\<div className=\"hidden md:block w-80 border-l bg-gray-50 p-4\"\>

\<h2 className=\"font-semibold text-gray-500 mb-4\"\>Votre Panier\</h2\>

\<div className=\"border-2 border-dashed border-gray-300 rounded-lg h-64
flex items-center justify-center text-gray-400\"\>

Vide pour l\'instant

\</div\>

\</div\>

\</div\>

);

}

### **Étape 4 : Design & UX (Shadcn)**

Pour rendre l\'expérience agréable, assure-toi que les composants UI
sont bien installés.

Si ce n\'est pas fait :

Bash

npm install lucide-react

npx shadcn@latest add button input

*Note : Le code ci-dessus utilise Tailwind pour les bulles de chat,
c\'est souvent plus flexible que d\'utiliser un composant \"Card\" de
Shadcn pour ça.*

### **✅ Checkpoint de fin de Phase 3**

À la fin de cette étape :

1.  Connecte-toi à l\'app /shop.

2.  Tape \"Bonjour, j\'ai faim\" et appuie sur Entrée.

3.  Le message apparaît immédiatement en bleu sur la droite.

4.  Rafraîchis la page (F5).

5.  **Le message est toujours là** (Persistance réussie !).

6.  Va dans le Dashboard Convex \> Table messages, tu vois ton entrée.

**Prochaine étape (Phase 4 - La plus fun) :** Nous allons connecter
OpenAI pour que, quand tu envoies un message, une \"Action\" se
déclenche, réfléchisse, et te réponde (ou cherche un produit).

Veux-tu passer à la Phase 4 maintenant ?
