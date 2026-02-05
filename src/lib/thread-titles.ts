export function getFallbackThreadTitle(threadId: string) {
    return `Thread ${threadId.slice(-6)}`;
}

export function getMeaningfulThreadName(
    threadId: string,
    name: string | null | undefined,
) {
    const trimmed = name?.trim();
    if (!trimmed) return null;
    if (trimmed === getFallbackThreadTitle(threadId)) return null;
    return trimmed;
}
