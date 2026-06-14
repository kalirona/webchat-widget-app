import { prisma } from "wasp/server";

type ScoredChunk = {
  id: string;
  content: string;
  score: number;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreChunk(query: string, chunkContent: string): number {
  const queryTokens = tokenize(query);
  const chunkTokens = tokenize(chunkContent);
  if (queryTokens.length === 0 || chunkTokens.length === 0) return 0;

  const chunkSet = new Set(chunkTokens);
  let matches = 0;
  for (const qt of queryTokens) {
    if (chunkSet.has(qt)) matches++;
  }

  const queryFreq = matches / queryTokens.length;
  const chunkFreq = matches / chunkTokens.length;
  return queryFreq * 0.6 + chunkFreq * 0.4;
}

export async function retrieveRelevantChunks(
  agentId: string,
  query: string,
  maxChunks: number = 5,
): Promise<ScoredChunk[]> {
  const agentKbs = await prisma.agentKnowledgeBase.findMany({
    where: { agentId },
    include: {
      knowledgeBase: {
        include: {
          documents: {
            where: { status: "ready" },
            include: { chunks: true },
          },
        },
      },
    },
  });

  const allChunks: ScoredChunk[] = [];

  for (const akb of agentKbs) {
    for (const doc of akb.knowledgeBase.documents) {
      for (const chunk of doc.chunks) {
        const score = scoreChunk(query, chunk.content);
        allChunks.push({ id: chunk.id, content: chunk.content, score });
      }
    }
  }

  allChunks.sort((a, b) => b.score - a.score);
  return allChunks.slice(0, maxChunks);
}

export function buildKnowledgeContext(chunks: ScoredChunk[]): string {
  if (chunks.length === 0) return "";

  const sections = chunks.map(
    (c, i) => `[Reference ${i + 1}]\n${c.content}`,
  );

  return `\n\nRelevant knowledge base content:\n${sections.join("\n\n")}\n\nUse the above references to answer the user's question accurately. If the answer cannot be found in the references, say so and offer to help with what you can based on general knowledge.`;
}
