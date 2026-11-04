import { Player, world } from "@minecraft/server";

const PROPERTY = 'inari:force_mute_tags';
export const DEFAULT_MUTE_TAG = 'muted';

let cache: string[] | undefined;

export function getMuteTags(): string[] {
    if (!cache) {
        try {
            const raw = world.getDynamicProperty(PROPERTY);
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : [];
            cache = Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
        } catch {
            cache = [];
        }
    }
    return cache;
}

function saveMuteTags(tags: string[]) {
    cache = tags;
    world.setDynamicProperty(PROPERTY, JSON.stringify(tags));
}

export function addMuteTag(tag: string): boolean {
    const tags = getMuteTags();
    if (tag === DEFAULT_MUTE_TAG || tags.includes(tag)) return false;
    saveMuteTags([...tags, tag]);
    return true;
}

export function removeMuteTag(tag: string) {
    saveMuteTags(getMuteTags().filter((t) => t !== tag));
}

/** Force muted by the default `muted` tag or by any tag registered in the admin panel. */
export function isForceMuted(p: Player): boolean {
    return p.hasTag(DEFAULT_MUTE_TAG) || getMuteTags().some((t) => p.hasTag(t));
}
