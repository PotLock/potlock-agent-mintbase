import { whitelistedPots } from "../snapshot/pots";

interface ScoredPot {
    pot: any;
    score: number;
}
export const searchPot = async (query: string): Promise<any[]> => {
    
    const whitelistMetadata: Record<string, any> = whitelistedPots

    if (!whitelistMetadata) {
        return [];
    }

    function normalize(text: string): string {
        return text.toLowerCase().replace(/[^\w\s]/gi, ''); // Remove non-alphanumeric characters except space
    }

    function tokenize(text: string): string[] {
        return normalize(text).split(/\s+/);
    }

    function searchTokens(_query: string): any[] {
        const query = normalize(_query);

        const queryTokens = tokenize(query);
        const potScores: ScoredPot[] = [];

        Object.values(whitelistMetadata).forEach(pot => {
            const namePot = tokenize(pot.name);
            const descriptionPot = tokenize(pot.description);
            const potId = tokenize(pot.id);
            let score = 0;

            // console.log({ namePot, descriptionPot, accountId })

            queryTokens.forEach(queryToken => {
                const nameMatches = namePot.filter(namePot => namePot.includes(queryToken)).length;
                const descriptionMatches = descriptionPot.filter(descriptionPot => descriptionPot.includes(queryToken)).length;
                const accountIdMatches = potId.filter(idpot => idpot.includes(queryToken)).length;

                // Weight the matches, potentially giving different weights to different types of matches
                score += nameMatches + descriptionMatches * 2 + accountIdMatches * 3; // Example weights: higher weight for ID matches
            });

            if (score > 0) {
                potScores.push({ pot, score });
            }
        });

        // Sort results by score in descending order and return only the pot objects
        return potScores.sort((a, b) => b.score - a.score).map(entry => entry.pot);
    }

    return searchTokens(query);
}
