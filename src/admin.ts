import { Player, system, world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason, ModalFormData } from "@minecraft/server-ui";
import utils from "utils";
import { addMuteTag, getMuteTags, isForceMuted, removeMuteTag } from "tags";

const ON = '§a●';
const OFF = '§7○';

function status(p: Player) {
    return `Muted ${p.inari_client_muted ? ON : OFF}  Deaf ${p.inari_client_deafened ? ON : OFF}\n`
        + `Force mute ${isForceMuted(p) ? ON : OFF}  Force deaf ${p.hasTag('deafened') ? ON : OFF}`;
}

function setTag(p: Player, tag: string, value: boolean) {
    if (value) p.addTag(tag); else p.removeTag(tag);
}

async function showForm<T extends { show(p: Player): Promise<{ canceled: boolean; cancelationReason?: FormCancelationReason }> }>(
    player: Player, form: T
): Promise<Awaited<ReturnType<T['show']>> | undefined> {
    for (let i = 0; i < 20; i++) {
        const r = await form.show(player);
        if (!(r.canceled && r.cancelationReason === FormCancelationReason.UserBusy)) return r as any;
        await new Promise<void>((res) => system.runTimeout(res, 10));
    }
}

export async function openPlayerList(admin: Player): Promise<void> {
    const players = world.getAllPlayers().filter((p) => p.initialized);
    const form = new ActionFormData().title('Inari admin');
    if (players.length == 0) form.body('No player initialized.');
    form.button('§l§9Force mute tags');
    players.forEach((p) => form.button(`${p.name}\n${isForceMuted(p) ? '§cM ' : ''}${p.hasTag('deafened') ? '§cD ' : ''}${p.inari_client_muted ? '§6muted ' : ''}${p.inari_client_deafened ? '§6deaf' : ''}`));

    const r: any = await showForm(admin, form);
    if (!r || r.canceled) return;
    if (r.selection == 0) return openMuteTags(admin);
    await openPlayerPanel(admin, players[r.selection - 1]);
}

async function openMuteTags(admin: Player): Promise<void> {
    const tags = getMuteTags();
    const form = new ActionFormData()
        .title('Force mute tags')
        .body('Players with one of these tags (or the default `muted` tag) are force muted.\nSelect a tag to remove it.')
        .button('§l§aAdd a tag');
    tags.forEach((t) => form.button(`§c${t}`));
    form.button('Back');

    const r: any = await showForm(admin, form);
    if (!r || r.canceled) return;
    if (r.selection == 0) return addMuteTagForm(admin);
    if (r.selection > tags.length) return openPlayerList(admin);

    removeMuteTag(tags[r.selection - 1]);
    admin.sendMessage(`${utils.prefix} §aTag "${tags[r.selection - 1]}" removed from force mute tags.`);
    await openMuteTags(admin);
}

async function addMuteTagForm(admin: Player): Promise<void> {
    const form = new ModalFormData()
        .title('Add a force mute tag')
        .textField('Tag', 'e.g. jailed');
    const r: any = await showForm(admin, form);
    if (!r || r.canceled) return openMuteTags(admin);

    const tag = String(r.formValues[0] ?? '').trim();
    if (!tag) {
        admin.sendMessage(`${utils.prefix} §cEmpty tag.`);
    } else if (!addMuteTag(tag)) {
        admin.sendMessage(`${utils.prefix} §cTag "${tag}" is already a force mute tag.`);
    } else {
        admin.sendMessage(`${utils.prefix} §aPlayers with tag "${tag}" are now force muted.`);
    }
    await openMuteTags(admin);
}

async function openPlayerPanel(admin: Player, target: Player): Promise<void> {
    if (!target.isValid) return openPlayerList(admin);

    const form = new ModalFormData()
        .title(target.name)
        .label(status(target))
        .toggle('Force mute', { defaultValue: target.hasTag('muted') })
        .toggle('Force deafen', { defaultValue: target.hasTag('deafened') });

    const r: any = await showForm(admin, form);
    if (!r || r.canceled) return;
    if (!target.isValid) return;

    const [, forceMute, forceDeafen] = r.formValues as [undefined, boolean, boolean];
    setTag(target, 'muted', forceMute);
    setTag(target, 'deafened', forceDeafen);
    admin.sendMessage(`${utils.prefix} §a${target.name}: force mute ${forceMute ? 'on' : 'off'}, force deafen ${forceDeafen ? 'on' : 'off'}`);
    await openPlayerList(admin);
}
