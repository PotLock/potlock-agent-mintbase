import { whitelistedProjects } from "../snapshot/projects";

interface ScoredProject {
    project: any;
    score: number;
}
export const searchProject = async (query: string): Promise<any[]> => {
    const whitelistMetadata: Record<string, any> = whitelistedProjects

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
        const tokenScores: ScoredProject[] = [];

        Object.values(whitelistMetadata).forEach(project => {
            const nameProject = tokenize(project.name);
            const descriptionProject = tokenize(project.description);
            const accountId = tokenize(project.accountId);
            let score = 0;

            // console.log({ nameTokens, symbolTokens, idTokens })

            queryTokens.forEach(queryToken => {
                const nameMatches = nameProject.filter(nameProject => nameProject.includes(queryToken)).length;
                const descriptionMatches = descriptionProject.filter(descriptionProject => descriptionProject.includes(queryToken)).length;
                const accountIdMatches = accountId.filter(idAccount => idAccount.includes(queryToken)).length;

                // Weight the matches, potentially giving different weights to different types of matches
                score += nameMatches + descriptionMatches * 2 + accountIdMatches * 3; // Example weights: higher weight for ID matches
            });

            if (score > 0) {
                tokenScores.push({ project, score });
            }
        });

        // Sort results by score in descending order and return only the token objects
        return tokenScores.sort((a, b) => b.score - a.score).map(entry => entry.project);
    }

    return searchTokens(query);
}
